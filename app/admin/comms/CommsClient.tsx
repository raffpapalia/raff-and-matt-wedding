'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CommsSummaryRow, CommsSummaryGuest, CommsStatus } from './page';
import type { TemplateKey } from './templates/page';

// --- Helpers ---

const GSM7_CHARS = new Set(
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
);

function getSmsInfo(text: string) {
  const chars = text.length;
  const isGsm = [...text].every((c) => GSM7_CHARS.has(c));
  const singleLimit = isGsm ? 160 : 70;
  const concatLimit = isGsm ? 153 : 67;
  const segments = chars === 0 ? 0 : chars <= singleLimit ? 1 : Math.ceil(chars / concatLimit);
  return { chars, segments, isGsm };
}

function hasUnresolvedTags(text: string): boolean {
  return /\{\{[^}]+\}\}/.test(text);
}

function resolveMergeTags(
  template: string,
  firstName: string,
  slug: string,
  weddingDate: string,
  venueName: string
): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== 'undefined' ? window.location.origin : '');
  return template
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{invite_link\}\}/g, `${siteUrl}/invite/${slug}`)
    .replace(/\{\{wedding_date\}\}/g, weddingDate)
    .replace(/\{\{venue\}\}/g, venueName);
}

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

// --- Template helpers ---

type TemplateOption = 'save_the_date' | 'rsvp_reminder' | 'rsvp_confirmation';

const TEMPLATE_OPTION_LABELS: Record<TemplateOption, string> = {
  save_the_date: 'Save the Date',
  rsvp_reminder: 'RSVP Reminder',
  rsvp_confirmation: 'RSVP Confirmation',
};

function getTemplateBody(
  option: TemplateOption,
  type: 'sms' | 'email' | 'both',
  templates: Record<TemplateKey, string>
): string {
  if (option === 'save_the_date') {
    return type === 'email'
      ? templates.tmpl_email_save_the_date_body
      : templates.tmpl_sms_save_the_date;
  }
  if (option === 'rsvp_reminder') return templates.tmpl_sms_rsvp_reminder;
  return type === 'email'
    ? templates.tmpl_email_rsvp_confirmation_body
    : templates.tmpl_sms_rsvp_confirmation;
}

function getTemplateSubject(
  option: TemplateOption,
  templates: Record<TemplateKey, string>
): string {
  if (option === 'save_the_date') return templates.tmpl_email_save_the_date_subject;
  if (option === 'rsvp_confirmation') return templates.tmpl_email_rsvp_confirmation_subject;
  return '';
}

function getAvailableTemplates(type: 'sms' | 'email' | 'both'): TemplateOption[] {
  if (type === 'email') return ['save_the_date', 'rsvp_confirmation'];
  return ['save_the_date', 'rsvp_reminder', 'rsvp_confirmation'];
}

// --- Send modal ---

type SendTarget = {
  rows: CommsSummaryRow[];
  type: 'sms' | 'email' | 'both';
};

