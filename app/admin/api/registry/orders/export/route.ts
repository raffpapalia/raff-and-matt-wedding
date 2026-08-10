import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSession(authCookie);
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function row(...cells: string[]): string {
  return cells.map(escapeCSV).join(',');
}

// One line per order, with beneficiaries and gifts flattened into single cells.
// Beneficiaries are included because they're the whole point of the export:
// the thank-you note goes to whoever the gift is *from*, which is often not the
// household that submitted and paid for it.
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const [ordersRes, lineRes, beneficiaryRes, householdsRes, fundsRes, itemsRes] = await Promise.all([
    supabaseServer.from('registry_orders').select('*').order('created_at', { ascending: false }),
    supabaseServer.from('registry_order_items').select('order_id, fund_id, item_id, amount'),
    supabaseServer.from('registry_order_beneficiaries').select('order_id, household_id, guest_name_freetext'),
    supabaseServer.from('households').select('id, name'),
    supabaseServer.from('registry_funds').select('id, name'),
    supabaseServer.from('registry_items').select('id, name'),
  ]);

  const householdMap = new Map((householdsRes.data ?? []).map(h => [h.id, h.name]));
  const fundMap = new Map((fundsRes.data ?? []).map(f => [f.id, f.name]));
  const itemMap = new Map((itemsRes.data ?? []).map(i => [i.id, i.name]));

  const linesByOrder = new Map<string, string[]>();
  for (const line of lineRes.data ?? []) {
    // A deleted fund/item leaves its id null but keeps the amount, so the row
    // still balances against the order total.
    const label = line.fund_id
      ? fundMap.get(line.fund_id) ?? 'Deleted fund'
      : line.item_id
      ? itemMap.get(line.item_id) ?? 'Deleted item'
      : 'Unknown';
    const list = linesByOrder.get(line.order_id) ?? [];
    list.push(`${label} ($${Number(line.amount).toFixed(2)})`);
    linesByOrder.set(line.order_id, list);
  }

  const beneficiariesByOrder = new Map<string, string[]>();
  for (const b of beneficiaryRes.data ?? []) {
    const name = b.household_id ? householdMap.get(b.household_id) ?? 'Deleted household' : b.guest_name_freetext ?? '';
    if (!name) continue;
    const list = beneficiariesByOrder.get(b.order_id) ?? [];
    list.push(name);
    beneficiariesByOrder.set(b.order_id, list);
  }

  const lines: string[] = [
    row(
      'Date',
      'Submitted by',
      'From (beneficiaries)',
      'Gifts',
      'Total (AUD)',
      'Payment method',
      'Status',
      'Reference',
      'Message',
      'Confirmed at'
    ),
  ];

  for (const order of ordersRes.data ?? []) {
    lines.push(
      row(
        new Date(order.created_at).toLocaleString('en-AU'),
        order.submitting_household_id ? householdMap.get(order.submitting_household_id) ?? 'Deleted household' : '',
        (beneficiariesByOrder.get(order.id) ?? []).join(', '),
        (linesByOrder.get(order.id) ?? []).join(', '),
        Number(order.total_amount).toFixed(2),
        order.payment_method === 'payid_manual' ? 'Bank transfer (PayID)' : 'Card (Stripe)',
        order.status,
        order.reference_code ?? '',
        order.message ?? '',
        order.confirmed_at ? new Date(order.confirmed_at).toLocaleString('en-AU') : ''
      )
    );
  }

  const csv = '﻿' + lines.join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="registry-orders.csv"',
    },
  });
}
