import { requireAdminAuth } from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';
import GuestListTable from '@/app/admin/guests/GuestListTable';

export default async function AdminGuestsPage() {
  await requireAdminAuth();

  const [householdsRes, tagsRes, guestsRes] = await Promise.all([
    supabase.from('households').select('id,name,slug,personal_message').order('created_at', { ascending: false }),
    supabase.from('guest_tags').select('household_id,tag'),
    supabase.from('guests').select('household_id,rsvp_status'),
  ]);

  const households = householdsRes.data ?? [];
  const tags = tagsRes.data ?? [];
  const guests = guestsRes.data ?? [];

  const rows = households.map((household) => {
    const householdTags = tags.filter((item) => item.household_id === household.id).map((item) => item.tag);
    const householdGuests = guests.filter((item) => item.household_id === household.id);
    const invited = householdGuests.length;
    const attending = householdGuests.filter((item) => item.rsvp_status === 'attending').length;
    const declined = householdGuests.filter((item) => item.rsvp_status === 'declined').length;
    const pending = householdGuests.filter((item) => item.rsvp_status !== 'attending' && item.rsvp_status !== 'declined').length;

    return {
      id: household.id,
      name: household.name,
      slug: household.slug,
      tags: [...new Set(householdTags)],
      invited,
      attending,
      declined,
      pending,
    };
  });

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">Guest list</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">All households and RSVP summaries</h1>
          </div>
          <div className="flex items-center gap-3">
            <a href="/admin" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
              ← Dashboard
            </a>
            <a href="/admin/guests/new" className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200">
              Add household
            </a>
          </div>
        </div>
      </div>
      <GuestListTable rows={rows} />
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">Tip</p>
        <p className="mt-3 text-sm leading-7">Use the link buttons to copy invite URLs directly, then paste them into your communications or SMS messages.</p>
      </div>
    </div>
  );
}