function SendModal({
  target,
  templates,
  weddingDate,
  venueName,
  onClose,
  onConfirm,
  sending,
}: {
  target: SendTarget;
  templates: Record<TemplateKey, string>;
  weddingDate: string;
  venueName: string;
  onClose: () => void;
  onConfirm: (message: string) => void;
  sending: boolean;
}) {
  const { rows, type } = target;

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption>('save_the_date');
  const [message, setMessage] = useState(getTemplateBody('save_the_date', type, templates));
  const [emailSubject, setEmailSubject] = useState(
    type !== 'sms' ? getTemplateSubject('save_the_date', templates) : ''
  );

  // Gather all guests across selected households
  const allGuests: Array<CommsSummaryGuest & { slug: string; householdName: string }> = rows.flatMap(
    (r) => r.guests.map((g) => ({ ...g, slug: r.slug, householdName: r.name }))
  );

  function isEligibleSms(g: CommsSummaryGuest) { return g.comms_sms && !!g.mobile; }
  function isEligibleEmail(g: CommsSummaryGuest) { return g.comms_email && !!g.email; }

  const eligibleCount = allGuests.filter((g) => {
    if (type === 'sms') return isEligibleSms(g);
    if (type === 'email') return isEligibleEmail(g);
    return isEligibleSms(g) || isEligibleEmail(g);
  }).length;

  // Use first eligible guest + their household slug for preview
  const firstEligible = allGuests.find((g) =>
    type === 'email' ? isEligibleEmail(g) : isEligibleSms(g)
  ) ?? allGuests[0];

  const previewResolved = firstEligible
    ? resolveMergeTags(
        message,
        firstEligible.first_name,
        firstEligible.slug,
        weddingDate,
        venueName
      )
    : resolveMergeTags(message, 'Guest', rows[0]?.slug ?? '', weddingDate, venueName);

  const unresolvedWarning = hasUnresolvedTags(previewResolved);
  const availableTemplates = getAvailableTemplates(type);

  // Only show recipient list if targeting ≤1 household (multi-household: show summary)
  const showGuestList = rows.length === 1;

  function handleTemplateChange(opt: TemplateOption) {
    setSelectedTemplate(opt);
    setMessage(getTemplateBody(opt, type, templates));
    if (type !== 'sms') setEmailSubject(getTemplateSubject(opt, templates));
  }

  const channelLabel = type === 'both' ? 'SMS & Email' : type.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-950 p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">Confirm send</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Send {channelLabel} to {eligibleCount} guest{eligibleCount !== 1 ? 's' : ''}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {rows.length === 1
            ? rows[0].name
            : `${rows.length} households`}
        </p>

        {/* Recipient list (single household only) */}
        {showGuestList && (
          <div className="mt-4 divide-y divide-white/5 rounded-2xl border border-white/5 bg-slate-900/60">
            {allGuests.map((guest) => {
              const smsOk = isEligibleSms(guest);
              const emailOk = isEligibleEmail(guest);
              const relevant =
                type === 'sms' ? smsOk : type === 'email' ? emailOk : smsOk || emailOk;
              return (
                <div
                  key={guest.id}
                  className={`flex items-start justify-between gap-3 px-4 py-2.5 text-sm ${
                    relevant ? '' : 'opacity-40'
                  }`}
                >
                  <span className="font-medium text-white">
                    {guest.first_name} {guest.last_name}
                  </span>
                  <div className="text-right text-xs text-slate-400">
                    {type !== 'email' && (
                      <div>
                        {smsOk ? guest.mobile : !guest.mobile ? '— no mobile' : '— SMS off'}
                      </div>
                    )}
                    {type !== 'sms' && (
                      <div>
                        {emailOk ? guest.email : !guest.email ? '— no email' : '— email off'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Multi-household summary */}
        {!showGuestList && (
          <p className="mt-3 text-sm text-slate-400">
            {allGuests.length} guests across {rows.length} households · {eligibleCount} will receive this message
          </p>
        )}

        {/* Template selector */}
        <div className="mt-6">
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-slate-400">Template</p>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value as TemplateOption)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
          >
            {availableTemplates.map((opt) => (
              <option key={opt} value={opt}>
                {TEMPLATE_OPTION_LABELS[opt]}
              </option>
            ))}
          </select>
        </div>

        {/* Email subject */}
        {type !== 'sms' && (
          <div className="mt-4">
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-slate-400">Subject</p>
            <input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
            />
          </div>
        )}

        {/* Message body */}
        <div className="mt-4 space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
            {type === 'sms' ? 'Message' : 'Body'}
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
          />
          <p className="text-xs text-slate-500">
            {'{{first_name}}'} · {'{{invite_link}}'} · {'{{wedding_date}}'} · {'{{venue}}'}
          </p>
        </div>

        {/* Preview */}
        {firstEligible && (
          <div className="mt-4">
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-slate-400">
              Preview — {firstEligible.first_name}
            </p>
            <div className="rounded-2xl border border-white/5 bg-slate-900/60 px-4 py-3 text-sm text-slate-200 whitespace-pre-wrap">
              {previewResolved}
            </div>
          </div>
        )}

        {/* SMS character count */}
        {type !== 'email' && (() => {
          const info = getSmsInfo(previewResolved);
          const color =
            info.chars > 320 ? 'text-rose-400' : info.chars > 160 ? 'text-amber-400' : 'text-slate-500';
          return (
            <p className={`mt-2 text-xs ${color}`}>
              {info.chars} characters · {info.segments} SMS segment{info.segments !== 1 ? 's' : ''}
              {!info.isGsm ? ' (unicode)' : ''}
              {info.chars > 320 ? ' — Long message, may incur higher costs' : ''}
            </p>
          );
        })()}

        {/* Unresolved tags warning */}
        {unresolvedWarning && (
          <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            ⚠️ This message contains unresolved tags — check your settings and guest details before sending.
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(message)}
            disabled={sending || !message.trim()}
            className="flex-1 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Confirm send'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main component ---

const PAGE_SIZE = 20;
type FilterTab = 'all' | 'not_sent' | 'sent' | 'failed';

export default function CommsClient({
  rows,
  templates,
  weddingDate,
  venueName,
}: {
  rows: CommsSummaryRow[];
  templates: Record<TemplateKey, string>;
  weddingDate: string;
  venueName: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<SendTarget | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);

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

  function openModal(ids: string[], type: 'sms' | 'email' | 'both') {
    if (ids.length === 0) return;
    const selectedRows = rows.filter((r) => ids.includes(r.id));
    setModal({ rows: selectedRows, type });
    setSendError(null);
  }

  async function handleConfirm(message: string) {
    if (!modal) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch('/admin/api/comms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household_ids: modal.rows.map((r) => r.id),
          type: modal.type,
          message,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSendError(data.error ?? 'Failed to log communications');
        return;
      }
      setModal(null);
      setSelectedIds(new Set());
      setLastSentAt(new Date().toLocaleTimeString());
      router.refresh();
    } catch {
      setSendError('Network error');
    } finally {
      setSending(false);
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
      {modal && (
        <SendModal
          target={modal}
          templates={templates}
          weddingDate={weddingDate}
          venueName={venueName}
          onClose={() => setModal(null)}
          onConfirm={handleConfirm}
          sending={sending}
        />
      )}

      <div className="space-y-6 rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
        {lastSentAt && (
          <div className="rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            Communications logged successfully at {lastSentAt}.
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
              onClick={() => openModal([...selectedIds], 'sms')}
              className="rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-sm text-violet-200 transition hover:bg-violet-400/20"
            >
              Send SMS
            </button>
            <button
              type="button"
              onClick={() => openModal([...selectedIds], 'email')}
              className="rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-sm text-sky-200 transition hover:bg-sky-400/20"
            >
              Send Email
            </button>
            <button
              type="button"
              onClick={() => openModal([...selectedIds], 'both')}
              className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
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
            onClick={() => openModal(rows.map((r) => r.id), 'both')}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            Send to all ({rows.length})
          </button>
          <button
            type="button"
            onClick={() => {
              const unsent = rows
                .filter((r) => r.smsStatus === 'not_sent' && r.emailStatus === 'not_sent')
                .map((r) => r.id);
              openModal(unsent, 'both');
            }}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            Send to unsent only ({tabCounts.not_sent})
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
                          onClick={() => openModal([row.id], 'sms')}
                          className="rounded-2xl border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-200 transition hover:bg-violet-400/20"
                        >
                          SMS
                        </button>
                        <button
                          type="button"
                          onClick={() => openModal([row.id], 'email')}
                          className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200 transition hover:bg-sky-400/20"
                        >
                          Email
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
