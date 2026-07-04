'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type GuestRow = {
  id: string;
  name: string;
  slug: string;
  shortCode: string;
  tags: string[];
  guestNames: string[];
  invited: number;
  attending: number;
  declined: number;
  pending: number;
};

const PAGE_SIZE = 20;
const SITE_URL = 'https://www.mattandraff.com';

const tabKeys = ['all', 'confirmed', 'pending', 'declined'] as const;
const tabLabels: Record<typeof tabKeys[number], string> = {
  all: 'All',
  confirmed: 'Confirmed',
  pending: 'Pending',
  declined: 'Declined',
};

type SortKey = 'household' | 'guests' | 'rsvp';
type SortDir = 'asc' | 'desc';

const defaultSortDir: Record<SortKey, SortDir> = {
  household: 'asc',
  guests: 'desc',
  rsvp: 'desc',
};

const sortHeaderClass = 'inline-flex items-center gap-1 transition hover:text-admin-green';

function SortArrow({ direction }: { direction: SortDir }) {
  return <span className="text-[10px] text-admin-green">{direction === 'asc' ? '▲' : '▼'}</span>;
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function RsvpSummary({ attending, declined, pending }: { attending: number; declined: number; pending: number }) {
  const parts: { text: string; className: string }[] = [];
  if (attending > 0) parts.push({ text: `✓ ${attending} attending`, className: 'text-admin-green' });
  if (declined > 0) parts.push({ text: `${declined} declined`, className: 'text-admin-persimmon' });
  if (pending > 0) parts.push({ text: `${pending} pending`, className: 'text-admin-warning' });

  if (parts.length === 0) {
    return <span className="text-xs text-admin-ink/30">—</span>;
  }

  return (
    <span className="text-xs">
      {parts.map((part, index) => (
        <span key={part.text}>
          <span className={part.className}>{part.text}</span>
          {index < parts.length - 1 ? <span className="mx-1.5 text-admin-ink/25">·</span> : null}
        </span>
      ))}
    </span>
  );
}

function GuestCountCell({ count, names }: { count: number; names: string[] }) {
  if (names.length === 0) {
    return <span className="text-admin-ink/80">{count}</span>;
  }

  return (
    <span className="group relative inline-block cursor-default border-b border-dotted border-admin-ink/25 text-admin-ink/80">
      {count}
      {/* Tooltip stays dark deliberately — popover surface, matches modal treatment. */}
      <span className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-max max-w-[240px] rounded-xl border border-white/10 bg-admin-ink px-3 py-2 text-xs leading-relaxed text-admin-bone/80 opacity-0 shadow-xl shadow-black/40 transition group-hover:opacity-100">
        {names.join(', ')}
      </span>
    </span>
  );
}

function CopyLinkButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
      title={title}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-admin-sand/40 text-admin-ink/60 transition hover:border-admin-green/40 hover:text-admin-green"
    >
      <ClipboardIcon className="h-4 w-4" />
      {copied ? (
        <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-admin-green px-2.5 py-1 text-[11px] font-semibold text-admin-bone">
          Copied!
        </span>
      ) : null}
    </button>
  );
}

