'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CommsSummaryRow, CommsStatus } from './page';
import type { EmailTemplateRow } from './templates/page';
import type { EmailTemplateKey } from '@/lib/email/renderTemplate';
import type { PhaseName } from '@/lib/supabase';
import { PHASE_LABELS } from '@/lib/email/templateInfo';
import TemplateChooserModal from './TemplateChooserModal';
import EmailConfirmModal, { type EmailPreview } from './EmailConfirmModal';

// --- Helpers ---

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

// --- Status badge ---

const STATUS_LABELS: Record<CommsStatus, string> = {
  not_sent: 'Not sent',
  sent: 'Sent',
  failed: 'Failed',
  partial: 'Partial',
};

const STATUS_COLORS: Record<CommsStatus, string> = {
  not_sent: 'bg-slate-800 text-slate-400',
  sent: 'bg-emerald-400/10 text-emerald-300',
  failed: 'bg-rose-500/10 text-rose-300',
  partial: 'bg-amber-400/10 text-amber-300',
};

function StatusBadge({ status }: { status: CommsStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// --- Main component ---

const PAGE_SIZE = 20;
type FilterTab = 'all' | 'not_sent' | 'sent' | 'failed';

type ChooserTarget = {
  ids: string[];
  title: string;
  loadingKey: string;
  defaultMode: 'all' | 'not_yet_emailed';
};

export default function CommsClient({
  rows,
  templates,
  currentPhase,
  defaultTemplateKey,
}: {
  rows: CommsSummaryRow[];
  templates: EmailTemplateRow[];
  currentPhase: PhaseName;
  defaultTemplateKey: EmailTemplateKey | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendError, setSendError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [chooserTarget, setChooserTarget] = useState<ChooserTarget | null>(null);
  const [emailConfirm, setEmailConfirm] = useState<{
    ids: string[];
    title: string;
    preview: EmailPreview;
    templateKey: EmailTemplateKey;
  } | null>(null);
  const [emailPreviewLoadingId, setEmailPreviewLoadingId] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [rows]);

  const tabCounts = useMemo(
    () => ({
      all: rows.length,
      not_sent: rows.filter((r) => r.smsStatus === 'not_sent' && r.emailStatus === 'not_sent').length,
      sent: rows.filter((r) => r.smsStatus === 'sent' || r.emailStatus === 'sent').length,
      failed: rows.filter((r) => r.smsStatus === 'failed' || r.emailStatus === 'failed').length,
    }),
    [rows]
  );

  const unsentIds = useMemo(
    () => rows.filter((r) => r.smsStatus === 'not_sent' && r.emailStatus === 'not_sent').map((r) => r.id),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (q && !row.name.toLowerCase().includes(q)) return false;
      if (tagFilter && !row.tags.includes(tagFilter)) return false;
      if (tab === 'not_sent') return row.smsStatus === 'not_sent' && row.emailStatus === 'not_sent';
      if (tab === 'sent') return row.smsStatus === 'sent' || row.emailStatus === 'sent';
      if (tab === 'failed') return row.smsStatus === 'failed' || row.emailStatus === 'failed';
      return true;
    });
  }, [rows, query, tab, tagFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === pageRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageRows.map((r) => r.id)));
    }
  }

  function openChooser(ids: string[], title: string, loadingKey: string, defaultMode: 'all' | 'not_yet_emailed') {
    if (ids.length === 0) return;
    setSendError(null);
    setChooserTarget({ ids, title, loadingKey, defaultMode });
  }

  async function handleChooseTemplate(key: EmailTemplateKey) {
    if (!chooserTarget) return;
    const { ids, title, loadingKey, defaultMode } = chooserTarget;
    setChooserTarget(null);
    await checkAndSendEmail(ids, title, loadingKey, defaultMode, key);
  }

  async function checkAndSendEmail(
    ids: string[],
    title: string,
    loadingKey: string,
    defaultMode: 'all' | 'not_yet_emailed',
    templateKey: EmailTemplateKey
  ) {
    if (ids.length === 0) {
      setSendError('No eligible households selected.');
      return;
    }
    setSendError(null);
    setEmailPreviewLoadingId(loadingKey);
    try {
      const url =
        ids.length === 1
          ? `/admin/api/send-email/preview?household_id=${ids[0]}`
          : `/admin/api/send-email/preview?household_ids=${ids.join(',')}`;
      const res = await fetch(url);
      const rawText = await res.text();

      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        setSendError('Preview response was not valid JSON — see console');
        return;
      }

      if (!res.ok) {
        setSendError(data.error ?? 'Failed to check send status');
        return;
      }

      if (data.alreadyEmailed === 0) {
        await sendEmailForIds(ids, defaultMode, title, templateKey);
      } else {
        setEmailConfirm({ ids, title, preview: data, templateKey });
      }
    } catch {
      setSendError('Network error');
    } finally {
      setEmailPreviewLoadingId(null);
    }
  }

  async function sendEmailForIds(
    ids: string[],
    mode: 'all' | 'not_yet_emailed',
    title: string,
    templateKey: EmailTemplateKey
  ) {
    setEmailSending(true);
    setSendError(null);
    try {
      const res = await fetch('/admin/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          ids.length === 1
            ? { household_id: ids[0], mode, template: templateKey }
            : { household_ids: ids, mode, template: templateKey }
        ),
      });
      const rawText = await res.text();

      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        setSendError('Send response was not valid JSON — see console');
        return;
      }

      if (!res.ok) {
        setSendError(data.error ?? 'Failed to send email');
        return;
      }

      setEmailConfirm(null);
      setSelectedIds(new Set());
      setFeedback(
        `Sent ${data.sent} of ${data.total} email${data.total !== 1 ? 's' : ''} to ${title}${
          data.failed ? ` (${data.failed} failed)` : ''
        }.`
      );
      router.refresh();
    } catch {
      setSendError('Network error');
    } finally {
      setEmailSending(false);
    }
  }

  const tabLabels: Record<FilterTab, string> = {
    all: 'All',
    not_sent: 'Not sent',
    sent: 'Sent',
    failed: 'Failed',
  };

  return (
    <>
      {chooserTarget && (
        <TemplateChooserModal
          templates={templates}
          defaultKey={defaultTemplateKey}
          heading={`Send email to ${chooserTarget.title}`}
          recipientSummary={`Current phase: ${PHASE_LABELS[currentPhase]}`}
          onCancel={() => setChooserTarget(null)}
          onConfirm={handleChooseTemplate}
        />
      )}

      {emailConfirm && (
        <EmailConfirmModal
          title={emailConfirm.title}
          templateKey={emailConfirm.templateKey}
          preview={emailConfirm.preview}
          sending={emailSending}
          onSendAll={() => sendEmailForIds(emailConfirm.ids, 'all', emailConfirm.title, emailConfirm.templateKey)}
          onSendNotYetEmailed={() =>
            sendEmailForIds(emailConfirm.ids, 'not_yet_emailed', emailConfirm.title, emailConfirm.templateKey)
          }
          onCancel={() => setEmailConfirm(null)}
        />
      )}

      <div className="space-y-6 rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
        {feedback && (
          <div className="rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            {feedback}
          </div>
        )}
        {sendError && (
          <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{sendError}</div>
        )}

        {/* Header row */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-emerald-200/70">Household roster</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">All households</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
              placeholder="Search households…"
              className="w-56 rounded-3xl border border-white/10 bg-slate-900/95 px-4 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
            />
            {allTags.length > 0 && (
              <select
                value={tagFilter}
                onChange={(e) => { setTagFilter(e.target.value); setPage(0); }}
                className="rounded-3xl border border-white/10 bg-slate-900/95 px-4 py-2 text-sm text-white outline-none"
              >
                <option value="">All tags</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-3">
          {(['all', 'not_sent', 'sent', 'failed'] as FilterTab[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => { setTab(key); setPage(0); }}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                tab === key
                  ? 'border-emerald-400 bg-emerald-400/10 text-emerald-100'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:border-emerald-300/30 hover:bg-white/10'
              }`}
            >
              {tabLabels[key]} ({tabCounts[key]})
            </button>
          ))}
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/5 px-5 py-4">
            <span className="text-sm text-amber-200">{selectedIds.size} selected</span>
            <button
              type="button"
              disabled
              title="SMS sending coming soon"
              className="rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-sm text-violet-200 opacity-50 cursor-not-allowed"
            >
              Send SMS
            </button>
            <button
              type="button"
              onClick={() =>
                openChooser(
                  [...selectedIds],
                  `${selectedIds.size} selected household${selectedIds.size !== 1 ? 's' : ''}`,
                  'bulk-selected',
                  'all'
                )
              }
              disabled={emailPreviewLoadingId === 'bulk-selected' || emailSending}
              className="rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-sm text-sky-200 transition hover:bg-sky-400/20 disabled:opacity-50"
            >
              {emailPreviewLoadingId === 'bulk-selected' ? 'Checking…' : 'Send Email'}
            </button>
            <button
              type="button"
              disabled
              title="SMS sending coming soon"
              className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 opacity-50 cursor-not-allowed"
            >
              Send Both
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="ml-auto text-sm text-slate-400 transition hover:text-white"
            >
              Clear
            </button>
          </div>
        )}

        {/* Global bulk actions */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              openChooser(
                rows.map((r) => r.id),
                `all ${rows.length} household${rows.length !== 1 ? 's' : ''}`,
                'bulk-all',
                'all'
              )
            }
            disabled={emailPreviewLoadingId === 'bulk-all' || emailSending || rows.length === 0}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            {emailPreviewLoadingId === 'bulk-all' ? 'Checking…' : `Email all (${rows.length})`}
          </button>
          <button
            type="button"
            onClick={() =>
              openChooser(
                unsentIds,
                `${unsentIds.length} unsent household${unsentIds.length !== 1 ? 's' : ''}`,
                'bulk-unsent',
                'not_yet_emailed'
              )
            }
            disabled={emailPreviewLoadingId === 'bulk-unsent' || emailSending || unsentIds.length === 0}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            {emailPreviewLoadingId === 'bulk-unsent' ? 'Checking…' : `Email unsent only (${tabCounts.not_sent})`}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.35em] text-slate-400">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={pageRows.length > 0 && selectedIds.size === pageRows.length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-emerald-400"
                  />
                </th>
                <th className="px-4 py-3">Household</th>
                <th className="px-4 py-3">Guests</th>
                <th className="px-4 py-3">SMS</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Last contacted</th>
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
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-emerald-400"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{row.name}</div>
                      {row.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {row.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <div>{row.guestCount} total</div>
                      <div className="text-[11px] text-slate-500">
                        {row.smsReadyCount} SMS · {row.emailReadyCount} email
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.smsStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.emailStatus} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {row.lastContacted ? (
                        relativeTime(row.lastContacted)
                      ) : (
                        <span className="text-slate-600">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/comms/${row.id}`)}
                          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-emerald-300/40 hover:bg-emerald-300/10"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          disabled
                          title="SMS sending coming soon"
                          className="rounded-2xl border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-200 opacity-50 cursor-not-allowed"
                        >
                          SMS
                        </button>
                        <button
                          type="button"
                          onClick={() => openChooser([row.id], row.name, row.id, 'all')}
                          disabled={emailPreviewLoadingId === row.id || emailSending}
                          className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200 transition hover:bg-sky-400/20 disabled:opacity-50"
                        >
                          {emailPreviewLoadingId === row.id ? '…' : 'Email'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm text-slate-300">
            <p>
              Showing <span className="font-semibold text-white">{pageRows.length}</span> of{' '}
              <span className="font-semibold text-white">{filtered.length}</span> households
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
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
                onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
