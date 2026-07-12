// Route-level loading skeleton for every /admin page. The shell (sidebar /
// top bar / bottom tabs) lives in the layout and stays interactive; this swaps
// in instantly for the content area while the next page renders on the server,
// so taps always produce visible feedback.
export default function AdminLoading() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-6">
      {/* Header card */}
      <div className="animate-pulse rounded-3xl border border-admin-sand/20 bg-white p-6 sm:p-8">
        <div className="h-3 w-28 rounded-full bg-admin-ink/10" />
        <div className="mt-4 h-8 w-52 max-w-full rounded-full bg-admin-ink/10" />
        <div className="mt-3 h-3 w-80 max-w-full rounded-full bg-admin-ink/5" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3 lg:gap-6">
        {[0, 1, 2].map(i => (
          <div key={i} className="animate-pulse rounded-3xl border border-admin-sand/20 bg-white p-6">
            <div className="h-3 w-24 rounded-full bg-admin-ink/10" />
            <div className="mt-4 h-9 w-16 rounded-xl bg-admin-ink/10" />
          </div>
        ))}
      </div>

      {/* Content cards */}
      <div className="animate-pulse rounded-3xl border border-admin-sand/20 bg-white p-6 sm:p-8">
        <div className="h-3 w-32 rounded-full bg-admin-ink/10" />
        <div className="mt-6 space-y-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-24 shrink-0 rounded-full bg-admin-ink/10" />
              <div className="h-4 flex-1 rounded-full bg-admin-ink/5" />
              <div className="hidden h-4 w-32 shrink-0 rounded-full bg-admin-ink/5 sm:block" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-40 animate-pulse rounded-3xl border border-admin-sand/20 bg-white" />

      <span className="sr-only">Loading…</span>
    </div>
  );
}
