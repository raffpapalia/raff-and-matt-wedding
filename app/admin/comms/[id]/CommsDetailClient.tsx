'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DetailGuest, DetailComm } from './page';
import type { EmailTemplateRow } from '../templates/page';
import type { EmailTemplateKey } from '@/lib/email/renderTemplate';
import type { PhaseName } from '@/lib/supabase';
import { PHASE_LABELS } from '@/lib/email/templateInfo';
import TemplateChooserModal from '../TemplateChooserModal';
import EmailConfirmModal, { type EmailPreview } from '../EmailConfirmModal';

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
    attending: 'bg-emerald-400/10 text-emerald-300',
    declined: 'bg-rose-500/10 text-rose-300',
    pending: 'bg-amber-400/10 text-amber-300',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.2em] ${
        colors[status] ?? 'bg-slate-800 text-slate-400'
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
  householdSlug: _householdSlug,
  guests,
  comms,
  templates,
  currentPhase,
  defaultTemplateKey,
}: {
  householdId: string;
  householdName: string;
  householdSlug: string;
  guests: DetailGuest[];
  comms: DetailComm[];
  templates: EmailTemplateRow[];
  currentPhase: PhaseName;
  defaultTemplateKey: EmailTemplateKey | null;
}) {
  const router = useRouter();
  const guestById = new Map(guests.map((g) => [g.id, g]));
  const [chooserOpen, setChooserOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [emailConfirm, setEmailConfirm] = useState<(EmailPreview & { templateKey: EmailTemplateKey }) | null>(null);
  const [emailPreviewLoading, setEmailPreviewLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [guestEmailSendingId, setGuestEmailSendingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  function openChooser() {
    setSendError(null);
    setChooserOpen(true);
  }

  async function handleChooseTemplate(key: EmailTemplateKey) {
    setChooserOpen(false);
    setSendError(null);
    setEmailPreviewLoading(true);
    try {
      const res = await fetch(`/admin/api/send-email/preview?household_id=${householdId}`);
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? 'Failed to check send status');
        return;
      }
      if (data.alreadyEmailed === 0) {
        await sendEmail('all', key);
      } else {
        setEmailConfirm({ ...data, templateKey: key });
      }
    } catch {
      setSendError('Network error');
    } finally {
      setEmailPreviewLoading(false);
    }
  }

  async function sendGuestEmailDirect(guestId: string, guestLabel: string) {
    setGuestEmailSendingId(guestId);
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
      setGuestEmailSendingId(null);
    }
  }

  async function resendEmail(comm: DetailComm) {
    if (!comm.guest_id) return;
    setResendingId(comm.id);
    setSendError(null);
    try {
      const res = await fetch('/admin/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_id: comm.guest_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? 'Failed to resend email');
        return;
      }
      setFeedback('Email resent.');
      router.refresh();
    } catch {
      setSendError('Network error');
    } finally {
      setResendingId(null);
    }
  }

  async function sendEmail(mode: 'all' | 'not_yet_emailed', templateKey: EmailTemplateKey) {
    setEmailSending(true);
    setSendError(null);
    try {
      const res = await fetch('/admin/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ household_id: householdId, mode, template: templateKey }),
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
      setEmailSending(false);
    }
  }

  return (
    <>
      {chooserOpen && (
        <TemplateChooserModal
          templates={templates}
          defaultKey={defaultTemplateKey}
          heading="Send email"
          recipientSummary={`Current phase: ${PHASE_LABELS[currentPhase]}`}
          onCancel={() => setChooserOpen(false)}
          onConfirm={handleChooseTemplate}
        />
      )}

      {emailConfirm && (
        <EmailConfirmModal
          title={_householdName}
          templateKey={emailConfirm.templateKey}
          preview={emailConfirm}
          sending={emailSending}
          onSendAll={() => sendEmail('all', emailConfirm.templateKey)}
          onSendNotYetEmailed={() => sendEmail('not_yet_emailed', emailConfirm.templateKey)}
          onCancel={() => setEmailConfirm(null)}
        />
      )}

      {feedback && (
        <div className="rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          {feedback}
        </div>
      )}
      {sendError && (
        <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{sendError}</div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Guests panel */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">Guests</p>
              <h2 className="mt-1 text-xl font-semibold text-white">
                {guests.length} guest{guests.length !== 1 ? 's' : ''}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
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
                onClick={openChooser}
                disabled={emailPreviewLoading}
                className="rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-sm text-sky-200 transition hover:bg-sky-400/20 disabled:opacity-50"
              >
                {emailPreviewLoading ? 'Checking…' : 'Send Email'}
              </button>
              <button
                type="button"
                disabled
                title="SMS sending coming soon"
                className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 opacity-50 cursor-not-allowed"
              >
                Send Both
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {guests.length === 0 ? (
              <p className="text-sm text-slate-400">No guests in this household.</p>
            ) : (
              guests.map((guest) => (
                <div key={guest.id} className="rounded-2xl border border-white/5 bg-slate-900/60 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">
                        {guest.first_name} {guest.last_name}
                      </p>
                      <div className="mt-1.5">
                        <RsvpBadge status={guest.rsvp_status} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          guest.comms_sms ? 'bg-violet-400/10 text-violet-300' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        SMS {guest.comms_sms ? 'on' : 'off'}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          guest.comms_email ? 'bg-sky-400/10 text-sky-300' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        Email {guest.comms_email ? 'on' : 'off'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-sm">
                    {guest.email && (
                      <div className="flex items-center gap-3">
                        <span className="w-14 text-xs uppercase tracking-[0.2em] text-slate-500">Email</span>
                        <span className="text-slate-200">{guest.email}</span>
                      </div>
                    )}
                    {guest.mobile && (
                      <div className="flex items-center gap-3">
                        <span className="w-14 text-xs uppercase tracking-[0.2em] text-slate-500">Mobile</span>
                        <span className="text-slate-200">{guest.mobile}</span>
                      </div>
                    )}
                    {!guest.email && !guest.mobile && (
                      <p className="text-xs italic text-slate-500">No contact details on record</p>
                    )}
                  </div>

                  {/* Per-guest send buttons */}
                  {(guest.mobile && guest.comms_sms) || (guest.email && guest.comms_email) ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {guest.mobile && guest.comms_sms && (
                        <button
                          type="button"
                          disabled
                          title="SMS sending coming soon"
                          className="min-h-[44px] rounded-xl border border-violet-400/20 bg-violet-400/5 px-3 py-1 text-xs font-medium text-violet-300 opacity-50 cursor-not-allowed"
                        >
                          SMS
                        </button>
                      )}
                      {guest.email && guest.comms_email && (
                        <button
                          type="button"
                          onClick={() =>
                            sendGuestEmailDirect(guest.id, `${guest.first_name} ${guest.last_name}`)
                          }
                          disabled={guestEmailSendingId === guest.id}
                          className="min-h-[44px] rounded-xl border border-sky-400/20 bg-sky-400/5 px-3 py-1 text-xs font-medium text-sky-300 transition hover:bg-sky-400/15 disabled:opacity-50"
                        >
                          {guestEmailSendingId === guest.id ? '…' : 'Email'}
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <p className="mt-6 text-xs text-slate-500">
            To change comms preferences,{' '}
            <a
              href={`/admin/guests/${householdId}/edit`}
              className="text-emerald-400 underline transition hover:text-emerald-300"
            >
              edit the household
            </a>
            .
          </p>
        </div>

        {/* Send history */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">Send history</p>
          <h2 className="mt-1 mb-6 text-xl font-semibold text-white">
            {comms.length} record{comms.length !== 1 ? 's' : ''}
          </h2>

          {comms.length === 0 ? (
            <p className="text-sm text-slate-400">No communications sent yet.</p>
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
                <div key={comm.id} className="rounded-2xl border border-white/5 bg-slate-900/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] ${
                        comm.type === 'sms' ? 'bg-violet-400/10 text-violet-300' : 'bg-sky-400/10 text-sky-300'
                      }`}
                    >
                      {comm.type.toUpperCase()}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] ${
                        comm.status === 'sent'
                          ? 'bg-emerald-400/10 text-emerald-300'
                          : comm.status === 'failed'
                          ? 'bg-rose-500/10 text-rose-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {comm.status}
                    </span>
                  </div>
                  <p
                    className={`mt-2 text-sm font-medium ${
                      comm.guest_id && recipient ? 'text-white' : 'text-amber-300'
                    }`}
                  >
                    To: {recipientLabel}
                  </p>
                  <p className="mt-1 text-xs text-slate-400" title={new Date(comm.sent_at).toLocaleString()}>
                    {relativeTime(comm.sent_at)} · {new Date(comm.sent_at).toLocaleTimeString()}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-300">{comm.message}</p>
                  {comm.type === 'email' && comm.guest_id ? (
                    <button
                      type="button"
                      onClick={() => resendEmail(comm)}
                      disabled={resendingId === comm.id}
                      className="mt-3 min-h-[44px] rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                    >
                      {resendingId === comm.id ? 'Resending…' : 'Resend'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title={
                        comm.type === 'email'
                          ? 'Original recipient unknown — cannot resend'
                          : 'SMS resend coming soon'
                      }
                      className="mt-3 min-h-[44px] rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 opacity-50 cursor-not-allowed"
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
      </div>
    </>
  );
}
