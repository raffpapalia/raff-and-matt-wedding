'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

export type GuestFlatRow = {
  id: string;
  householdId: string;
  householdName: string;
  householdSlug: string;
  householdTags: string[];
  firstName: string;
  lastName: string;
  rsvpStatus: string;
  hasDietaryConcern: boolean;
  hasPersonalMessage: boolean;
  hasPersonalPhoto: boolean;
};

type SortKey = 'household' | 'firstName' | 'lastName' | 'rsvp' | 'dietary' | 'message' | 'photo';
type SortDir = 'asc' | 'desc';

const defaultSortDir: Record<SortKey, SortDir> = {
  household: 'asc',
  firstName: 'asc',
  lastName: 'asc',
  rsvp: 'desc',
  dietary: 'desc',
  message: 'desc',
  photo: 'desc',
};

const sortHeaderClass = 'inline-flex items-center gap-1 transition hover:text-admin-green';

function SortArrow({ direction }: { direction: SortDir }) {
  return <span className="text-[10px] text-admin-green">{direction === 'asc' ? '▲' : '▼'}</span>;
}

function RsvpBadge({ status }: { status: string }) {
  if (status === 'attending') {
    return <span className="text-xs font-medium text-admin-green">✓ Attending</span>;
  }
  if (status === 'declined') {
    return <span className="text-xs font-medium text-admin-persimmon">Declined</span>;
  }
  return <span className="text-xs font-medium text-admin-warning">Pending</span>;
}

function DietarySymbol({ hasConcern }: { hasConcern: boolean }) {
  if (!hasConcern) {
    return (
      <span className="text-admin-ink/25" title="No dietary requirement">
        —
      </span>
    );
  }
  return (
    <span className="text-admin-warning" title="Has a dietary requirement">
      ⚠
    </span>
  );
}

function CheckSymbol({ present, title }: { present: boolean; title: string }) {
  if (!present) {
    return (
      <span className="text-admin-ink/25" title={`Not added: ${title}`}>
        —
      </span>
    );
  }
  return (
    <span className="text-admin-green" title={`Added: ${title}`}>
      ✓
    </span>
  );
}

