'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CommsSummaryRow, CommsStatus } from './page';
import type { EmailTemplateRow, SmsTemplateRow } from './templates/page';
import type { EmailTemplateKey } from '@/lib/email/renderTemplate';
import type { PhaseName } from '@/lib/supabase';
import { PHASE_LABELS } from '@/lib/email/templateInfo';
import TemplateChooserModal from './TemplateChooserModal';
import EmailConfirmModal, { type EmailPreview } from './EmailConfirmModal';
import SmsConfirmModal, { type SmsPreview } from './SmsConfirmModal';
import BothTemplateChooserModal from './BothTemplateChooserModal';
import BothConfirmModal, { type BothPreview } from './BothConfirmModal';

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
  not_sent: 'bg-admin-ink/5 text-admin-ink/40',
  sent: 'bg-admin-green/10 text-admin-green',
  failed: 'bg-admin-persimmon/10 text-admin-persimmon',
  partial: 'bg-admin-warning-bg text-admin-warning',
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
type Channel = 'email' | 'sms';

type ChooserTarget = {
  ids: string[];
  title: string;
  loadingKey: string;
  defaultMode: 'all' | 'not_yet_sent';
  channel: Channel;
};

type BothChooserTarget = {
  ids: string[];
  title: string;
  loadingKey: string;
};

