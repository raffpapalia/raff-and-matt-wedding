import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer, type BudgetItem, type BudgetLineItem, type BudgetPayment } from '@/lib/supabase';
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

function money(value: number | null): string {
  return value === null ? '' : value.toFixed(2);
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const [itemsRes, linesRes, paymentsRes, attendingRes] = await Promise.all([
    supabaseServer.from('budget_items').select('*').order('category').order('supplier_name'),
    supabaseServer.from('budget_line_items').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
    supabaseServer.from('budget_payments').select('*').order('due_date', { ascending: true, nullsFirst: false }),
    supabaseServer.from('guests').select('id', { count: 'exact', head: true }).eq('rsvp_status', 'attending'),
  ]);

  const items = (itemsRes.data ?? []) as BudgetItem[];
  const allLines = (linesRes.data ?? []) as BudgetLineItem[];
  const payments = (paymentsRes.data ?? []) as BudgetPayment[];
  const attending = attendingRes.count ?? 0;

  const paymentsByItem = new Map<string, BudgetPayment[]>();
  for (const p of payments) {
    const list = paymentsByItem.get(p.item_id) ?? [];
    list.push(p);
    paymentsByItem.set(p.item_id, list);
  }

  const linesByItem = new Map<string, BudgetLineItem[]>();
  for (const l of allLines) {
    const list = linesByItem.get(l.item_id) ?? [];
    list.push(l);
    linesByItem.set(l.item_id, list);
  }

  const lines: string[] = [
    row(
      'Supplier', 'Category', 'Pricing', 'Estimated', 'Agreed / Planned', 'Actual (RSVP-based)',
      'Paid', 'Remaining', 'Payment', 'Payment Amount', 'Due Date', 'Paid Date'
    ),
  ];

  for (const item of items) {
    const itemLines = linesByItem.get(item.id) ?? [];
    const hasLines = itemLines.length > 0;
    const perHead = item.pricing_mode === 'per_head';

    // Planned/actual mirror the app: sum of lines when present, else item-level
    // pricing, both floored at the minimum spend.
    const basePlanned = hasLines
      ? itemLines.reduce((s, l) => s + l.unit_price * (l.quantity ?? 0), 0)
      : perHead
        ? (item.per_head_price ?? 0) * (item.expected_heads ?? 0)
        : item.agreed_cost ?? item.estimated_cost ?? 0;
    const baseActual = hasLines
      ? itemLines.reduce((s, l) => s + l.unit_price * (l.quantity_mode === 'per_head' ? attending : (l.quantity ?? 0)), 0)
      : perHead
        ? (item.per_head_price ?? 0) * attending
        : basePlanned;
    const planned = Math.max(basePlanned, item.minimum_spend ?? 0);
    const actual = Math.max(baseActual, item.minimum_spend ?? 0);

    const itemPayments = paymentsByItem.get(item.id) ?? [];
    const paid = itemPayments.reduce((sum, p) => sum + (p.paid_date ? p.amount : 0), 0);

    const minNote = item.minimum_spend != null ? `; min spend $${money(item.minimum_spend)}` : '';
    const pricingLabel = hasLines
      ? `${itemLines.length} line items${minNote}`
      : perHead
        ? `$${money(item.per_head_price)} per head x ${item.expected_heads ?? 0} expected (${attending} confirmed)${minNote}`
        : `Fixed${minNote}`;

    const base = [
      item.supplier_name,
      item.category,
      pricingLabel,
      money(item.estimated_cost),
      money(planned),
      perHead || actual !== planned ? money(actual) : '',
      money(paid),
      money(Math.max(actual - paid, 0)),
    ];

    if (itemPayments.length === 0) {
      lines.push(row(...base, '', '', '', ''));
    } else {
      itemPayments.forEach((p, i) => {
        const prefix = i === 0 ? base : base.map(() => '');
        lines.push(row(...prefix, p.label || `Payment ${i + 1}`, money(p.amount), p.due_date ?? '', p.paid_date ?? ''));
      });
    }
  }

  // Line-item breakdown for quotes that were split into components.
  if (allLines.length > 0) {
    const itemName = new Map(items.map(i => [i.id, i.supplier_name]));
    lines.push('');
    lines.push(row('Line Item Breakdown'));
    lines.push(row('Supplier', 'Line', 'Pricing', 'Unit Price', 'Quantity', 'Planned', 'Actual (RSVP-based)'));
    for (const l of allLines) {
      const ph = l.quantity_mode === 'per_head';
      const linePlanned = l.unit_price * (l.quantity ?? 0);
      const lineActual = l.unit_price * (ph ? attending : (l.quantity ?? 0));
      lines.push(
        row(
          itemName.get(l.item_id) ?? '',
          l.label,
          ph ? 'Per head' : 'Fixed qty',
          money(l.unit_price),
          String(l.quantity ?? 0),
          money(linePlanned),
          ph ? money(lineActual) : ''
        )
      );
    }
  }

  const csv = lines.join('\r\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="wedding-budget-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
