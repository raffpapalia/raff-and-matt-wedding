import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer, type BudgetItem, type BudgetPayment } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return authCookie === 'true';
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

  const [itemsRes, paymentsRes, attendingRes] = await Promise.all([
    supabaseServer.from('budget_items').select('*').order('category').order('supplier_name'),
    supabaseServer.from('budget_payments').select('*').order('due_date', { ascending: true, nullsFirst: false }),
    supabaseServer.from('guests').select('id', { count: 'exact', head: true }).eq('rsvp_status', 'attending'),
  ]);

  const items = (itemsRes.data ?? []) as BudgetItem[];
  const payments = (paymentsRes.data ?? []) as BudgetPayment[];
  const attending = attendingRes.count ?? 0;

  const paymentsByItem = new Map<string, BudgetPayment[]>();
  for (const p of payments) {
    const list = paymentsByItem.get(p.item_id) ?? [];
    list.push(p);
    paymentsByItem.set(p.item_id, list);
  }

  const lines: string[] = [
    row(
      'Supplier', 'Category', 'Pricing', 'Estimated', 'Agreed / Planned', 'Actual (RSVP-based)',
      'Paid', 'Remaining', 'Payment', 'Payment Amount', 'Due Date', 'Paid Date'
    ),
  ];

  for (const item of items) {
    const perHead = item.pricing_mode === 'per_head';
    const planned = perHead
      ? (item.per_head_price ?? 0) * (item.expected_heads ?? 0)
      : item.agreed_cost ?? item.estimated_cost ?? 0;
    const actual = perHead ? (item.per_head_price ?? 0) * attending : planned;
    const itemPayments = paymentsByItem.get(item.id) ?? [];
    const paid = itemPayments.reduce((sum, p) => sum + (p.paid_date ? p.amount : 0), 0);

    const pricingLabel = perHead
      ? `$${money(item.per_head_price)} per head x ${item.expected_heads ?? 0} expected (${attending} confirmed)`
      : 'Fixed';

    const base = [
      item.supplier_name,
      item.category,
      pricingLabel,
      money(item.estimated_cost),
      money(planned),
      perHead ? money(actual) : '',
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

  const csv = lines.join('\r\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="wedding-budget-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
