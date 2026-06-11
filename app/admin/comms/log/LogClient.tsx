'use client';

import { Fragment, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { LogRow } from './page';

type Filters = { channel: string; status: string; from: string; to: string };

function substitutePreviewTags(message: string, householdName: string): string {
  const firstName = householdName.split(/[\s,&]+/)[0] || householdName;
  return message
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{household_name\}\}/g, householdName)
    .replace(/\{\{invite_link\}\}/g, '[invite link]')
    .replace(/\{\{wedding_date\}\}/g, '12 July 2027')
    .replace(/\{\{venue\}\}/g, 'QT Hotel Melbourne');
}

export default function LogClient({
  rows,
  page,
  totalPages,
  total,
  filters: initialFilters,
}: {
  rows: LogRow[];
  page: number;
  totalPages: number;
  total: number;
  filters: Filters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function buildUrl(newFilters: Filters, newPage: number) {
    const params = new URLSearchParams();
    if (newFilters.channel) params.set('channel', newFilters.channel);
    if (newFilters.status) params.set('status', newFilters.status);
    if (newFilters.from) params.set('from', newFilters.from);
    if (newFilters.to) params.set('to', newFilters.to);
    if (newPage > 0) params.set('page', String(newPage));
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ''}`;
  }

  function updateFilter(key: keyof Filters, value: string) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    router.push(buildUrl(next, 0));
  }

  function clearFilters() {
    const clear: Filters = { channel: '', status: '', from: '', to: '' };
    setFilters(clear);
    router.push(pathname);
  }

  const hasFilters = filters.channel || filters.status || filters.from || filters.to;

  return (
    <div className="space-y-6 rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-slate-400">Channel</p>
          <select
            value={filters.channel}
            onChange={(e) => updateFilter('channel', e.target.value)}
            className="rounded-2xl border border-white/10 bg-slate-900/95 px-4 py-2 text-sm text-white outline-none"
          >
            <option value="">All channels</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </select>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-slate-400">Status</p>
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="rounded-2xl border border-white/10 bg-slate-900/95 px-4 py-2 text-sm text-white outline-none"
          >
            <option value="">All statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-slate-400">From</p>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter('from', e.target.value)}
            className="rounded-2xl border border-white/10 bg-slate-900/95 px-4 py-2 text-sm text-white outline-none"
          />
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-slate-400">To</p>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => updateFilter('to', e.target.value)}
            className="rounded-2xl border border-white/10 bg-slate-900/95 px-4 py-2 text-sm text-white outline-none"
          />
        </div>
        {hasFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.35em] text-slate-400">
              <th className="px-4 py-3">Household</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Message preview</th>
              <th className="px-4 py-3">Sent at</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                  No communications found.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isExpanded = expandedId === row.id;
                const resolvedPreview = substitutePreviewTags(row.message, row.householdName);
                return (
                  <Fragment key={row.id}>
                    <tr className="border-t border-white/10 hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-white">{row.householdName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] ${
                            row.channel === 'sms'
                              ? 'bg-violet-400/10 text-violet-300'
                              : 'bg-sky-400/10 text-sky-300'
                          }`}
                        >
                          {row.channel.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] ${
                            row.status === 'sent'
                              ? 'bg-emerald-400/10 text-emerald-300'
                              : row.status === 'failed'
                              ? 'bg-rose-500/10 text-rose-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <p className="truncate text-slate-300">{resolvedPreview}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(row.sentAt).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : row.id)}
                          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-emerald-300/40 hover:bg-emerald-300/10"
                        >
                          {isExpanded ? 'Close' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-t border-white/5 bg-slate-900/40">
                        <td colSpan={6} className="px-6 py-4">
                          <p className="mb-1 text-xs uppercase tracking-[0.25em] text-slate-500">Full message</p>
                          <p className="whitespace-pre-wrap text-sm text-slate-200">{resolvedPreview}</p>
                          {/\{\{[^}]+\}\}/.test(resolvedPreview) && (
                            <p className="mt-2 text-xs text-amber-400">⚠ Some merge tags could not be resolved in this preview.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm text-slate-300">
          <p>
            Showing <span className="font-semibold text-white">{rows.length}</span> of{' '}
            <span className="font-semibold text-white">{total}</span> records
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => router.push(buildUrl(filters, page - 1))}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-slate-400">
              Page {page + 1} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => router.push(buildUrl(filters, page + 1))}
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
