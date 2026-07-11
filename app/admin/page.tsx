import Link from 'next/link';
import { supabase, getSettings } from '@/lib/supabase';
import { isAdminAuthenticated } from '@/lib/adminAuth';

const phaseLabels: Record<string, string> = {
  save_the_date: 'Save the Date',
  invitation: 'Invitation',
  pre_wedding: 'Pre-wedding',
  thank_you: 'Thank You',
};

function SummaryCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-3xl border border-admin-sand/20 bg-white p-6">
      <p className="text-sm uppercase tracking-[0.3em] text-admin-green">{label}</p>
      <p className="mt-4 text-4xl font-semibold text-admin-ink">{value}</p>
      {detail ? <p className="mt-2 text-sm text-admin-ink/70">{detail}</p> : null}
    </div>
  );
}

function StatusPill({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className="rounded-2xl bg-admin-bone/50 px-4 py-3 text-sm">
      <p className={`text-xs uppercase tracking-[0.2em] ${colorClass} opacity-80`}>{label}</p>
      <p className="mt-2 text-2xl font-semibold text-admin-ink">{value}</p>
    </div>
  );
}

function StatusBar({ attending, declined, pending }: { attending: number; declined: number; pending: number }) {
  const total = attending + declined + pending || 1;
  return (
    <div className="space-y-4 rounded-3xl border border-admin-sand/20 bg-white p-6">
      <div className="flex items-center justify-between text-sm text-admin-ink/70">
        <p>RSVP progress</p>
        <p>{total} guest{total === 1 ? '' : 's'}</p>
      </div>
      <div className="flex h-4 overflow-hidden rounded-full bg-admin-ink/10">
        <div className="h-full bg-admin-green transition-all" style={{ width: `${(attending / total) * 100}%` }} />
        <div className="h-full bg-admin-persimmon transition-all" style={{ width: `${(declined / total) * 100}%` }} />
        <div className="h-full bg-admin-warning transition-all" style={{ width: `${(pending / total) * 100}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatusPill label="Attending" value={attending} colorClass="text-admin-green" />
        <StatusPill label="Declined" value={declined} colorClass="text-admin-persimmon" />
        <StatusPill label="Pending" value={pending} colorClass="text-admin-warning" />
      </div>
    </div>
  );
}

function PhaseForm({ currentPhase }: { currentPhase: string }) {
  return (
    <form action="/admin/phase" method="post" className="rounded-3xl border border-admin-sand/20 bg-white p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Current active phase</p>
          <p className="mt-2 text-2xl font-semibold text-admin-ink">{phaseLabels[currentPhase] || 'Save the Date'}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="w-full rounded-2xl border border-admin-sand/40 bg-white px-4 py-3 text-sm text-admin-ink sm:w-auto sm:min-w-[200px]">
            <span className="block text-xs uppercase tracking-[0.25em] text-admin-ink/50">Choose phase</span>
            <select name="phase" defaultValue={currentPhase} className="mt-2 w-full bg-transparent text-admin-ink outline-none">
              {Object.entries(phaseLabels).map(([value, label]) => (
                <option key={value} value={value} className="bg-white text-admin-ink">{label}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-2xl bg-admin-green px-5 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90">
            Update phase
          </button>
        </div>
      </div>
    </form>
  );
}

function DashboardHeader({ daysUntil, totalHouseholds }: { daysUntil: number; totalHouseholds: number }) {
  return (
    <div className="rounded-3xl border border-admin-sand/20 bg-gradient-to-br from-admin-green/10 to-admin-bone p-8">
      <p className="text-sm uppercase tracking-[0.35em] text-admin-green">Welcome back</p>
      <h1 className="mt-4 text-4xl font-semibold text-admin-ink sm:text-5xl">Manage the invitation experience</h1>
      <p className="mt-4 max-w-2xl text-admin-ink/70">Review guests, monitor RSVP progress, and keep your wedding phase up to date with one password-protected dashboard.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-3xl border border-admin-sand/30 bg-white px-6 py-5 text-admin-ink">
          <p className="text-sm uppercase tracking-[0.3em] text-admin-ink/60">Days until wedding</p>
          <p className="mt-2 text-5xl font-semibold text-admin-green">{daysUntil}</p>
        </div>
        <div className="rounded-3xl border border-admin-sand/30 bg-white px-6 py-5 text-admin-ink">
          <p className="text-sm uppercase tracking-[0.3em] text-admin-ink/60">Households invited</p>
          <p className="mt-2 text-5xl font-semibold text-admin-ink">{totalHouseholds}</p>
        </div>
      </div>
    </div>
  );
}

function formatDietaryLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function getDashboardData() {
  const [householdsRes, guestsRes, phaseRes, dietaryRes, tagsRes] = await Promise.all([
    supabase.from('households').select('id,slug').order('created_at', { ascending: false }),
    supabase.from('guests').select('household_id, rsvp_status'),
    supabase.from('phases').select('current_phase').order('created_at', { ascending: false }).limit(1),
    supabase.from('guests').select('dietary_requirement').eq('rsvp_status', 'attending').neq('dietary_requirement', 'none'),
    supabase.from('guest_tags').select('household_id, tag'),
  ]);

  const totalHouseholds = householdsRes.data?.length ?? 0;
  const guestRecords = guestsRes.data ?? [];
  const activePhase = phaseRes.data?.[0]?.current_phase ?? 'save_the_date';

  const counts = guestRecords.reduce(
    (acc, item) => {
      const status = item.rsvp_status as string;
      if (status === 'attending') acc.attending += 1;
      else if (status === 'declined') acc.declined += 1;
      else acc.pending += 1;
      return acc;
    },
    { attending: 0, declined: 0, pending: 0 }
  );

  const dietaryBreakdown = (dietaryRes.data ?? []).reduce(
    (acc: Record<string, number>, row) => {
      const req = row.dietary_requirement as string;
      if (req) acc[req] = (acc[req] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const guestsByHousehold = new Map<string, { total: number; attending: number; declined: number; pending: number }>();
  for (const guest of guestRecords) {
    const householdId = guest.household_id as string;
    if (!householdId) continue;
    const entry = guestsByHousehold.get(householdId) ?? { total: 0, attending: 0, declined: 0, pending: 0 };
    entry.total += 1;
    const status = guest.rsvp_status as string;
    if (status === 'attending') entry.attending += 1;
    else if (status === 'declined') entry.declined += 1;
    else entry.pending += 1;
    guestsByHousehold.set(householdId, entry);
  }

  const tagHouseholds = new Map<string, Set<string>>();
  for (const row of tagsRes.data ?? []) {
    const tag = row.tag as string;
    const householdId = row.household_id as string;
    if (!tag || !householdId) continue;
    const set = tagHouseholds.get(tag) ?? new Set<string>();
    set.add(householdId);
    tagHouseholds.set(tag, set);
  }

  const tagBreakdown = Array.from(tagHouseholds.entries())
    .map(([tag, householdIds]) => {
      const stats = { tag, households: householdIds.size, guests: 0, attending: 0, declined: 0, pending: 0 };
      for (const householdId of householdIds) {
        const entry = guestsByHousehold.get(householdId);
        if (!entry) continue;
        stats.guests += entry.total;
        stats.attending += entry.attending;
        stats.declined += entry.declined;
        stats.pending += entry.pending;
      }
      return stats;
    })
    .sort((a, b) => b.households - a.households);

  const firstSlug = (householdsRes.data?.[0] as { slug?: string } | undefined)?.slug ?? '';
  return { totalHouseholds, ...counts, activePhase, dietaryBreakdown, tagBreakdown, firstSlug };
}

const PHASE_OPTIONS = [
  { value: 'save_the_date', label: 'Save the Date' },
  { value: 'invitation',    label: 'Invitation'    },
  { value: 'pre_wedding',   label: 'Pre-wedding'   },
  { value: 'thank_you',     label: 'Thank You'     },
] as const;

function PhasePreview({ slug, activePhase }: { slug: string; activePhase: string }) {
  if (!slug) return null;
  return (
    <div className="rounded-3xl border border-admin-sand/20 bg-white p-6">
      <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Preview phases</p>
      <p className="mt-1 text-xs text-admin-ink/50">Opens in a new tab — you must be logged in here first.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {PHASE_OPTIONS.map(({ value, label }) => (
          <a
            key={value}
            href={`/invite/${slug}?preview=${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-full border px-4 py-2 text-sm transition ${
              value === activePhase
                ? 'border-admin-green bg-admin-green/10 font-semibold text-admin-green'
                : 'border-admin-sand/40 bg-admin-bone/40 text-admin-ink/70 hover:border-admin-green/40 hover:text-admin-green'
            }`}
          >
            {label} ↗
          </a>
        ))}
      </div>
    </div>
  );
}

function LoginForm({ error }: { error?: string }) {
  return (
    /* Pre-auth login card deliberately stays dark (on-brand), now on admin-ink tokens. */
    <div className="mx-auto max-w-lg rounded-[2rem] border border-white/10 bg-admin-ink p-10 shadow-2xl shadow-black/40">
      <p className="text-sm uppercase tracking-[0.35em] text-admin-sand">Admin login</p>
      <h1 className="mt-4 text-3xl font-semibold text-admin-bone">Enter your password</h1>
      <p className="mt-3 text-admin-bone/60">This admin panel is protected by the shared wedding password.</p>
      {error ? <div className="mt-6 rounded-2xl bg-admin-persimmon/10 px-4 py-3 text-sm text-admin-persimmon">Invalid password, please try again.</div> : null}
      <form action="/admin/api/login" method="post" className="mt-8 space-y-6">
        <label className="block text-sm font-medium text-admin-bone/80">
          Password
          <input
            name="password"
            type="password"
            required
            className="mt-3 w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-admin-bone outline-none transition focus:border-admin-green"
          />
        </label>
        <button type="submit" className="w-full rounded-3xl bg-admin-green px-5 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90">
          Sign in
        </button>
      </form>
    </div>
  );
}

export default async function AdminPage({ searchParams }: { searchParams?: Promise<{ error?: string }> | { error?: string } }) {
  const params = searchParams instanceof Promise ? await searchParams : (searchParams ?? {});
  if (!(await isAdminAuthenticated())) {
    return <LoginForm error={params?.error} />;
  }

  const [dashboard, settings] = await Promise.all([getDashboardData(), getSettings()]);
  const weddingDate = new Date(settings.wedding_date + 'T00:00:00Z');
  const today = new Date();
  const daysUntil = Math.max(0, Math.ceil((weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="space-y-8">
      <div className="space-y-8 lg:space-y-10">
        <DashboardHeader daysUntil={daysUntil} totalHouseholds={dashboard.totalHouseholds} />
        <div className="grid gap-6 md:grid-cols-3">
          <SummaryCard label="Households invited" value={`${dashboard.totalHouseholds}`} />
          <SummaryCard label="Confirmed guests" value={`${dashboard.attending}`} detail="Attending" />
          <SummaryCard label="Declined guests" value={`${dashboard.declined}`} detail="Declined" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <StatusBar attending={dashboard.attending} declined={dashboard.declined} pending={dashboard.pending} />
          <div className="space-y-4">
            <PhaseForm currentPhase={dashboard.activePhase} />
            <PhasePreview slug={dashboard.firstSlug} activePhase={dashboard.activePhase} />
          </div>
        </div>
        {Object.keys(dashboard.dietaryBreakdown).length > 0 && (
          <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Dietary requirements</p>
            <h2 className="mt-1 mb-6 text-xl font-semibold text-admin-ink">Confirmed guest dietary needs</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(dashboard.dietaryBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => (
                  <div key={key} className="min-w-[100px] flex-1 rounded-2xl border border-admin-sand/30 bg-admin-bone/40 px-5 py-4 sm:flex-none sm:min-w-[120px]">
                    <p className="text-xs uppercase tracking-[0.2em] text-admin-green">{formatDietaryLabel(key)}</p>
                    <p className="mt-2 text-3xl font-semibold text-admin-ink">{count}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
        {dashboard.tagBreakdown.length > 0 && (
          <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Tags</p>
            <h2 className="mt-1 mb-6 text-xl font-semibold text-admin-ink">Guests by tag</h2>
            <div className="flex flex-wrap gap-3">
              {dashboard.tagBreakdown.map((t) => (
                <Link
                  key={t.tag}
                  href={`/admin/guests?tag=${encodeURIComponent(t.tag)}`}
                  className="w-full rounded-2xl border border-admin-sand/30 bg-admin-bone/40 px-5 py-4 transition hover:border-admin-green/40 hover:bg-admin-bone/70 sm:w-auto sm:min-w-[180px]"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-admin-green">{t.tag}</p>
                  <p className="mt-2 text-3xl font-semibold text-admin-ink">{t.households}</p>
                  <p className="text-xs text-admin-ink/60">
                    household{t.households === 1 ? '' : 's'} · {t.guests} guest{t.guests === 1 ? '' : 's'}
                  </p>
                  <p className="mt-2 text-xs text-admin-ink/70">
                    {t.attending} attending · {t.declined} declined · {t.pending} pending
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
