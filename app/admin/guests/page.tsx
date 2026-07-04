import { requireAdminAuth } from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';
import GuestListTable from '@/app/admin/guests/GuestListTable';

export default async function AdminGuestsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tag?: string }> | { tag?: string };
}) {
  await requireAdminAuth();
  const params = searchParams instanceof Promise ? await searchParams : (searchParams ?? {});

  const [householdsRes, tagsRes, guestsRes] = await Promise.all([
    supabase.from('households').select('id,name,slug,short_code,personal_message,thank_you_message,thank_you_photo_url,link_open_count,link_first_opened_at').order('created_at', { ascending: false }),
    supabase.from('guest_tags').select('household_id,tag'),
    supabase.from('guests').select('household_id,first_name,last_name,rsvp_status,comms_email,comms_sms'),
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
    const commsEmail = householdGuests.filter((item: any) => item.comms_email !== false).length;
    const commsSms = householdGuests.filter((item: any) => item.comms_sms !== false).length;
    const guestNames = householdGuests
      .map((item: any) => [item.first_name, item.last_name].filter(Boolean).join(' '))
      .filter(Boolean);

    return {
      id: household.id,
      name: household.name,
      slug: household.slug,
      shortCode: (household as any).short_code ?? '',
      tags: [...new Set(householdTags)],
      guestNames,
      invited,
      attending,
      declined,
      pending,
      commsEmail,
      commsSms,
      linkOpenCount: (household as any).link_open_count ?? 0,
      linkFirstOpenedAt: (household as any).link_first_opened_at ?? null,
      thankYouPhotoUrl: (household as any).thank_you_photo_url ?? null,
      thankYouMessage: (household as any).thank_you_message ?? null,
    };
  });

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Guest list</p>
            <h1 className="mt-2 text-3xl font-semibold text-admin-ink">All households and RSVP summaries</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a href="/admin/api/guests/export" className="rounded-full border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green">
              Export CSV
            </a>
            <a href="/admin" className="rounded-full border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green">
              ← Dashboard
            </a>
            <a href="/admin/guests/new" className="rounded-full bg-admin-green px-5 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90">
              Add household
            </a>
          </div>
        </div>
      </div>
      <GuestListTable rows={rows} initialQuery={params.tag} />
      <div className="rounded-3xl border border-admin-sand/20 bg-white p-8 text-admin-ink/70">
        <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Tip</p>
        <p className="mt-3 text-sm leading-7">Use the link buttons to copy invite URLs directly, then paste them into your communications or SMS messages.</p>
      </div>
    </div>
  );
}
