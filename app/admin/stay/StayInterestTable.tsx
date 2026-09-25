'use client';

import { useMemo, useState } from 'react';
import type { StayTableRow } from './page';

const STATUS_LABELS: Record<StayTableRow['status'], string> = {
  yes: 'Yes',
  maybe: 'Maybe',
  no: 'No',
};

function statusClass(status: StayTableRow['status']): string {
  if (status === 'yes') return 'bg-admin-green/10 text-admin-green';
  if (status === 'maybe') return 'bg-admin-warning-bg text-admin-warning';
  return 'bg-admin-ink/5 text-admin-ink/60';
}

export default function StayInterestTable({ rows }: { rows: StayTableRow[] }) {
  const [newestFirst, setNewestFirst] = useState(true);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const diff = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        return newestFirst ? -diff : diff;
      }),
    [rows, newestFirst]
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-[0.35em] text-admin-ink/50">
            <th className="px-4 py-3">Household</th>
            <th className="px-4 py-3">Status</th>
            <th className="hidden px-4 py-3 sm:table-cell">Nights</th>
            <th className="px-4 py-3">Rooms</th>
            <th
              className="hidden px-4 py-3 md:table-cell"
              aria-sort={newestFirst ? 'descending' : 'ascending'}
            >
              <button
                type="button"
                onClick={() => setNewestFirst(v => !v)}
                className="uppercase tracking-[0.35em] transition hover:text-admin-green"
              >
                Last updated {newestFirst ? '↓' : '↑'}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-admin-ink/60">
                No answers yet.
              </td>
            </tr>
          ) : (
            sorted.map(row => (
              <tr key={row.id} className="border-t border-admin-sand/10 hover:bg-admin-bone/40">
                <td className="px-4 py-3 font-medium text-admin-ink">{row.household}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(row.status)}`}>
                    {STATUS_LABELS[row.status]}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-admin-ink/70 sm:table-cell">{row.nights || '—'}</td>
                <td className="px-4 py-3 text-admin-ink">{row.rooms ?? '—'}</td>
                <td className="hidden px-4 py-3 text-admin-ink/70 md:table-cell">
                  {new Date(row.updatedAt).toLocaleString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