function DeleteConfirmModal({
  household,
  onCancel,
  onDeleted,
}: {
  household: GuestRow;
  onCancel: () => void;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/admin/api/guests/${household.id}`, { method: 'DELETE' });
      const json = await response.json().catch(() => ({}));

      if (!response.ok || json?.error) {
        setError(json?.error || 'Failed to delete household.');
        setDeleting(false);
        return;
      }

      onDeleted(household.id);
    } catch {
      setError('Failed to delete household.');
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => !deleting && onCancel()}
    >
      {/* Confirm modal stays dark deliberately, matching the crop-modal treatment. */}
      <div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-admin-ink p-6 shadow-2xl shadow-black/50 sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="font-cinzel text-xl font-semibold text-admin-bone">Delete {household.name}?</h3>
        <p className="mt-3 text-sm leading-relaxed text-admin-bone/70">
          This will permanently delete the household, all guests, and all their RSVP responses. This cannot be undone.
        </p>
        {error ? (
          <div className="mt-4 rounded-2xl bg-admin-persimmon/10 px-4 py-3 text-sm text-admin-persimmon">{error}</div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="rounded-full bg-admin-persimmon px-5 py-3 text-sm font-semibold text-admin-ink transition hover:bg-admin-persimmon/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-full border border-admin-bone/20 px-5 py-3 text-sm text-admin-bone/85 transition hover:border-admin-bone/40 hover:text-admin-bone disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GuestListTable({ rows: initialRows, initialQuery }: { rows: GuestRow[]; initialQuery?: string }) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState(initialQuery ?? '');
  const [activeTab, setActiveTab] = useState<typeof tabKeys[number]>('all');
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('household');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [deleteTarget, setDeleteTarget] = useState<GuestRow | null>(null);
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(defaultSortDir[key]);
    }
    setPage(0);
  };

  const handleDeleted = (id: string) => {
    setDeleteTarget(null);
    setFadingIds((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      setRows((prev) => prev.filter((row) => row.id !== id));
      setFadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  };

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
      const matchesQuery =
        row.name.toLowerCase().includes(normalizedQuery) ||
        row.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));
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

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'household') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'guests') cmp = a.invited - b.invited;
      else cmp = a.attending - b.attending;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredRows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageRows = sortedRows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="space-y-6 rounded-[2rem] border border-admin-sand/20 bg-white p-6 font-dm-sans sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-admin-green">Guest manager</p>
          <h2 className="mt-2 font-cinzel text-2xl font-semibold text-admin-ink">Household roster</h2>
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
              placeholder="Search households or tags…"
              className="w-full rounded-2xl border border-admin-sand/40 bg-white px-4 py-3 text-sm text-admin-ink placeholder-admin-ink/30 outline-none transition focus:border-admin-green"
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
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              activeTab === key
                ? 'border-admin-green bg-admin-green/10 text-admin-green'
                : 'border-admin-sand/30 bg-admin-bone/40 text-admin-ink/70 hover:border-admin-green/40 hover:text-admin-green'
            }`}
          >
            {tabLabels[key]} ({counts[key]})
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="border-b border-admin-sand/20 text-left text-xs uppercase tracking-[0.25em] text-admin-ink/50">
              <th className="px-4 py-3 font-cinzel font-semibold">
                <button type="button" onClick={() => handleSort('household')} className={sortHeaderClass}>
                  Household
                  {sortKey === 'household' ? <SortArrow direction={sortDir} /> : null}
                </button>
              </th>
              <th className="px-4 py-3 font-cinzel font-semibold">
                <button type="button" onClick={() => handleSort('guests')} className={sortHeaderClass}>
                  Guests
                  {sortKey === 'guests' ? <SortArrow direction={sortDir} /> : null}
                </button>
              </th>
              <th className="hidden px-4 py-3 font-cinzel font-semibold sm:table-cell">
                <button type="button" onClick={() => handleSort('rsvp')} className={sortHeaderClass}>
                  RSVP
                  {sortKey === 'rsvp' ? <SortArrow direction={sortDir} /> : null}
                </button>
              </th>
              <th className="px-4 py-3 font-cinzel font-semibold">Invite link</th>
              <th className="px-4 py-3 font-cinzel font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-admin-ink/50">
                  No households match your search or filters.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-t border-admin-sand/10 transition-opacity duration-300 hover:bg-admin-bone/40 ${
                    fadingIds.has(row.id) ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  <td className="px-4 py-4 align-top">
                    <Link href={`/admin/guests/${row.id}/edit`} className="font-medium text-admin-ink transition hover:text-admin-green">
                      {row.name}
                    </Link>
                    <p className="mt-1 text-xs text-admin-ink/40">invite/{row.slug}</p>
                    {row.shortCode ? <p className="text-xs text-admin-ink/40">i/{row.shortCode}</p> : null}
                    {row.tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {row.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setQuery(tag);
                              setPage(0);
                            }}
                            className="rounded-full border border-admin-sand/40 bg-admin-bone/40 px-2.5 py-0.5 text-[11px] text-admin-ink/60 transition hover:border-admin-green/40 hover:text-admin-green"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-2 sm:hidden">
                      <RsvpSummary attending={row.attending} declined={row.declined} pending={row.pending} />
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <GuestCountCell count={row.invited} names={row.guestNames} />
                  </td>
                  <td className="hidden px-4 py-4 align-top sm:table-cell">
                    <RsvpSummary attending={row.attending} declined={row.declined} pending={row.pending} />
                  </td>
                  <td className="px-4 py-4 align-top">
                    <CopyLinkButton url={`${SITE_URL}/invite/${row.slug}`} title="Copy invite link" />
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
                        title="Delete household"
                        className="text-admin-persimmon/40 transition hover:text-admin-persimmon"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/admin/guests/${row.id}/edit`}
                        className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-[0.2em] text-admin-ink/60 transition hover:text-admin-green"
                      >
                        <span className="hidden sm:inline">Details →</span>
                        <ChevronRightIcon className="h-4 w-4 sm:hidden" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-admin-sand/20 pt-4 text-sm text-admin-ink/70">
          <p>
            Showing <span className="font-semibold text-admin-ink">{pageRows.length}</span> of{' '}
            <span className="font-semibold text-admin-ink">{sortedRows.length}</span> households.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(current - 1, 0))}
              className="rounded-2xl border border-admin-sand/40 px-4 py-2 text-sm text-admin-ink/85 transition hover:border-admin-green/40 hover:text-admin-green disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-admin-ink/50">Page {page + 1} of {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((current) => Math.min(current + 1, totalPages - 1))}
              className="rounded-2xl border border-admin-sand/40 px-4 py-2 text-sm text-admin-ink/85 transition hover:border-admin-green/40 hover:text-admin-green disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <DeleteConfirmModal
          household={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      ) : null}
    </div>
  );
}