export default function GuestFlatTable({
  rows,
  allTags,
  initialQuery,
  showDietary,
}: {
  rows: GuestFlatRow[];
  allTags: string[];
  initialQuery?: string;
  showDietary: boolean;
}) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('household');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(defaultSortDir[key]);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  };

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (selectedTags.length > 0 && !row.householdTags.some((tag) => selectedTags.includes(tag))) {
        return false;
      }
      if (!normalizedQuery) return true;
      return (
        row.householdName.toLowerCase().includes(normalizedQuery) ||
        row.firstName.toLowerCase().includes(normalizedQuery) ||
        row.lastName.toLowerCase().includes(normalizedQuery) ||
        row.householdTags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [rows, query, selectedTags]);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'household') cmp = a.householdName.localeCompare(b.householdName);
      else if (sortKey === 'firstName') cmp = a.firstName.localeCompare(b.firstName);
      else if (sortKey === 'lastName') cmp = a.lastName.localeCompare(b.lastName);
      else if (sortKey === 'dietary') cmp = Number(a.hasDietaryConcern) - Number(b.hasDietaryConcern);
      else if (sortKey === 'message') cmp = Number(a.hasPersonalMessage) - Number(b.hasPersonalMessage);
      else if (sortKey === 'photo') cmp = Number(a.hasPersonalPhoto) - Number(b.hasPersonalPhoto);
      else {
        const rank: Record<string, number> = { attending: 2, pending: 1, declined: 0 };
        cmp = (rank[a.rsvpStatus] ?? 1) - (rank[b.rsvpStatus] ?? 1);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredRows, sortKey, sortDir]);

  const columnCount = showDietary ? 7 : 6;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-md flex-1">
          <label className="relative block">
            <span className="sr-only">Search guests</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder="Search guests, households, or tags…"
              className="w-full rounded-2xl border border-admin-sand/40 bg-white px-4 py-3 text-sm text-admin-ink placeholder-admin-ink/30 outline-none transition focus:border-admin-green"
            />
          </label>
        </div>

        {allTags.length > 0 ? (
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-admin-ink/40">Filter by tag</span>
              {selectedTags.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelectedTags([])}
                  className="text-xs font-medium text-admin-ink/50 underline transition hover:text-admin-green"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    selectedTags.includes(tag)
                      ? 'border-admin-green bg-admin-green/10 text-admin-green'
                      : 'border-admin-sand/30 bg-admin-bone/40 text-admin-ink/70 hover:border-admin-green/40 hover:text-admin-green'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ) : null}
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
                <button type="button" onClick={() => handleSort('firstName')} className={sortHeaderClass}>
                  First name
                  {sortKey === 'firstName' ? <SortArrow direction={sortDir} /> : null}
                </button>
              </th>
              <th className="px-4 py-3 font-cinzel font-semibold">
                <button type="button" onClick={() => handleSort('lastName')} className={sortHeaderClass}>
                  Last name
                  {sortKey === 'lastName' ? <SortArrow direction={sortDir} /> : null}
                </button>
              </th>
              <th className="px-4 py-3 font-cinzel font-semibold">
                <button type="button" onClick={() => handleSort('rsvp')} className={sortHeaderClass}>
                  Attending
                  {sortKey === 'rsvp' ? <SortArrow direction={sortDir} /> : null}
                </button>
              </th>
              {showDietary ? (
                <th className="hidden px-4 py-3 text-center font-cinzel font-semibold sm:table-cell" title="Dietary requirement">
                  <button type="button" onClick={() => handleSort('dietary')} className={sortHeaderClass}>
                    Dietary
                    {sortKey === 'dietary' ? <SortArrow direction={sortDir} /> : null}
                  </button>
                </th>
              ) : null}
              <th className="hidden px-4 py-3 text-center font-cinzel font-semibold md:table-cell" title="Personal message added">
                <button type="button" onClick={() => handleSort('message')} className={sortHeaderClass}>
                  Message
                  {sortKey === 'message' ? <SortArrow direction={sortDir} /> : null}
                </button>
              </th>
              <th className="hidden px-4 py-3 text-center font-cinzel font-semibold md:table-cell" title="Invitation photo added">
                <button type="button" onClick={() => handleSort('photo')} className={sortHeaderClass}>
                  Photo
                  {sortKey === 'photo' ? <SortArrow direction={sortDir} /> : null}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="px-4 py-10 text-center text-sm text-admin-ink/50">
                  No guests match your search or filters.
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => (
                <tr key={row.id} className="border-t border-admin-sand/10 transition hover:bg-admin-bone/40">
                  <td className="px-4 py-3 align-top">
                    <Link href={`/admin/guests/${row.householdId}/edit`} className="font-medium text-admin-ink transition hover:text-admin-green">
                      {row.householdName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 align-top text-admin-ink/80">{row.firstName}</td>
                  <td className="px-4 py-3 align-top text-admin-ink/80">{row.lastName}</td>
                  <td className="px-4 py-3 align-top">
                    <RsvpBadge status={row.rsvpStatus} />
                  </td>
                  {showDietary ? (
                    <td className="hidden px-4 py-3 text-center align-top sm:table-cell">
                      <DietarySymbol hasConcern={row.hasDietaryConcern} />
                    </td>
                  ) : null}
                  <td className="hidden px-4 py-3 text-center align-top md:table-cell">
                    <CheckSymbol present={row.hasPersonalMessage} title="personal message" />
                  </td>
                  <td className="hidden px-4 py-3 text-center align-top md:table-cell">
                    <CheckSymbol present={row.hasPersonalPhoto} title="invitation photo" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-admin-ink/50">
        Showing <span className="font-semibold text-admin-ink">{sortedRows.length}</span> guests.
      </p>
    </div>
  );
}
