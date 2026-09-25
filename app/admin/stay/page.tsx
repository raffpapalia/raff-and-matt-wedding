import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseServer } from '@/lib/supabase';
import { describeNights, type StayInterestRow, type StayStatus } from '@/lib/stay/interest';
import StayInterestTable from './StayInterestTable';

export const revalidate = 0;

export type StayTableRow = {
  id: string;
  household: string;
  status: StayStatus;
  nights: string;
  rooms: number | null;
  updatedAt: string;
};

type NightKey = 'night_before' | 'wedding_night' | 'staying_longer';

const NIGHTS: { key: NightKey; label: string }[] = [
  { key: 'night_before', label: 'Night before' },
  { key: 'wedding_night', label: 'Wedding night' },
  { key: 'staying_longer', label: 'Staying longer' },
];

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-admin-sand/20 bg-admin-bone/40 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.25em] text-admin-ink/50">{label}</p>
      <p className="mt-1 text-xl font-semibold text-admin-ink">{value}</p>
    </div>
  );
}

// QT room block expression of interest (guest page: /invite/[slug]/stay). The
// point of this view is the per-night room totals, which are what the couple
// take to QT to negotiate a group rate: "firm" is households that said yes,
// "maybe" is kept separate so the two can be weighed differently.
export default async function StayInterestPage() {
  await requireAdminAuth();

  const [interestRes, householdsRes] = await Promise.all([
    supabaseServer.from('stay_interest').select('*'),
    supabaseServer.from('households').select('id, name'),
  ]);

  if (interestRes.error) {
    console.error('[admin:stay] interest fetch failed', interestRes.error);
  }

  const interest = (interestRes.data ?? []) as StayInterestRow[];
  const households = householdsRes.data ?? [];
  const householdMap = new Map(households.map(h => [h.id, h.name as string]));

  const counts = { yes: 0, maybe: 0, no: 0 };
  for (const r of interest) counts[r.status] += 1;
  const notAnswered = Math.max(0, households.length - interest.length);

  const perNight = NIGHTS.map(({ key, label }) => {
    let firm = 0;
    let maybe = 0;
    for (const r of interest) {
      if (!r[key] || !r.rooms) continue;
      if (r.status === 'yes') firm += r.rooms;
      else if (r.status === 'maybe') maybe += r.rooms;
    }
    return { key, label, firm, maybe, total: firm + maybe };
  });

  const rows: StayTableRow[] = interest.map(r => ({
    id: r.id,
    household: householdMap.get(r.household_id) ?? 'Deleted household',
    status: r.status,
    nights: describeNights(r),
    rooms: r.rooms,
    updatedAt: r.updated_at,
  }));

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Room block</p>
            <h1 className="mt-2 text-3xl font-semibold text-admin-ink">Room interest</h1>
            <p className="mt-2 text-sm text-admin-ink/60">
              Who&apos;s likely to stay at the venue, and how many rooms per night. Not bookings.
            </p>
          </div>
          <a
            href="/admin/api/stay/export"
            className="rounded-full border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green"
          >
            Export CSV
          </a>
        </div>
      </div>

      <div className="space-y-6 rounded-[2rem] border border-admin-sand/20 bg-white p-6">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-admin-ink/50">Households</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Yes" value={String(counts.yes)} />
            <StatTile label="Maybe" value={String(counts.maybe)} />
            <StatTile label="No" value={String(counts.no)} />
            <StatTile label="Not answered" value={String(notAnswered)} />
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-admin-ink/50">Rooms per night</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {perNight.map(n => (
              <div key={n.key} className="rounded-2xl border border-admin-sand/20 bg-admin-bone/40 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.25em] text-admin-ink/50">{n.label}</p>
                <p className="mt-1 text-xl font-semibold text-admin-ink">
                  {n.total} room{n.total === 1 ? '' : 's'}
                </p>
                <p className="mt-1 text-sm text-admin-ink/60">
                  <span className="text-admin-green">{n.firm} firm</span> · {n.maybe} maybe
                </p>
              </div>
            ))}
          </div>
        </div>

        <StayInterestTable rows={rows} />
      </div>
    </div>
  );
}
