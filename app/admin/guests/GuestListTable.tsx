'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type GuestRow = {
  id: string;
  name: string;
  slug: string;
  tags: string[];
  invited: number;
  attending: number;
  declined: number;
  pending: number;
  commsEmail: number;
  commsSms: number;
};

const PAGE_SIZE = 20;
const tabKeys = ['all', 'confirmed', 'pending', 'declined'] as const;
const tabLabels: Record<typeof tabKeys[number], string> = {
  all: 'All',
  confirmed: 'Confirmed',
  pending: 'Pending',
  declined: 'Declined',
};

function statusBadge(label: string, value: number, colorClass: string) {
  if (value <= 0) return null;
  return (
    <span className={`${colorClass} inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em]`}>
      {label}: {value}
    </span>
  );
}

function CopySlugChip({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const siteUrl = (typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin)) || (process.env.NEXT_PUBLIC_SITE_URL ?? '');
  const full = siteUrl.replace(/\/$/, '') + `/invite/${slug}`;

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(full);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
      className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-left text-[11px] font-medium text-slate-200 transition hover:border-emerald-300/40 hover:bg-emerald-300/10"
    >
      {copied ? 'Copied' : full}
    </button>
  );
}

export default function GuestListTable({ rows }: { rows: GuestRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<typeof tabKeys[number]>('all');
  const [page, setPage] = useState(0);

  const counts = useMemo(
    () => ({
      all: rows.length,
      confirmed: rows.filter((row) => row.attending > 0).length,
      pending: rows.filter((row) => row.attending === 0 && row.pending > 0).length,
      declined: rows.filter((row) => row.attending === 0 && row.pending === 0 && row.declined > 0).length,
    }),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery = row.name.toLowerCase().includes(normalizedQuery);
      if (!matchesQuery) return false;

      if (activeTab === 'confirmed') {
        return row.attending > 0;
      }
      if (activeTab === 'pending') {
        return row.attending === 0 && row.pending > 0;
      }
      if (activeTab === 'declined') {
        return row.attending === 0 && row.pending === 0 && row.declined > 0;
      }

      return true;
    });
  }, [rows, query, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="space-y-6 rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-200/70">Guest manager</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Household roster</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">Search and filter households by RSVP status, then copy invite links quickly.</p>
        </div>
        <div className="max-w-md flex-1">
          <label className="relative block">
            <span className="sr-only">Search households</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder="Search households..."
              className="w-full rounded-3xl border border-white/10 bg-slate-900/95 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {tabKeys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setActiveTab(key);
              setPage(0);
            }}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeTab === key
                ? 'border-emerald-400 bg-emerald-400/10 text-emerald-100'
                : 'border-white/10 bg-white/5 text-slate-200 hover:border-emerald-300/30 hover:bg-white/10'
            }`}
          >
            {tabLabels[key]} ({counts[key]})
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.35em] text-slate-400">
              <th className="px-4 py-3">Household</th>
              <th className="px-4 py-3">Guests</th>
              <th className="px-4 py-3">RSVP summary</th>
              <th className="px-4 py-3">Comms</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3">Invite link</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                  No households match this filter.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row.id} className="border-t border-white/10 hover:bg-white/5">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-white">{row.name}</div>
                  </td>
                  <td className="px-4 py-3 align-top text-slate-300">{row.invited}</td>
                  <td className="px-4 py-3 align-top space-x-2">
                    {statusBadge('Attending', row.attending, 'bg-emerald-400/10 text-emerald-300')}
                    {statusBadge('Pending', row.pending, 'bg-amber-400/10 text-amber-300')}
                    {statusBadge('Declined', row.declined, 'bg-rose-500/10 text-rose-300')}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-1.5">
                      {row.commsEmail > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-sky-400/10 px-2.5 py-1 text-[11px] font-medium text-sky-300">
                          ✉ {row.commsEmail}
                        </span>
                      ) : null}
                      {row.commsSms > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-violet-400/10 px-2.5 py-1 text-[11px] font-medium text-violet-300">
                          SMS {row.commsSms}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      {row.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-200">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <CopySlugChip slug={row.slug} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <EditButton id={row.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm text-slate-300">
          <p>
            Showing <span className="font-semibold text-white">{pageRows.length}</span> of <span className="font-semibold text-white">{filteredRows.length}</span> households.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(current - 1, 0))}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-slate-400">Page {page + 1} of {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((current) => Math.min(current + 1, totalPages - 1))}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EditButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(`/admin/guests/${id}/edit`)}
      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-emerald-300/40 hover:bg-emerald-300/10"
    >
      Edit
    </button>
  );
}
