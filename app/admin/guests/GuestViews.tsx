'use client';

import { useState } from 'react';
import GuestListTable from '@/app/admin/guests/GuestListTable';
import GuestFlatTable, { type GuestFlatRow } from '@/app/admin/guests/GuestFlatTable';

type HouseholdRow = Parameters<typeof GuestListTable>[0]['rows'][number];

const viewKeys = ['households', 'guests'] as const;
const viewLabels: Record<typeof viewKeys[number], string> = {
  households: 'Households',
  guests: 'Full guest list',
};

export default function GuestViews({
  householdRows,
  guestRows,
  allTags,
  initialQuery,
  currentPhase,
}: {
  householdRows: HouseholdRow[];
  guestRows: GuestFlatRow[];
  allTags: string[];
  initialQuery?: string;
  currentPhase: string;
}) {
  const [view, setView] = useState<typeof viewKeys[number]>('households');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {viewKeys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              view === key
                ? 'border-admin-green bg-admin-green/10 text-admin-green'
                : 'border-admin-sand/30 bg-white text-admin-ink/70 hover:border-admin-green/40 hover:text-admin-green'
            }`}
          >
            {viewLabels[key]}
          </button>
        ))}
      </div>

      {view === 'households' ? (
        <GuestListTable rows={householdRows} initialQuery={initialQuery} currentPhase={currentPhase} />
      ) : (
        <div className="rounded-[2rem] border border-admin-sand/20 bg-white p-6 font-dm-sans sm:p-8">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-admin-green">Guest manager</p>
            <h2 className="mt-2 font-cinzel text-2xl font-semibold text-admin-ink">Full guest list</h2>
          </div>
          <GuestFlatTable rows={guestRows} allTags={allTags} initialQuery={initialQuery} showDietary={currentPhase !== 'save_the_date'} />
        </div>
      )}
    </div>
  );
}
