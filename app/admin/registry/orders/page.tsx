import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseServer, type RegistryOrderStatus } from '@/lib/supabase';
import OrdersClient from './OrdersClient';

export const revalidate = 0;

export type OrderLine = { label: string; amount: number; fundId: string | null; itemId: string | null };

export type OrderRow = {
  id: string;
  createdAt: string;
  submittedBy: string;
  beneficiaries: string[];
  lines: OrderLine[];
  total: number;
  paymentMethod: 'stripe' | 'payid_manual';
  status: RegistryOrderStatus;
  referenceCode: string | null;
  message: string | null;
  confirmedAt: string | null;
};

export type CatalogOption = { id: string; name: string };

export default async function RegistryOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; fund?: string; item?: string }>;
}) {
  await requireAdminAuth();

  const resolved = await searchParams;
  const status = resolved?.status ?? '';
  const fund = resolved?.fund ?? '';
  const item = resolved?.item ?? '';

  // The order count here is in the low hundreds at most, so the whole log is
  // loaded and filtered in process — that keeps the fund/item filters (which
  // are predicates on a child table) simple, and avoids paginating a list the
  // couple will mostly want to read end to end.
  const [ordersRes, lineRes, beneficiaryRes, householdsRes, fundsRes, itemsRes] = await Promise.all([
    supabaseServer.from('registry_orders').select('*').order('created_at', { ascending: false }),
    supabaseServer.from('registry_order_items').select('order_id, fund_id, item_id, amount'),
    supabaseServer.from('registry_order_beneficiaries').select('order_id, household_id, guest_name_freetext'),
    supabaseServer.from('households').select('id, name'),
    supabaseServer.from('registry_funds').select('id, name').order('sort_order', { ascending: true }),
    supabaseServer.from('registry_items').select('id, name').order('sort_order', { ascending: true }),
  ]);

  const householdMap = new Map((householdsRes.data ?? []).map(h => [h.id, h.name]));
  const fundMap = new Map((fundsRes.data ?? []).map(f => [f.id, f.name]));
  const itemMap = new Map((itemsRes.data ?? []).map(i => [i.id, i.name]));

  const linesByOrder = new Map<string, OrderLine[]>();
  for (const line of lineRes.data ?? []) {
    const label = line.fund_id
      ? fundMap.get(line.fund_id) ?? 'Deleted fund'
      : line.item_id
      ? itemMap.get(line.item_id) ?? 'Deleted item'
      : 'Unknown';
    const list = linesByOrder.get(line.order_id) ?? [];
    list.push({ label, amount: Number(line.amount), fundId: line.fund_id, itemId: line.item_id });
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

  let rows: OrderRow[] = (ordersRes.data ?? []).map(order => ({
    id: order.id,
    createdAt: order.created_at,
    submittedBy: order.submitting_household_id
      ? householdMap.get(order.submitting_household_id) ?? 'Deleted household'
      : '—',
    beneficiaries: beneficiariesByOrder.get(order.id) ?? [],
    lines: linesByOrder.get(order.id) ?? [],
    total: Number(order.total_amount),
    paymentMethod: order.payment_method,
    status: order.status,
    referenceCode: order.reference_code,
    message: order.message,
    confirmedAt: order.confirmed_at,
  }));

  if (status) rows = rows.filter(r => r.status === status);
  if (fund) rows = rows.filter(r => r.lines.some(l => l.fundId === fund));
  if (item) rows = rows.filter(r => r.lines.some(l => l.itemId === item));

  // Totals reflect the current filter, and count only money actually received.
  const received = rows
    .filter(r => r.status === 'confirmed' || r.status === 'manual_received')
    .reduce((sum, r) => sum + r.total, 0);
  const awaiting = rows.filter(r => r.status === 'manual_pending').reduce((sum, r) => sum + r.total, 0);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Registry</p>
            <h1 className="mt-2 text-3xl font-semibold text-admin-ink">Gift orders</h1>
            <p className="mt-2 text-sm text-admin-ink/60">
              Every gift, who it&apos;s from, and whether the money has landed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/admin/api/registry/orders/export"
              className="rounded-full border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green"
            >
              Export CSV
            </a>
            <a
              href="/admin/registry"
              className="rounded-full border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green"
            >
              ← Gifts &amp; funds
            </a>
          </div>
        </div>
      </div>

      <OrdersClient
        rows={rows}
        filters={{ status, fund, item }}
        funds={(fundsRes.data ?? []) as CatalogOption[]}
        items={(itemsRes.data ?? []) as CatalogOption[]}
        received={received}
        awaiting={awaiting}
      />
    </div>
  );
}
