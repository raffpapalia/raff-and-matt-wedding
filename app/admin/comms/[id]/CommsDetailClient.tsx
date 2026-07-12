'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DetailGuest, DetailComm } from './page';
import type { EmailTemplateRow, SmsTemplateRow } from '../templates/page';
import type { EmailTemplateKey } from '@/lib/email/renderTemplate';
import type { PhaseName } from '@/lib/supabase';
import { PHASE_LABELS } from '@/lib/email/templateInfo';
import TemplateChooserModal, { CUSTOM_MESSAGE_KEY } from '../TemplateChooserModal';
import EmailConfirmModal, { type EmailPreview } from '../EmailConfirmModal';
import SmsConfirmModal, { type SmsPreview } from '../SmsConfirmModal';
import BothTemplateChooserModal from '../BothTemplateChooserModal';
import BothConfirmModal, { type BothPreview } from '../BothConfirmModal';
import CustomizeMessageModal, { type CustomizeDraft } from '../CustomizeMessageModal';

type CustomContent = { subject?: string; body: string };

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

// --- Sub-components ---

function RsvpBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    attending: 'bg-admin-green/10 text-admin-green',
    declined: 'bg-admin-persimmon/10 text-admin-persimmon',
    pending: 'bg-admin-warning-bg text-admin-warning',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.2em] ${
        colors[status] ?? 'bg-admin-ink/5 text-admin-ink/40'
      }`}
    >
      {status}
    </span>
  );
}

// --- Main component ---

export default function CommsDetailClient({
  householdId,
  householdName: _householdName,
  householdSlug,
  linkOpenCount,
  linkFirstOpenedAt,
  linkLastOpenedAt,
  guests,
  comms,
  templates,
  smsTemplates,
  currentPhase,
  defaultTemplateKey,
  defaultSmsTemplateKey,
}: {
  householdId: string;
  householdName: string;
  householdSlug: string;
  linkOpenCount: number;
  linkFirstOpenedAt: string | null;
  linkLastOpenedAt: string | null;
  guests: DetailGuest[];
  comms: DetailComm[];
  templates: EmailTemplateRow[];
  smsTemplates: SmsTemplateRow[];
  currentPhase: PhaseName;
  defaultTemplateKey: EmailTemplateKey | null;
  defaultSmsTemplateKey: EmailTemplateKey | null;
}) {
  const router = useRouter();
  const guestById = new Map(guests.map((g) => [g.id, g]));
  const [chooserOpen, setChooserOpen] = useState<'email' | 'sms' | null>(null);
  const [customizeDraft, setCustomizeDraft] = useState<CustomizeDraft | null>(null);
  const [bothChooserOpen, setBothChooserOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [emailConfirm, setEmailConfirm] = useState<
    (EmailPreview & { templateKey: EmailTemplateKey | null; custom?: CustomContent }) | null
  >(null);
  const [smsConfirm, setSmsConfirm] = useState<
    (SmsPreview & { templateKey: EmailTemplateKey | null; custom?: CustomContent }) | null
  >(null);
  const [bothConfirm, setBothConfirm] = useState<(BothPreview & { emailKey: EmailTemplateKey; smsKey: EmailTemplateKey }) | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [bothSending, setBothSending] = useState(false);
  const [guestSendingId, setGuestSendingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Choosing a template (or "write a custom message") from the chooser never sends
  // directly anymore — it always opens the customize step first, prefilled from the
  // chosen template (or blank for a fully custom message).
  function handleChooseTemplate(key: EmailTemplateKey | typeof CUSTOM_MESSAGE_KEY) {
    const channel = chooserOpen;
    setChooserOpen(null);
    if (!channel) return;

    if (key === CUSTOM_MESSAGE_KEY) {
      setCustomizeDraft({ channel, subject: channel === 'email' ? '' : undefined, body: '' });
      return;
    }

    if (channel === 'email') {
      const source = templates.find((t) => t.key === key);
      setCustomizeDraft({ channel, subject: source?.subject ?? '', body: source?.body ?? '', baseKey: key });
    } else {
      const source = smsTemplates.find((t) => t.key === key);
      setCustomizeDraft({ channel, body: source?.body ?? '', baseKey: key });
    }
  }

  async function handleCustomizeContinue(content: CustomContent) {
    if (!customizeDraft) return;
    const { channel, baseKey } = customizeDraft;
    setCustomizeDraft(null);
    setSendError(null);
    setPreviewLoading(true);
    try {
      if (channel === 'email') {
        const res = await fetch(`/admin/api/send-email/preview?household_id=${householdId}`);
        const data = await res.json();
        if (!res.ok) {
          setSendError(data.error ?? 'Failed to check send status');
          return;
        }
        if (data.alreadyEmailed === 0) {
          await sendEmail('all', baseKey, content);
        } else {
          setEmailConfirm({ ...data, templateKey: baseKey ?? null, custom: content });
        }
      } else {
        const res = await fetch(`/admin/api/send-sms/preview?household_id=${householdId}`);
        const data = await res.json();
        if (!res.ok) {
          setSendError(data.error ?? 'Failed to check send status');
          return;
        }
        if (data.alreadyTexted === 0) {
          await sendSms('all', baseKey, content);
        } else {
          setSmsConfirm({ ...data, templateKey: baseKey ?? null, custom: content });
        }
      }
    } catch {
      setSendError('Network error');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleChooseBothTemplates(emailKey: EmailTemplateKey, smsKey: EmailTemplateKey) {
    setBothChooserOpen(false);
    setSendError(null);
    setPreviewLoading(true);
    try {
      const res = await fetch(`/admin/api/send-both/preview?household_id=${householdId}`);
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? 'Failed to check send status');
        return;
      }
      setBothConfirm({ ...data, emailKey, smsKey });
    } catch {
      setSendError('Network error');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function sendGuestEmailDirect(guestId: string, guestLabel: string) {
    setGuestSendingId(`${guestId}-email`);
    setSendError(null);
    try {
      const res = await fetch('/admin/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_id: guestId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? 'Failed to send email');
        return;
      }
      setFeedback(`Sent email to ${guestLabel}.`);
      router.refresh();
    } catch {
      setSendError('Network error');
    } finally {
      setGuestSendingId(null);
    }
  }

  async function sendGuestSmsDirect(guestId: string, guestLabel: string) {
    setGuestSendingId(`${guestId}-sms`);
    setSendError(null);
    try {
      const res = await fetch('/admin/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_id: guestId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? 'Failed to send SMS');
        return;
      }
      setFeedback(`Sent SMS to ${guestLabel}.`);
      router.refresh();
    } catch {
      setSendError('Network error');
    } finally {
      setGuestSendingId(null);
    }
  }

  async function resendComm(comm: DetailComm) {
    if (!comm.guest_id) return;
    setResendingId(comm.id);
    setSendError(null);
    try {
      const endpoint = comm.type === 'sms' ? '/admin/api/send-sms' : '/admin/api/send-email';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_id: comm.guest_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? `Failed to resend ${comm.type}`);
        return;
      }
      setFeedback(`${comm.type === 'sms' ? 'SMS' : 'Email'} resent.`);
      router.refresh();
    } catch {
      setSendError('Network error');
    } finally {
      setResendingId(null);
    }
  }

  async function sendEmail(mode: 'all' | 'not_yet_emailed', templateKey: EmailTemplateKey | undefined, custom?: CustomContent) {
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch('/admin/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household_id: householdId,
          mode,
          ...(custom
            ? { custom_subject: custom.subject, custom_body: custom.body, custom_base_key: templateKey }
            : { template: templateKey }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? 'Failed to send email');
        return;
      }
      setEmailConfirm(null);
      setFeedback(
        `Sent ${data.sent} of ${data.total} email${data.total !== 1 ? 's' : ''}${
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

  async function sendSms(mode: 'all' | 'not_yet_texted', templateKey: EmailTemplateKey | undefined, custom?: CustomContent) {
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch('/admin/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household_id: householdId,
          mode,
          ...(custom ? { custom_body: custom.body } : { template: templateKey }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? 'Failed to send SMS');
        return;
      }
      setSmsConfirm(null);
      setFeedback(
        `Sent ${data.sent} of ${data.total} SMS${
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

  async function sendBoth() {
    if (!bothConfirm) return;
    setBothSending(true);
    setSendError(null);
    try {
      const res = await fetch('/admin/api/send-both', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household_id: householdId,
          email_template: bothConfirm.emailKey,
          sms_template: bothConfirm.smsKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? 'Failed to send');
        return;
      }
      setBothConfirm(null);
      setFeedback(
        `Sent ${data.email.sent}/${data.email.total} emails, ${data.sms.sent}/${data.sms.total} SMS${
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

  return (
    <>
      {chooserOpen === 'email' && (
        <TemplateChooserModal
          templates={templates}
          defaultKey={defaultTemplateKey}
          heading="Send email"
          recipientSummary={`Current phase: ${PHASE_LABELS[currentPhase]}`}
          allowCustom
          onCancel={() => setChooserOpen(null)}
          onConfirm={handleChooseTemplate}
        />
      )}

      {chooserOpen === 'sms' && (
        <TemplateChooserModal
          templates={smsTemplates}
          defaultKey={defaultSmsTemplateKey}
          heading="Send SMS"
          recipientSummary={`Current phase: ${PHASE_LABELS[currentPhase]}`}
          emptyMessage="No active SMS templates. Activate one on the Templates page first."
          allowCustom
          onCancel={() => setChooserOpen(null)}
          onConfirm={handleChooseTemplate}
        />
      )}

      {customizeDraft && (
        <CustomizeMessageModal
          title={`${customizeDraft.channel === 'email' ? 'Email' : 'SMS'} for ${_householdName}`}
          draft={customizeDraft}
          onCancel={() => setCustomizeDraft(null)}
          onContinue={handleCustomizeContinue}
        />
      )}

      {bothChooserOpen && (
        <BothTemplateChooserModal
          emailTemplates={templates}
          smsTemplates={smsTemplates}
          defaultEmailKey={defaultTemplateKey}
          defaultSmsKey={defaultSmsTemplateKey}
          heading="Send to this household"
          recipientSummary={`Current phase: ${PHASE_LABELS[currentPhase]}`}
          onCancel={() => setBothChooserOpen(false)}
          onConfirm={handleChooseBothTemplates}
        />
      )}

      {emailConfirm && (
        <EmailConfirmModal
          title={_householdName}
          templateKey={emailConfirm.templateKey}
          preview={emailConfirm}
          sending={sending}
          onSendAll={() => sendEmail('all', emailConfirm.templateKey ?? undefined, emailConfirm.custom)}
          onSendNotYetEmailed={() => sendEmail('not_yet_emailed', emailConfirm.templateKey ?? undefined, emailConfirm.custom)}
          onCancel={() => setEmailConfirm(null)}
        />
      )}

      {smsConfirm && (
        <SmsConfirmModal
          title={_householdName}
          templateKey={smsConfirm.templateKey}
          preview={smsConfirm}
          sending={sending}
          onSendAll={() => sendSms('all', smsConfirm.templateKey ?? undefined, smsConfirm.custom)}
          onSendNotYetTexted={() => sendSms('not_yet_texted', smsConfirm.templateKey ?? undefined, smsConfirm.custom)}
          onCancel={() => setSmsConfirm(null)}
        />
      )}

      {bothConfirm && (
        <BothConfirmModal
          title={_householdName}
          emailTemplateKey={bothConfirm.emailKey}
          smsTemplateKey={bothConfirm.smsKey}
          preview={bothConfirm}
          sending={bothSending}
          onSend={sendBoth}
          onCancel={() => setBothConfirm(null)}
        />
      )}

      {feedback && (
        <div className="rounded-2xl bg-admin-green/10 px-4 py-3 text-sm text-admin-green">
          {feedback}
        </div>
      )}
      {sendError && (
        <div className="rounded-2xl bg-admin-persimmon/10 px-4 py-3 text-sm text-admin-persimmon">{sendError}</div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Guests panel */}
        <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Guests</p>
              <h2 className="mt-1 text-xl font-semibold text-admin-ink">
                {guests.length} guest{guests.length !== 1 ? 's' : ''}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setSendError(null); setChooserOpen('sms'); }}
                disabled={previewLoading}
                className="rounded-full border border-admin-violet/40 bg-admin-violet/15 px-4 py-2 text-sm text-admin-ink/80 transition hover:bg-admin-violet/25 disabled:opacity-50"
              >
                {previewLoading ? 'Checking…' : 'Send SMS'}
              </button>
              <button
                type="button"
                onClick={() => { setSendError(null); setChooserOpen('email'); }}
                disabled={previewLoading}
                className="rounded-full border border-admin-sand/50 bg-admin-sand/15 px-4 py-2 text-sm text-admin-ink/80 transition hover:bg-admin-sand/25 disabled:opacity-50"
              >
                {previewLoading ? 'Checking…' : 'Send Email'}
              </button>
              <button
                type="button"
                onClick={() => { setSendError(null); setBothChooserOpen(true); }}
                disabled={previewLoading || bothSending}
                className="rounded-full bg-admin-green px-4 py-2 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-50"
              >
                Send Both
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {guests.length === 0 ? (
              <p className="text-sm text-admin-ink/60">No guests in this household.</p>
            ) : (
              guests.map((guest) => (
                <div key={guest.id} className="rounded-2xl border border-admin-sand/20 bg-admin-bone/40 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-admin-ink">
                        {guest.first_name} {guest.last_name}
                      </p>
                      <div className="mt-1.5">
                        <RsvpBadge status={guest.rsvp_status} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          guest.comms_sms ? 'bg-admin-violet/25 text-admin-ink/80' : 'bg-admin-ink/5 text-admin-ink/40'
                        }`}
                      >
                        SMS {guest.comms_sms ? 'on' : 'off'}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          guest.comms_email ? 'bg-admin-sand/25 text-admin-ink/80' : 'bg-admin-ink/5 text-admin-ink/40'
                        }`}
                      >
                        Email {guest.comms_email ? 'on' : 'off'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-sm">
                    {guest.email && (
                      <div className="flex items-center gap-3">
                        <span className="w-14 text-xs uppercase tracking-[0.2em] text-admin-ink/50">Email</span>
                        <span className="text-admin-ink/80">{guest.email}</span>
                      </div>
                    )}
                    {guest.mobile && (
                      <div className="flex items-center gap-3">
                        <span className="w-14 text-xs uppercase tracking-[0.2em] text-admin-ink/50">Mobile</span>
                        <span className="text-admin-ink/80">{guest.mobile}</span>
                      </div>
                    )}
                    {!guest.email && !guest.mobile && (
                      <p className="text-xs italic text-admin-ink/50">No contact details on record</p>
                    )}
                  </div>

                  {/* Per-guest send buttons */}
                  {(guest.mobile && guest.comms_sms) || (guest.email && guest.comms_email) ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {guest.mobile && guest.comms_sms && (
                        <button
                          type="button"
                          onClick={() => sendGuestSmsDirect(guest.id, `${guest.first_name} ${guest.last_name}`)}
                          disabled={guestSendingId === `${guest.id}-sms`}
                          className="min-h-[44px] rounded-xl border border-admin-violet/40 bg-admin-violet/10 px-3 py-1 text-xs font-medium text-admin-ink/80 transition hover:bg-admin-violet/20 disabled:opacity-50"
                        >
                          {guestSendingId === `${guest.id}-sms` ? '…' : 'SMS'}
                        </button>
                      )}
                      {guest.email && guest.comms_email && (
                        <button
                          type="button"
                          onClick={() =>
                            sendGuestEmailDirect(guest.id, `${guest.first_name} ${guest.last_name}`)
                          }
                          disabled={guestSendingId === `${guest.id}-email`}
                          className="min-h-[44px] rounded-xl border border-admin-sand/50 bg-admin-sand/10 px-3 py-1 text-xs font-medium text-admin-ink/80 transition hover:bg-admin-sand/20 disabled:opacity-50"
                        >
                          {guestSendingId === `${guest.id}-email` ? '…' : 'Email'}
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <p className="mt-6 text-xs text-admin-ink/50">
            To change comms preferences,{' '}
            <a
              href={`/admin/guests/${householdId}/edit`}
              className="text-admin-green underline transition hover:text-admin-green/80"
            >
              edit the household
            </a>
            .
          </p>
        </div>

        <div className="space-y-8">
        {/* Send history */}
        <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Send history</p>
          <h2 className="mt-1 mb-6 text-xl font-semibold text-admin-ink">
            {comms.length} record{comms.length !== 1 ? 's' : ''}
          </h2>

          {comms.length === 0 ? (
            <p className="text-sm text-admin-ink/60">No communications sent yet.</p>
          ) : (
            <div className="space-y-3">
              {comms.map((comm) => {
                const recipient = comm.guest_id ? guestById.get(comm.guest_id) : undefined;
                const recipientLabel = comm.guest_id
                  ? recipient
                    ? `${recipient.first_name} ${recipient.last_name}`
                    : 'Guest no longer on file'
                  : 'Whole household (sent before per-guest tracking)';
                return (
                <div key={comm.id} className="rounded-2xl border border-admin-sand/20 bg-admin-bone/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] ${
                          comm.type === 'sms' ? 'bg-admin-violet/25 text-admin-ink/80' : 'bg-admin-sand/25 text-admin-ink/80'
                        }`}
                      >
                        {comm.type.toUpperCase()}
                      </span>
                      {comm.is_custom && (
                        <span className="inline-flex rounded-full bg-admin-green/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-admin-green">
                          Custom
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] ${
                        comm.status === 'sent'
                          ? 'bg-admin-green/10 text-admin-green'
                          : comm.status === 'failed'
                          ? 'bg-admin-persimmon/10 text-admin-persimmon'
                          : 'bg-admin-ink/5 text-admin-ink/40'
                      }`}
                    >
                      {comm.status}
                    </span>
                  </div>
                  <p
                    className={`mt-2 text-sm font-medium ${
                      comm.guest_id && recipient ? 'text-admin-ink' : 'text-admin-warning'
                    }`}
                  >
                    To: {recipientLabel}
                  </p>
                  <p className="mt-1 text-xs text-admin-ink/60" title={new Date(comm.sent_at).toLocaleString()}>
                    {relativeTime(comm.sent_at)} · {new Date(comm.sent_at).toLocaleTimeString()}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-admin-ink/70">{comm.message}</p>
                  {comm.guest_id ? (
                    <button
                      type="button"
                      onClick={() => resendComm(comm)}
                      disabled={resendingId === comm.id}
                      className="mt-3 min-h-[44px] rounded-xl border border-admin-sand/40 bg-white px-3 py-1 text-xs font-medium text-admin-ink/70 transition hover:border-admin-green/40 hover:text-admin-green disabled:opacity-50"
                    >
                      {resendingId === comm.id ? 'Resending…' : 'Resend'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="Original recipient unknown — cannot resend"
                      className="mt-3 min-h-[44px] rounded-xl border border-admin-sand/40 bg-white px-3 py-1 text-xs font-medium text-admin-ink/70 opacity-50 cursor-not-allowed"
                    >
                      Resend
                    </button>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Invite link activity */}
        <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Invite link</p>
          <h2 className="mt-1 mb-6 text-xl font-semibold text-admin-ink">Link activity</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-t border-admin-sand/20">
                <td className="py-3 pr-4 text-admin-ink/50">Status</td>
                <td className="py-3 text-right font-medium text-admin-ink">
                  {linkOpenCount > 0 ? 'Opened' : 'Not yet opened'}
                </td>
              </tr>
              <tr className="border-t border-admin-sand/20">
                <td className="py-3 pr-4 text-admin-ink/50">Times opened</td>
                <td className="py-3 text-right font-medium text-admin-ink">{linkOpenCount}</td>
              </tr>
              <tr className="border-t border-admin-sand/20">
                <td className="py-3 pr-4 text-admin-ink/50">First opened</td>
                <td
                  className="py-3 text-right font-medium text-admin-ink"
                  title={linkFirstOpenedAt ? new Date(linkFirstOpenedAt).toLocaleString() : undefined}
                >
                  {linkFirstOpenedAt ? relativeTime(linkFirstOpenedAt) : '—'}
                </td>
              </tr>
              <tr className="border-t border-admin-sand/20">
                <td className="py-3 pr-4 text-admin-ink/50">Last opened</td>
                <td
                  className="py-3 text-right font-medium text-admin-ink"
                  title={linkLastOpenedAt ? new Date(linkLastOpenedAt).toLocaleString() : undefined}
                >
                  {linkLastOpenedAt ? relativeTime(linkLastOpenedAt) : '—'}
                </td>
              </tr>
              <tr className="border-t border-admin-sand/20">
                <td className="py-3 pr-4 text-admin-ink/50">Invite link</td>
                <td className="py-3 text-right font-medium text-admin-ink/70">invite/{householdSlug}</td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </>
  );
}