export default function CommsClient({
  rows,
  templates,
  smsTemplates,
  currentPhase,
  defaultTemplateKey,
  defaultSmsTemplateKey,
}: {
  rows: CommsSummaryRow[];
  templates: EmailTemplateRow[];
  smsTemplates: SmsTemplateRow[];
  currentPhase: PhaseName;
  defaultTemplateKey: EmailTemplateKey | null;
  defaultSmsTemplateKey: EmailTemplateKey | null;
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
  const [smsConfirm, setSmsConfirm] = useState<{
    ids: string[];
    title: string;
    preview: SmsPreview;
    templateKey: EmailTemplateKey;
  } | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [bothChooserTarget, setBothChooserTarget] = useState<BothChooserTarget | null>(null);
  const [bothConfirm, setBothConfirm] = useState<{
    ids: string[];
    title: string;
    preview: BothPreview;
    emailKey: EmailTemplateKey;
    smsKey: EmailTemplateKey;
  } | null>(null);
  const [bothSending, setBothSending] = useState(false);

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

  function openChooser(
    ids: string[],
    title: string,
    loadingKey: string,
    defaultMode: 'all' | 'not_yet_sent',
    channel: Channel
  ) {
    if (ids.length === 0) return;
    setSendError(null);
    setChooserTarget({ ids, title, loadingKey, defaultMode, channel });
  }

  async function handleChooseTemplate(key: EmailTemplateKey) {
    if (!chooserTarget) return;
    const { ids, title, loadingKey, defaultMode, channel } = chooserTarget;
    setChooserTarget(null);
    if (channel === 'email') {
      await checkAndSendEmail(ids, title, loadingKey, defaultMode === 'not_yet_sent' ? 'not_yet_emailed' : 'all', key);
    } else {
      await checkAndSendSms(ids, title, loadingKey, defaultMode === 'not_yet_sent' ? 'not_yet_texted' : 'all', key);
    }
  }

  async function checkAndSendEmail(
    ids: string[],
    title: string,
    loadingKey: string,
    fastPathMode: 'all' | 'not_yet_emailed',
    templateKey: EmailTemplateKey
  ) {
    setSendError(null);
    setPreviewLoadingId(loadingKey);
    try {
      const url =
        ids.length === 1
          ? `/admin/api/send-email/preview?household_id=${ids[0]}`
          : `/admin/api/send-email/preview?household_ids=${ids.join(',')}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setSendError(data.error ?? 'Failed to check send status');
        return;
      }

      if (data.alreadyEmailed === 0) {
        await sendEmailForIds(ids, fastPathMode, title, templateKey);
      } else {
        setEmailConfirm({
          ids,
          title,
          preview: { phase: data.phase, total: data.total, alreadyEmailed: data.alreadyEmailed, notYetEmailed: data.notYetEmailed },
          templateKey,
        });
      }
    } catch {
      setSendError('Network error');
    } finally {
      setPreviewLoadingId(null);
    }
  }

  async function checkAndSendSms(
    ids: string[],
    title: string,
    loadingKey: string,
    fastPathMode: 'all' | 'not_yet_texted',
    templateKey: EmailTemplateKey
  ) {
    setSendError(null);
    setPreviewLoadingId(loadingKey);
    try {
      const url =
        ids.length === 1
          ? `/admin/api/send-sms/preview?household_id=${ids[0]}`
          : `/admin/api/send-sms/preview?household_ids=${ids.join(',')}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setSendError(data.error ?? 'Failed to check send status');
        return;
      }

      if (data.alreadyTexted === 0) {
        await sendSmsForIds(ids, fastPathMode, title, templateKey);
      } else {
        setSmsConfirm({
          ids,
          title,
          preview: { phase: data.phase, total: data.total, alreadyTexted: data.alreadyTexted, notYetTexted: data.notYetTexted },
          templateKey,
        });
      }
    } catch {
      setSendError('Network error');
    } finally {
      setPreviewLoadingId(null);
    }
  }

  async function sendEmailForIds(ids: string[], mode: 'all' | 'not_yet_emailed', title: string, templateKey: EmailTemplateKey) {
    setSending(true);
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
      const data = await res.json();
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
      setSending(false);
    }
  }

  async function sendSmsForIds(ids: string[], mode: 'all' | 'not_yet_texted', title: string, templateKey: EmailTemplateKey) {
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch('/admin/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          ids.length === 1
            ? { household_id: ids[0], mode, template: templateKey }
            : { household_ids: ids, mode, template: templateKey }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? 'Failed to send SMS');
        return;
      }
      setSmsConfirm(null);
      setSelectedIds(new Set());
      setFeedback(
        `Sent ${data.sent} of ${data.total} SMS to ${title}${
          data.failed || data.skipped ? ` (${data.failed} failed, ${data.skipped} skipped)` : ''
        }.`
      );
      router.refresh();
    } catch {
      setSendError('Network error');
    } finally {
      setSending(false);
    }
  }

  function openBothChooser(ids: string[], title: string, loadingKey: string) {
    if (ids.length === 0) return;
    setSendError(null);
    setBothChooserTarget({ ids, title, loadingKey });
  }

  async function handleChooseBothTemplates(emailKey: EmailTemplateKey, smsKey: EmailTemplateKey) {
    if (!bothChooserTarget) return;
    const { ids, title, loadingKey } = bothChooserTarget;
    setBothChooserTarget(null);
    setSendError(null);
    setPreviewLoadingId(loadingKey);
    try {
      const url =
        ids.length === 1
          ? `/admin/api/send-both/preview?household_id=${ids[0]}`
          : `/admin/api/send-both/preview?household_ids=${ids.join(',')}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? 'Failed to check send status');
        return;
      }
      setBothConfirm({ ids, title, preview: data, emailKey, smsKey });
    } catch {
      setSendError('Network error');
    } finally {
      setPreviewLoadingId(null);
    }
  }

  async function sendBoth() {
    if (!bothConfirm) return;
    const { ids, title, emailKey, smsKey } = bothConfirm;
    setBothSending(true);
    setSendError(null);
    try {
      const res = await fetch('/admin/api/send-both', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          ids.length === 1
            ? { household_id: ids[0], email_template: emailKey, sms_template: smsKey }
            : { household_ids: ids, email_template: emailKey, sms_template: smsKey }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? 'Failed to send');
        return;
      }
      setBothConfirm(null);
      setSelectedIds(new Set());
      setFeedback(
        `Sent to ${title}: ${data.email.sent}/${data.email.total} emails, ${data.sms.sent}/${data.sms.total} SMS${
          data.email.failed || data.sms.failed ? ` (${data.email.failed + data.sms.failed} failed)` : ''
        }.`
      );
      router.refresh();
    } catch {
      setSendError('Network error');
    } finally {
      setBothSending(false);
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
      {chooserTarget && chooserTarget.channel === 'email' && (
        <TemplateChooserModal
          templates={templates}
          defaultKey={defaultTemplateKey}
          heading={`Send email to ${chooserTarget.title}`}
          recipientSummary={`Current phase: ${PHASE_LABELS[currentPhase]}`}
          onCancel={() => setChooserTarget(null)}
          onConfirm={handleChooseTemplate}
        />
      )}

      {chooserTarget && chooserTarget.channel === 'sms' && (
        <TemplateChooserModal
          templates={smsTemplates}
          defaultKey={defaultSmsTemplateKey}
          heading={`Send SMS to ${chooserTarget.title}`}
          recipientSummary={`Current phase: ${PHASE_LABELS[currentPhase]}`}
          emptyMessage="No active SMS templates. Activate one on the Templates page first."
          onCancel={() => setChooserTarget(null)}
          onConfirm={handleChooseTemplate}
        />
      )}

      {bothChooserTarget && (
        <BothTemplateChooserModal
          emailTemplates={templates}
          smsTemplates={smsTemplates}
          defaultEmailKey={defaultTemplateKey}
          defaultSmsKey={defaultSmsTemplateKey}
          heading={`Send to ${bothChooserTarget.title}`}
          recipientSummary={`Current phase: ${PHASE_LABELS[currentPhase]}`}
          onCancel={() => setBothChooserTarget(null)}
          onConfirm={handleChooseBothTemplates}
        />
      )}

      {emailConfirm && (
        <EmailConfirmModal
          title={emailConfirm.title}
          templateKey={emailConfirm.templateKey}
          preview={emailConfirm.preview}
          sending={sending}
          onSendAll={() => sendEmailForIds(emailConfirm.ids, 'all', emailConfirm.title, emailConfirm.templateKey)}
          onSendNotYetEmailed={() =>
            sendEmailForIds(emailConfirm.ids, 'not_yet_emailed', emailConfirm.title, emailConfirm.templateKey)
          }
          onCancel={() => setEmailConfirm(null)}
        />
      )}

      {smsConfirm && (
        <SmsConfirmModal
          title={smsConfirm.title}
          templateKey={smsConfirm.templateKey}
          preview={smsConfirm.preview}
          sending={sending}
          onSendAll={() => sendSmsForIds(smsConfirm.ids, 'all', smsConfirm.title, smsConfirm.templateKey)}
          onSendNotYetTexted={() =>
            sendSmsForIds(smsConfirm.ids, 'not_yet_texted', smsConfirm.title, smsConfirm.templateKey)
          }
          onCancel={() => setSmsConfirm(null)}
        />
      )}

      {bothConfirm && (
        <BothConfirmModal
          title={bothConfirm.title}
          emailTemplateKey={bothConfirm.emailKey}
          smsTemplateKey={bothConfirm.smsKey}
          preview={bothConfirm.preview}
          sending={bothSending}
          onSend={sendBoth}
          onCancel={() => setBothConfirm(null)}
        />
      )}

      <div className="space-y-6 rounded-[2rem] border border-admin-sand/20 bg-white p-6">
        {feedback && (
          <div className="rounded-2xl bg-admin-green/10 px-4 py-3 text-sm text-admin-green">
            {feedback}
          </div>
        )}
        {sendError && (
          <div className="rounded-2xl bg-admin-persimmon/10 px-4 py-3 text-sm text-admin-persimmon">{sendError}</div>
        )}

        {/* Header row */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-admin-green">Household roster</p>
            <h2 className="mt-3 text-2xl font-semibold text-admin-ink">All households</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
              placeholder="Search households…"
              className="w-56 rounded-3xl border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink outline-none transition focus:border-admin-green"
            />
            {allTags.length > 0 && (
              <select
                value={tagFilter}
                onChange={(e) => { setTagFilter(e.target.value); setPage(0); }}
                className="rounded-3xl border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink outline-none"
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
                  ? 'border-admin-green bg-admin-green/10 text-admin-green'
                  : 'border-admin-sand/30 bg-admin-bone/40 text-admin-ink/70 hover:border-admin-green/40 hover:text-admin-green'
              }`}
            >
              {tabLabels[key]} ({tabCounts[key]})
            </button>
          ))}
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-admin-warning/30 bg-admin-warning-bg px-5 py-4">
            <span className="text-sm text-admin-warning">{selectedIds.size} selected</span>
            <button
              type="button"
              onClick={() =>
                openChooser(
                  [...selectedIds],
                  `${selectedIds.size} selected household${selectedIds.size !== 1 ? 's' : ''}`,
                  'bulk-selected-sms',
                  'all',
                  'sms'
                )
              }
              disabled={previewLoadingId === 'bulk-selected-sms' || sending}
              className="rounded-full border border-admin-violet/40 bg-admin-violet/15 px-4 py-2 text-sm text-admin-ink/80 transition hover:bg-admin-violet/25 disabled:opacity-50"
            >
              {previewLoadingId === 'bulk-selected-sms' ? 'Checking…' : 'Send SMS'}
            </button>
            <button
              type="button"
              onClick={() =>
                openChooser(
                  [...selectedIds],
                  `${selectedIds.size} selected household${selectedIds.size !== 1 ? 's' : ''}`,
                  'bulk-selected',
                  'all',
                  'email'
                )
              }
              disabled={previewLoadingId === 'bulk-selected' || sending}
              className="rounded-full border border-admin-sand/50 bg-admin-sand/15 px-4 py-2 text-sm text-admin-ink/80 transition hover:bg-admin-sand/25 disabled:opacity-50"
            >
              {previewLoadingId === 'bulk-selected' ? 'Checking…' : 'Send Email'}
            </button>
            <button
              type="button"
              onClick={() =>
                openBothChooser(
                  [...selectedIds],
                  `${selectedIds.size} selected household${selectedIds.size !== 1 ? 's' : ''}`,
                  'bulk-selected-both'
                )
              }
              disabled={previewLoadingId === 'bulk-selected-both' || bothSending}
              className="rounded-full bg-admin-green px-4 py-2 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-50"
            >
              {previewLoadingId === 'bulk-selected-both' ? 'Checking…' : 'Send Both'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="ml-auto text-sm text-admin-ink/60 transition hover:text-admin-ink"
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
                'all',
                'email'
              )
            }
            disabled={previewLoadingId === 'bulk-all' || sending || rows.length === 0}
            className="rounded-full border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green disabled:opacity-50"
          >
            {previewLoadingId === 'bulk-all' ? 'Checking…' : `Email all (${rows.length})`}
          </button>
          <button
            type="button"
            onClick={() =>
              openChooser(
                unsentIds,
                `${unsentIds.length} unsent household${unsentIds.length !== 1 ? 's' : ''}`,
                'bulk-unsent',
                'not_yet_sent',
                'email'
              )
            }
            disabled={previewLoadingId === 'bulk-unsent' || sending || unsentIds.length === 0}
            className="rounded-full border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green disabled:opacity-50"
          >
            {previewLoadingId === 'bulk-unsent' ? 'Checking…' : `Email unsent only (${tabCounts.not_sent})`}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.35em] text-admin-ink/50">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={pageRows.length > 0 && selectedIds.size === pageRows.length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-admin-sand/60 bg-white accent-admin-green"
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
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-admin-ink/60">
                    No households match this filter.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={row.id} className="border-t border-admin-sand/10 hover:bg-admin-bone/40">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        className="h-4 w-4 rounded border-admin-sand/60 bg-white accent-admin-green"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-admin-ink">{row.name}</div>
                      {row.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {row.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-admin-ink/5 px-2 py-0.5 text-[10px] text-admin-ink/70"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-admin-ink/70">
                      <div>{row.guestCount} total</div>
                      <div className="text-[11px] text-admin-ink/50">
                        {row.smsReadyCount} SMS · {row.emailReadyCount} email
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.smsStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.emailStatus} />
                    </td>
                    <td className="px-4 py-3 text-xs text-admin-ink/60">
                      {row.lastContacted ? (
                        relativeTime(row.lastContacted)
                      ) : (
                        <span className="text-admin-ink/40">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/comms/${row.id}`)}
                          className="rounded-2xl border border-admin-sand/40 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-admin-ink/80 transition hover:border-admin-green/40 hover:bg-admin-green/10"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openChooser([row.id], row.name, `${row.id}-sms`, 'all', 'sms')}
                          disabled={previewLoadingId === `${row.id}-sms` || sending}
                          className="rounded-2xl border border-admin-violet/40 bg-admin-violet/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-admin-ink/80 transition hover:bg-admin-violet/25 disabled:opacity-50"
                        >
                          {previewLoadingId === `${row.id}-sms` ? '…' : 'SMS'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openChooser([row.id], row.name, row.id, 'all', 'email')}
                          disabled={previewLoadingId === row.id || sending}
                          className="rounded-2xl border border-admin-sand/50 bg-admin-sand/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-admin-ink/80 transition hover:bg-admin-sand/25 disabled:opacity-50"
                        >
                          {previewLoadingId === row.id ? '…' : 'Email'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openBothChooser([row.id], row.name, `${row.id}-both`)}
                          disabled={previewLoadingId === `${row.id}-both` || bothSending}
                          className="rounded-2xl bg-admin-green px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-50"
                        >
                          {previewLoadingId === `${row.id}-both` ? '…' : 'Both'}
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-admin-sand/20 pt-4 text-sm text-admin-ink/70">
            <p>
              Showing <span className="font-semibold text-admin-ink">{pageRows.length}</span> of{' '}
              <span className="font-semibold text-admin-ink">{filtered.length}</span> households
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
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
                onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                className="rounded-2xl border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green disabled:cursor-not-allowed disabled:opacity-50"
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
