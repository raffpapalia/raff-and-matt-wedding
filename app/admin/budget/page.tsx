import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseServer } from '@/lib/supabase';
import type { BudgetItem, BudgetPayment, BudgetSettings } from '@/lib/supabase';
import BudgetClient from './BudgetClient';

export default async function AdminBudgetPage() {
  await requireAdminAuth();

  const [itemsRes, paymentsRes, settingsRes, attendingRes, expectedRes] = await Promise.all([
    supabaseServer.from('budget_items').select('*').order('created_at', { ascending: true }),
    supabaseServer.from('budget_payments').select('*').order('due_date', { ascending: true, nullsFirst: false }),
    supabaseServer.from('budget_settings').select('*').eq('id', 1).maybeSingle(),
    supabaseServer.from('guests').select('id', { count: 'exact', head: true }).eq('rsvp_status', 'attending'),
    supabaseServer.from('guests').select('id', { count: 'exact', head: true }).neq('rsvp_status', 'declined'),
  ]);

  const items = (itemsRes.data ?? []) as BudgetItem[];
  const payments = (paymentsRes.data ?? []) as BudgetPayment[];
  const settings = (settingsRes.data as BudgetSettings | null) ?? null;
  // Confirmed = RSVP'd attending. Invited-not-declined is the natural default for
  // "expected heads" when adding a per-head supplier.
  const attendingCount = attendingRes.count ?? 0;
  const invitedCount = expectedRes.count ?? 0;

  return (
    <BudgetClient
      initialItems={items}
      initialPayments={payments}
      initialTotalBudget={settings?.total_budget ?? 0}
      attendingCount={attendingCount}
      invitedCount={invitedCount}
    />
  );
}
