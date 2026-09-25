'use client';

import { useMemo, useState } from 'react';
import type { StayTableRow } from './page';

const STATUS_LABELS: Record<NonNullable<StayTableRow['status']>, string> = {
  yes: 'Yes',
  maybe: 'Maybe',
  no: 'No',
};

function statusClass(status: StayTableRow['status']): string {
  if (status === 'yes') return 'bg-admin-green/10 text-admin-green';
  if (status === 'maybe') return 'bg-admin-warning-bg text-admin-warning';
  return 'bg-admin-ink/5 text-admin-ink/60';
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type Filter = 'all' | 'answered' | 'opened_not_answered' | 'not_opened';

const FILTERS: { id: Filter; label: string; match: (r: StayTableRow) => boolean }[] = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'answered', label: 'Answered', match: r => r.status !== null },
  { id: 'opened_not_answered', label: 'Opened, not answered', match: r => r.openCount > 0 && r.status === null },
  { id: 'not_opened', label: 'Not opened', match: r => r.openCount === 0 },
];

type SortKey = 'lastOpenedAt' | 'answeredAt';

export default function StayInterestTable({ rows }: { rows: StayTableRow[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('lastOpenedAt');
  const [newestFirst, setNewestFirst] = useState(true);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setNewestFirst(v => !v);
    else {
      setSortKey(key);
      setNewestFirst(true);
    }
  }

  const visible = useMemo(() => {
    const match = FILTERS.find(f => f.id === filter)!.match;
    // Rows with no date for the sort column always sink to the bottom,
    // whichever direction is chosen, then fall back to household name.
    return rows.filter(match).sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av && bv) {
        const diff = new Date(av).getTime() - new Date(bv).getTime();
        if (diff !== 0) return newestFirst ? -diff : diff;
      } else if (av || bv) {
        return av ? -1 : 1;
      }
      return a.household.localeCompare(b.household);
    });
  }, [rows, filter, sortKey, newestFirst]);

  function renderSortHeader(label: string, column: SortKey, className: string) {
    const active = sortKey === column;
    return (
      <th className={className} aria-sort={active ? (newestFirst ? 'descending' : 'ascending') : 'none'}>
        <button
          type="button"
          onClick={() => toggleSort(column)}
          className={`uppercase tracking-[0.35em] transition hover:text-admin-green ${active ? 'text-admin-ink/80' : ''}`}
        >
          {label} {active ? (newestFirst ? '↓' : '↑') : ''}
        </button>
      </th>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => {
          const count = rows.filter(f.match).length;
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                active
                  ? 'border-admin-green bg-admin-green text-white'
                  : 'border-admin-sand/40 bg-white text-admin-ink/70 hover:border-admin-green/40 hover:text-admin-green'
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.35em] text-admin-ink/50">
              <th className="px-4 py-3">Household</th>
              {renderSortHeader('Opened', 'lastOpenedAt', 'px-4 py-3')}
              <th className="px-4 py-3">Status</th>
              <th className="hidden px-4 py-3 sm:table-cell">Nights</th>
              <th className="px-4 py-3">Rooms</th>
              {renderSortHeader('Answered', 'answeredAt', 'hidden px-4 py-3 md:table-cell')}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-admin-ink/60">
                  No households here.
                </td>
              </tr>
            ) : (
              visible.map(row => (
                <tr key={row.id} className="border-t border-admin-sand/10 hover:bg-admin-bone/40">
                  <td className="px-4 py-3 font-medium text-admin-ink">{row.household}</td>
                  <td className="px-4 py-3 text-admin-ink/70">
                    {row.lastOpenedAt ? (
                      <span
                        title={
                          row.firstOpenedAt ? `First opened ${formatWhen(row.firstOpenedAt)}` : undefined
                        }
                      >
                        {formatWhen(row.lastOpenedAt)}
                        {row.openCount > 1 && <span className="ml-1 text-admin-ink/40">×{row.openCount}</span>}
                      </span>
                    ) : (
                      <span className="text-admin-ink/40">Not opened</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.status ? (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(row.status)}`}>
                        {STATUS_LABELS[row.status]}
                      </span>
                    ) : (
                      <span className="text-admin-ink/40">No answer</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-admin-ink/70 sm:table-cell">{row.nights || '—'}</td>
                  <td className="px-4 py-3 text-admin-ink">{row.rooms ?? '—'}</td>
                  <td className="hidden px-4 py-3 text-admin-ink/70 md:table-cell">
                    {row.answeredAt ? formatWhen(row.answeredAt) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
