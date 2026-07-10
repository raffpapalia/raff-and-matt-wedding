import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSettings } from '@/lib/supabase';
import type { RunsheetItem } from '@/lib/supabase';
import { fetchRunsheetData, usedVendors, type RunsheetVendor } from '@/lib/runsheetData';
import { fmtDay, fmtDuration, fmtTimeRange, gapMinutes, groupByDay, sortItems } from '@/lib/runsheet';

// Vendor-facing read-only run sheet, gated by an unguessable token. Not linked
// from anywhere public and never indexed.
export const metadata: Metadata = {
  title: 'Wedding Run Sheet',
  robots: { index: false, follow: false },
};

export default async function SharedRunsheetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const data = await fetchRunsheetData();
  if (!data.settings?.share_enabled || !data.settings.share_token || data.settings.share_token !== token) {
    notFound();
  }

  const settings = await getSettings();
  const days = groupByDay(data.sections);
  const contacts = usedVendors(data);
  const vendorById = new Map(data.vendors.map(v => [v.id, v]));

  const itemsBySection = new Map<string, RunsheetItem[]>();
  for (const item of data.items) {
    const list = itemsBySection.get(item.section_id) ?? [];
    list.push(item);
    itemsBySection.set(item.section_id, list);
  }

  const versionLabel = data.versionDate
    ? new Date(data.versionDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-admin-bone text-admin-ink admin-light">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* ── Header ── */}
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-admin-green">Wedding run sheet</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{settings.couple_names}</h1>
          <p className="mt-2 text-sm text-admin-ink/60">
            {versionLabel ? `Version ${versionLabel} — this page always shows the latest plan.` : 'This page always shows the latest plan.'}
          </p>
        </header>

        {/* ── Key contacts ── */}
        {contacts.length > 0 && (
          <section className="mt-8 rounded-3xl border border-admin-sand/25 bg-white p-5 sm:p-6">
            <h2 className="text-xs uppercase tracking-[0.3em] text-admin-green">Key contacts</h2>
            <div className="mt-2 divide-y divide-admin-sand/15">
              {contacts.map(v => (
                <div key={v.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{v.supplier_name}</p>
                    <p className="text-xs text-admin-ink/55">
                      {v.category}
                      {v.contact_name && <> · {v.contact_name}</>}
                    </p>
                  </div>
                  {v.contact_phone && (
                    <a href={`tel:${v.contact_phone}`} className="shrink-0 font-medium tabular-nums text-admin-green">
                      {v.contact_phone}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Days ── */}
        {days.map(day => {
          let prevTimed: RunsheetItem | null = null;

          return (
            <section key={day.day ?? 'unscheduled'} className="mt-10">
              <h2 className="text-lg font-semibold">{fmtDay(day.day)}</h2>

              {day.sections.map(section => {
                const sectionItems = sortItems(itemsBySection.get(section.id) ?? []);
                if (sectionItems.length === 0) return null;

                return (
                  <div key={section.id} className="mt-4 overflow-hidden rounded-3xl border border-admin-sand/25 bg-white">
                    <div className="bg-admin-ink px-5 py-3">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-admin-bone">{section.title}</h3>
                    </div>
                    <div className="px-5 py-2 sm:px-6">
                      {sectionItems.map(item => {
                        const gap = item.start_time && prevTimed ? gapMinutes(prevTimed, item) : null;
                        if (item.start_time) prevTimed = item;
                        const itemVendors = item.vendor_ids
                          .map(id => vendorById.get(id))
                          .filter((v): v is RunsheetVendor => !!v);

                        return (
                          <div key={item.id}>
                            {gap !== null && gap > 0 && (
                              <p className="py-1 text-center text-[11px] text-admin-ink/35 sm:pl-28 sm:text-left">
                                · {fmtDuration(gap)} gap
                              </p>
                            )}
                            <div className="flex flex-col gap-1 border-b border-admin-sand/15 py-3 last:border-b-0 sm:flex-row sm:gap-4">
                              <p className="w-32 shrink-0 text-sm font-semibold tabular-nums text-admin-green">
                                {fmtTimeRange(item.start_time, item.end_time) || '—'}
                              </p>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">{item.title}</p>
                                {item.description && <p className="mt-0.5 text-sm text-admin-ink/60">{item.description}</p>}
                                {(item.location || item.owner || itemVendors.length > 0) && (
                                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-admin-ink/55">
                                    {item.location && <span>📍 {item.location}</span>}
                                    {item.owner && <span>👤 {item.owner}</span>}
                                    {itemVendors.map(v => (
                                      <span key={v.id} className="rounded-full bg-admin-ink/5 px-2.5 py-0.5 font-medium text-admin-ink/70">
                                        {v.supplier_name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}

        <footer className="mt-12 border-t border-admin-sand/25 pt-5 text-center text-xs text-admin-ink/45">
          {settings.couple_names} · Please don&apos;t share this link.
        </footer>
      </div>
    </div>
  );
}
