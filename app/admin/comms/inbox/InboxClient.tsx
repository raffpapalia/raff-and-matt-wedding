'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InboxRow } from './page';
import { syncAppBadge } from '../../components/BadgeSync';

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? 's' : ''} ago`;
}

function DeleteConfirmModal({
  row,
  onCancel,
  onDeleted,
}: {
  row: InboxRow;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = row.guestName ?? (row.householdName ? `${row.householdName} (unmatched)` : 'this unknown number');

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/admin/api/sms-inbox/${row.id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error) {
        setError(json?.error ?? 'Failed to delete message');
        setDeleting(false);
        return;
      }
      onDeleted();
    } catch {
      setError('Network error');
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => !deleting && onCancel()}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-admin-ink p-6 shadow-2xl shadow-black/50 sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="font-cinzel text-xl font-semibold text-admin-bone">Delete message from {label}?</h3>
        <p className="mt-3 text-sm leading-relaxed text-admin-bone/70">This cannot be undone.</p>
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

function InboxRowCard({
  row,
  onChanged,
  onRequestDelete,
}: {
  row: InboxRow;
  onChanged: () => void;
  onRequestDelete: (row: InboxRow) => void;
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unread = !row.readAt;
  const label = row.guestName ?? (row.householdName ? `${row.householdName} (unmatched)` : 'Unknown number');

  async function sendReply() {
    if (!row.guestId || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/admin/api/sms-inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_id: row.guestId, body: draft.trim(), source_comm_id: row.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to send reply');
        return;
      }
      setDraft('');
      onChanged();
    } catch {
      setError('Network error');
    } finally {
      setSending(false);
    }
  }

  async function markRead() {
    setMarking(true);
    setError(null);
    try {
      const res = await fetch('/admin/api/sms-inbox/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comm_id: row.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to mark read');
        return;
      }
      onChanged();
    } catch {
      setError('Network error');
    } finally {
      setMarking(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border p-5 ${
        unread ? 'border-admin-persimmon/40 bg-admin-persimmon/5' : 'border-admin-sand/20 bg-admin-bone/40'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {unread && <span className="h-2 w-2 rounded-full bg-admin-persimmon" aria-hidden />}
            {row.householdId ? (
              <a href={`/admin/comms/${row.householdId}`} className="font-semibold text-admin-ink underline decoration-transparent transition hover:decoration-current">
                {label}
              </a>
            ) : (
              <p className="font-semibold text-admin-ink">{label}</p>
            )}
          </div>
          <p className="mt-1 text-xs text-admin-ink/50">
            {row.recipientNumber ?? 'Unknown number'} · {relativeTime(row.sentAt)}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {unread && (
            <button
              type="button"
              onClick={markRead}
              disabled={marking}
              className="min-h-[36px] rounded-xl border border-admin-sand/40 bg-white px-3 py-1 text-xs font-medium text-admin-ink/70 transition hover:border-admin-green/40 hover:text-admin-green disabled:opacity-50"
            >
              {marking ? '…' : 'Mark read'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onRequestDelete(row)}
            className="min-h-[36px] rounded-xl border border-admin-sand/40 bg-white px-3 py-1 text-xs font-medium text-admin-ink/50 transition hover:border-admin-persimmon/40 hover:text-admin-persimmon"
          >
            Delete
          </button>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm text-admin-ink">{row.message}</p>

      {error && <p className="mt-2 text-xs text-admin-persimmon">{error}</p>}

      {row.guestId ? (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a reply…"
            rows={2}
            className="min-w-[220px] flex-1 rounded-xl border border-admin-sand/40 bg-white px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-green/50"
          />
          <button
            type="button"
            onClick={sendReply}
            disabled={sending || !draft.trim()}
            className="min-h-[44px] rounded-xl bg-admin-green px-4 py-2 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Reply'}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs italic text-admin-ink/50">No guest on file for this number — can&apos;t reply from here.</p>
      )}
    </div>
  );
}

export default function InboxClient({ rows }: { rows: InboxRow[] }) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<InboxRow | null>(null);

  function handleChanged() {
    router.refresh();
    syncAppBadge();
  }

  return (
    <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
      {rows.length === 0 ? (
        <p className="text-sm text-admin-ink/60">No replies yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <InboxRowCard key={row.id} row={row} onChanged={handleChanged} onRequestDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          row={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            handleChanged();
          }}
        />
      )}
    </div>
  );
}
