import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseServer } from '@/lib/supabase';
import type { BudgetItem, BudgetLineItem, BudgetPayment } from '@/lib/supabase';
import BudgetClient from './BudgetClient';

export default async function AdminBudgetPage() {
  await requireAdminAuth();

  const [itemsRes, linesRes, paymentsRes, attendingRes, expectedRes] = await Promise.all([
    supabaseServer.from('budget_items').select('*').order('created_at', { ascending: true }),
    supabaseServer.from('budget_line_items').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
    supabaseServer.from('budget_payments').select('*').order('due_date', { ascending: true, nullsFirst: false }),
    supabaseServer.from('guests').select('id', { count: 'exact', head: true }).eq('rsvp_status', 'attending'),
    supabaseServer.from('guests').select('id', { count: 'exact', head: true }).neq('rsvp_status', 'declined'),
  ]);

  const items = (itemsRes.data ?? []) as BudgetItem[];
  const lines = (linesRes.data ?? []) as BudgetLineItem[];
  const payments = (paymentsRes.data ?? []) as BudgetPayment[];
  // Confirmed = RSVP'd attending. Invited-not-declined is the natural default for
  // "expected heads" when adding a per-head supplier.
  const attendingCount = attendingRes.count ?? 0;
  const invitedCount = expectedRes.count ?? 0;

  return (
    <BudgetClient
      initialItems={items}
      initialLines={lines}
      initialPayments={payments}
      attendingCount={attendingCount}
      invitedCount={invitedCount}
    />
  );
}
