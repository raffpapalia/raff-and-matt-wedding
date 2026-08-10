'use client';

import { Fragment, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { CatalogOption, OrderRow } from './page';

// Mirrors the comms log (app/admin/comms/log/LogClient.tsx): filters push to the
// URL so a filtered view is linkable and survives a reload, and each row expands
// in place to show its line items rather than navigating away.

type Filters = { status: string; fund: string; item: string };

const STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting payment',
  confirmed: 'Paid',
  manual_pending: 'Awaiting transfer',
  manual_received: 'Transfer received',
  expired: 'Failed',
};

function statusClass(status: string): string {
  if (status === 'confirmed' || status === 'manual_received') return 'bg-admin-green/10 text-admin-green';
  if (status === 'manual_pending' || status === 'pending') return 'bg-admin-warning-bg text-admin-warning';
  return 'bg-admin-persimmon/10 text-admin-persimmon';
}

function money(amount: number): string {
  return amount.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-admin-sand/20 bg-admin-bone/40 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.25em] text-admin-ink/50">{label}</p>
      <p className="mt-1 text-xl font-semibold text-admin-ink">{value}</p>
    </div>
  );
}

export default function OrdersClient({
  rows,
  filters: initialFilters,
  funds,
  items,
  received,
  awaiting,
}: {
  rows: OrderRow[];
  filters: Filters;
  funds: CatalogOption[];
  items: CatalogOption[];
  received: number;
  awaiting: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [marking, setMarking] = useState<string | null>(null);
  const [markError, setMarkError] = useState<string | null>(null);

  function buildUrl(next: Filters) {
    const params = new URLSearchParams();
    if (next.status) params.set('status', next.status);
    if (next.fund) params.set('fund', next.fund);
    if (next.item) params.set('item', next.item);
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ''}`;
  }

  function updateFilter(key: keyof Filters, value: string) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    router.push(buildUrl(next));
  }

  function clearFilters() {
    setFilters({ status: '', fund: '', item: '' });
    router.push(pathname);
  }

  const hasFilters = filters.status || filters.fund || filters.item;

  async function markReceived(id: string) {
    setMarking(id);
    setMarkError(null);
    const res = await fetch(`/admin/api/registry/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_received' }),
    });
    setMarking(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMarkError(data.message || 'Could not mark that order as received.');
      return;
    }
    // Re-fetch from the server rather than patching local state, so the totals
    // strip and any active filter stay consistent with the new status.
    router.refresh();
  }

  return (
    <div className="space-y-6 rounded-[2rem] border border-admin-sand/20 bg-white p-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Orders" value={String(rows.length)} />
        <StatTile label="Received" value={money(received)} />
        <StatTile label="Awaiting transfer" value={money(awaiting)} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-admin-ink/50">Status</p>
          <select
            value={filters.status}
            onChange={e => updateFilter('status', e.target.value)}
            className="rounded-2xl border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink outline-none"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-admin-ink/50">Fund</p>
          <select
            value={filters.fund}
            onChange={e => updateFilter('fund', e.target.value)}
            className="rounded-2xl border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink outline-none"
          >
            <option value="">All funds</option>
            {funds.map(f => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-admin-ink/50">Gift</p>
          <select
            value={filters.item}
            onChange={e => updateFilter('item', e.target.value)}
            className="rounded-2xl border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink outline-none"
          >
            <option value="">All gifts</option>
            {items.map(i => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
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

      {markError && (
        <div className="rounded-2xl bg-admin-persimmon/10 px-4 py-3 text-sm text-admin-persimmon">{markError}</div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.35em] text-admin-ink/50">
              <th className="px-4 py-3">From</th>
              <th className="hidden px-4 py-3 md:table-cell">Submitted by</th>
              <th className="px-4 py-3">Total</th>
              <th className="hidden px-4 py-3 sm:table-cell">Method</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-admin-ink/60">
                  No gift orders yet.
                </td>
              </tr>
            ) : (
              rows.map(row => {
                const isExpanded = expandedId === row.id;
                return (
                  <Fragment key={row.id}>
                    <tr className="border-t border-admin-sand/10 hover:bg-admin-bone/40">
                      <td className="px-4 py-3 font-medium text-admin-ink">
                        {row.beneficiaries.length > 0 ? row.beneficiaries.join(', ') : '—'}
                      </td>
                      <td className="hidden px-4 py-3 text-admin-ink/70 md:table-cell">{row.submittedBy}</td>
                      <td className="px-4 py-3 text-admin-ink">{money(row.total)}</td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <span className="inline-flex rounded-full bg-admin-sand/25 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-admin-ink/80">
                          {row.paymentMethod === 'payid_manual' ? 'PayID' : 'Card'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] ${statusClass(
                            row.status
                          )}`}
                        >
                          {STATUS_LABELS[row.status] ?? row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : row.id)}
                            className="rounded-2xl border border-admin-sand/40 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-admin-ink/80 transition hover:border-admin-green/40 hover:bg-admin-green/10"
                          >
                            {isExpanded ? 'Close' : 'View'}
                          </button>
                          {row.status === 'manual_pending' && (
                            <button
                              type="button"
                              onClick={() => markReceived(row.id)}
                              disabled={marking === row.id}
                              className="rounded-2xl border border-admin-green/30 bg-admin-green/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-admin-green transition hover:bg-admin-green/20 disabled:opacity-50"
                            >
                              {marking === row.id ? '…' : 'Mark received'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-t border-admin-sand/10 bg-admin-bone/40">
                        <td colSpan={6} className="px-6 py-4">
                          <p className="mb-1 text-xs uppercase tracking-[0.25em] text-admin-ink/50">Gifts</p>
                          <ul className="mb-3">
                            {row.lines.map((line, i) => (
                              <li key={i} className="flex justify-between gap-6 py-1 text-sm text-admin-ink/80">
                                <span>{line.label}</span>
                                <span>{money(line.amount)}</span>
                              </li>
                            ))}
                          </ul>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="mb-1 text-xs uppercase tracking-[0.25em] text-admin-ink/50">Ordered</p>
                              <p className="text-sm text-admin-ink/80">
                                {new Date(row.createdAt).toLocaleString('en-AU')}
                              </p>
                            </div>
                            {row.confirmedAt && (
                              <div>
                                <p className="mb-1 text-xs uppercase tracking-[0.25em] text-admin-ink/50">
                                  Confirmed
                                </p>
                                <p className="text-sm text-admin-ink/80">
                                  {new Date(row.confirmedAt).toLocaleString('en-AU')}
                                </p>
                              </div>
                            )}
                            {row.referenceCode && (
                              <div>
                                <p className="mb-1 text-xs uppercase tracking-[0.25em] text-admin-ink/50">
                                  Reference
                                </p>
                                <p className="font-mono text-sm text-admin-ink/80">{row.referenceCode}</p>
                              </div>
                            )}
                          </div>

                          {row.message && (
                            <>
                              <p className="mt-3 mb-1 text-xs uppercase tracking-[0.25em] text-admin-ink/50">
                                Their note
                              </p>
                              <p className="whitespace-pre-wrap text-sm text-admin-ink/80">{row.message}</p>
                            </>
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
    </div>
  );
}
