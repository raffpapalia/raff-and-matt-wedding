'use client';

import { Fragment, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { LogRow } from './page';

type Filters = { channel: string; status: string; from: string; to: string };

function substitutePreviewTags(message: string, householdName: string, weddingDate: string, venueName: string): string {
  const firstName = householdName.split(/[\s,&]+/)[0] || householdName;
  return message
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{household_name\}\}/g, householdName)
    .replace(/\{\{invite_link\}\}/g, '[invite link]')
    .replace(/\{\{wedding_date\}\}/g, weddingDate)
    .replace(/\{\{venue\}\}/g, venueName);
}

export default function LogClient({
  rows,
  page,
  totalPages,
  total,
  filters: initialFilters,
  weddingDate,
  venueName,
}: {
  rows: LogRow[];
  page: number;
  totalPages: number;
  total: number;
  filters: Filters;
  weddingDate: string;
  venueName: string;
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
    <div className="space-y-6 rounded-[2rem] border border-admin-sand/20 bg-white p-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-admin-ink/50">Channel</p>
          <select
            value={filters.channel}
            onChange={(e) => updateFilter('channel', e.target.value)}
            className="rounded-2xl border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink outline-none"
          >
            <option value="">All channels</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </select>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-admin-ink/50">Status</p>
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="rounded-2xl border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink outline-none"
          >
            <option value="">All statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-admin-ink/50">From</p>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter('from', e.target.value)}
            className="rounded-2xl border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink outline-none"
          />
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-admin-ink/50">To</p>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => updateFilter('to', e.target.value)}
            className="rounded-2xl border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink outline-none"
          />
        </div>
        {hasFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-2xl border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/70 transition hover:border-admin-green/40 hover:text-admin-green"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.35em] text-admin-ink/50">
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
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-admin-ink/60">
                  No communications found.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isExpanded = expandedId === row.id;
                const resolvedPreview = substitutePreviewTags(row.message, row.householdName, weddingDate, venueName);
                return (
                  <Fragment key={row.id}>
                    <tr className="border-t border-admin-sand/10 hover:bg-admin-bone/40">
                      <td className="px-4 py-3 font-medium text-admin-ink">{row.householdName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] ${
                            row.channel === 'sms'
                              ? 'bg-admin-violet/25 text-admin-ink/80'
                              : 'bg-admin-sand/25 text-admin-ink/80'
                          }`}
                        >
                          {row.channel.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] ${
                            row.status === 'sent'
                              ? 'bg-admin-green/10 text-admin-green'
                              : row.status === 'failed'
                              ? 'bg-admin-persimmon/10 text-admin-persimmon'
                              : 'bg-admin-ink/5 text-admin-ink/40'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <p className="truncate text-admin-ink/70">{resolvedPreview}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-admin-ink/60">
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
                          className="rounded-2xl border border-admin-sand/40 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-admin-ink/80 transition hover:border-admin-green/40 hover:bg-admin-green/10"
                        >
                          {isExpanded ? 'Close' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-t border-admin-sand/10 bg-admin-bone/40">
                        <td colSpan={6} className="px-6 py-4">
                          <p className="mb-1 text-xs uppercase tracking-[0.25em] text-admin-ink/50">
                            Sent to
                          </p>
                          <p className="mb-3 text-sm text-admin-ink/80">
                            {(row.channel === 'sms' ? row.recipientNumber : row.recipientEmail) ?? (
                              <span className="text-admin-ink/50">Unknown</span>
                            )}
                          </p>
                          <p className="mb-1 text-xs uppercase tracking-[0.25em] text-admin-ink/50">Full message</p>
                          <p className="whitespace-pre-wrap text-sm text-admin-ink/80">{resolvedPreview}</p>
                          {/\{\{[^}]+\}\}/.test(resolvedPreview) && (
                            <p className="mt-2 text-xs text-admin-warning">⚠ Some merge tags could not be resolved in this preview.</p>
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-admin-sand/20 pt-4 text-sm text-admin-ink/70">
          <p>
            Showing <span className="font-semibold text-admin-ink">{rows.length}</span> of{' '}
            <span className="font-semibold text-admin-ink">{total}</span> records
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => router.push(buildUrl(filters, page - 1))}
              className="rounded-2xl border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-admin-ink/60">
              Page {page + 1} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => router.push(buildUrl(filters, page + 1))}
              className="rounded-2xl border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
