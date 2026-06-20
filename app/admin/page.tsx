import { supabase, getSettings } from '@/lib/supabase';
import { isAdminAuthenticated } from '@/lib/adminAuth';

const phaseLabels: Record<string, string> = {
  save_the_date: 'Save the Date',
  invitation: 'Invitation',
  pre_wedding: 'Pre-wedding',
  thank_you: 'Thank You',
};

function AdminNav() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 px-6 py-4 shadow-lg shadow-slate-950/30 backdrop-blur-xl">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/80">Admin</p>
        <p className="mt-1 text-2xl font-semibold text-white">Wedding dashboard</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <a href="/admin" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
          Dashboard
        </a>
        <a href="/admin/guests" className="rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm text-amber-100 transition hover:border-amber-300 hover:bg-amber-300/20">
          Guests
        </a>
        <a href="/admin/comms" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
          Comms
        </a>
        <a href="/admin/responses" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
          Responses
        </a>
        <a href="/admin/setup" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
          Setup
        </a>
        <form action="/admin/logout" method="post">
          <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10" type="submit">
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
      <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">{label}</p>
      <p className="mt-4 text-4xl font-semibold text-white">{value}</p>
      {detail ? <p className="mt-2 text-sm text-slate-300">{detail}</p> : null}
    </div>
  );
}

function StatusPill({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm">
      <p className={`text-xs uppercase tracking-[0.2em] ${colorClass} opacity-80`}>{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusBar({ attending, declined, pending }: { attending: number; declined: number; pending: number }) {
  const total = attending + declined + pending || 1;
  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
      <div className="flex items-center justify-between text-sm text-slate-300">
        <p>RSVP progress</p>
        <p>{total} guest{total === 1 ? '' : 's'}</p>
      </div>
      <div className="flex h-4 overflow-hidden rounded-full bg-slate-900">
        <div className="h-full bg-emerald-400 transition-all" style={{ width: `${(attending / total) * 100}%` }} />
        <div className="h-full bg-amber-400 transition-all" style={{ width: `${(declined / total) * 100}%` }} />
        <div className="h-full bg-slate-500 transition-all" style={{ width: `${(pending / total) * 100}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatusPill label="Attending" value={attending} colorClass="text-emerald-300" />
        <StatusPill label="Declined" value={declined} colorClass="text-amber-300" />
        <StatusPill label="Pending" value={pending} colorClass="text-slate-300" />
      </div>
    </div>
  );
}

function PhaseForm({ currentPhase }: { currentPhase: string }) {
  return (
    <form action="/admin/phase" method="post" className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">Current active phase</p>
          <p className="mt-2 text-2xl font-semibold text-white">{phaseLabels[currentPhase] || 'Save the Date'}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="min-w-[200px] rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">
            <span className="block text-xs uppercase tracking-[0.25em] text-slate-400">Choose phase</span>
            <select name="phase" defaultValue={currentPhase} className="mt-2 w-full bg-transparent text-white outline-none">
              {Object.entries(phaseLabels).map(([value, label]) => (
                <option key={value} value={value} className="bg-slate-900 text-white">{label}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200">
            Update phase
          </button>
        </div>
      </div>
    </form>
  );
}

function DashboardHeader({ daysUntil, totalHouseholds }: { daysUntil: number; totalHouseholds: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-950/40 to-slate-950/70 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <p className="text-sm uppercase tracking-[0.35em] text-emerald-200/70">Welcome back</p>
      <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">Manage the invitation experience</h1>
      <p className="mt-4 max-w-2xl text-slate-300">Review guests, monitor RSVP progress, and keep your wedding phase up to date with one password-protected dashboard.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-white">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Days until wedding</p>
          <p className="mt-2 text-5xl font-semibold text-amber-300">{daysUntil}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-white">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Households invited</p>
          <p className="mt-2 text-5xl font-semibold text-white">{totalHouseholds}</p>
        </div>
      </div>
    </div>
  );
}

function formatDietaryLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function getDashboardData() {
  const [householdsRes, guestsRes, phaseRes, dietaryRes] = await Promise.all([
    supabase.from('households').select('id').order('created_at', { ascending: false }),
    supabase.from('guests').select('rsvp_status'),
    supabase.from('phases').select('current_phase').order('created_at', { ascending: false }).limit(1),
    supabase.from('guests').select('dietary_requirement').eq('rsvp_status', 'attending').neq('dietary_requirement', 'none'),
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

  return { totalHouseholds, ...counts, activePhase, dietaryBreakdown };
}

function LoginForm({ error }: { error?: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-[2rem] border border-white/10 bg-slate-950/90 p-10 shadow-2xl shadow-slate-950/40">
      <p className="text-sm uppercase tracking-[0.35em] text-emerald-300/80">Admin login</p>
      <h1 className="mt-4 text-3xl font-semibold text-white">Enter your password</h1>
      <p className="mt-3 text-slate-400">This admin panel is protected by the shared wedding password.</p>
      {error ? <div className="mt-6 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">Invalid password, please try again.</div> : null}
      <form action="/admin/api/login" method="post" className="mt-8 space-y-6">
        <label className="block text-sm font-medium text-slate-300">
          Password
          <input
            name="password"
            type="password"
            required
            className="mt-3 w-full rounded-3xl border border-white/10 bg-slate-900/90 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
          />
        </label>
        <button type="submit" className="w-full rounded-3xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200">
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
      <AdminNav />
      <div className="space-y-8 lg:space-y-10">
        <DashboardHeader daysUntil={daysUntil} totalHouseholds={dashboard.totalHouseholds} />
        <div className="grid gap-6 md:grid-cols-3">
          <SummaryCard label="Households invited" value={`${dashboard.totalHouseholds}`} />
          <SummaryCard label="Confirmed guests" value={`${dashboard.attending}`} detail="Attending" />
          <SummaryCard label="Declined guests" value={`${dashboard.declined}`} detail="Declined" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <StatusBar attending={dashboard.attending} declined={dashboard.declined} pending={dashboard.pending} />
          <PhaseForm currentPhase={dashboard.activePhase} />
        </div>
        {Object.keys(dashboard.dietaryBreakdown).length > 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">Dietary requirements</p>
            <h2 className="mt-1 mb-6 text-xl font-semibold text-white">Confirmed guest dietary needs</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(dashboard.dietaryBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => (
                  <div key={key} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 min-w-[120px]">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/60">{formatDietaryLabel(key)}</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{count}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
