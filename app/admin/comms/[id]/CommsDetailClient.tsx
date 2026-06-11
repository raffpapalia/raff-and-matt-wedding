'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DetailGuest, DetailComm } from './page';
import type { TemplateKey } from '../templates/page';

// --- Helpers ---

function resolveMergeTags(
  template: string,
  firstName: string,
  slug: string,
  weddingDate: string,
  venueName: string
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return template
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{invite_link\}\}/g, `${siteUrl}/invite/${slug}`)
    .replace(/\{\{wedding_date\}\}/g, weddingDate)
    .replace(/\{\{venue\}\}/g, venueName);
}

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
  if (option === 'rsvp_reminder') {
    return templates.tmpl_sms_rsvp_reminder;
  }
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

// --- Modal ---

type ModalState = {
  type: 'sms' | 'email' | 'both';
  guestIds: string[] | null;
  initialMessage?: string;
};

function SendModal({
  modalState,
  guests,
  householdSlug,
  templates,
  weddingDate,
  venueName,
  onClose,
  onConfirm,
  sending,
}: {
  modalState: ModalState;
  guests: DetailGuest[];
  householdSlug: string;
  templates: Record<TemplateKey, string>;
  weddingDate: string;
  venueName: string;
  onClose: () => void;
  onConfirm: (message: string, guestIds?: string[]) => void;
  sending: boolean;
}) {
  const { type, guestIds, initialMessage } = modalState;

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption>('save_the_date');
  const [message, setMessage] = useState(
    initialMessage ?? getTemplateBody('save_the_date', type, templates)
  );
  const [emailSubject, setEmailSubject] = useState(
    type !== 'sms' ? getTemplateSubject('save_the_date', templates) : ''
  );

  const targetGuests = guestIds ? guests.filter((g) => guestIds.includes(g.id)) : guests;

  function isEligibleSms(g: DetailGuest) { return g.comms_sms && !!g.mobile; }
  function isEligibleEmail(g: DetailGuest) { return g.comms_email && !!g.email; }

  const eligibleCount = targetGuests.filter((g) => {
    if (type === 'sms') return isEligibleSms(g);
    if (type === 'email') return isEligibleEmail(g);
    return isEligibleSms(g) || isEligibleEmail(g);
  }).length;

  const firstEligible = targetGuests.find((g) =>
    type === 'email' ? isEligibleEmail(g) : isEligibleSms(g)
  ) ?? targetGuests[0];

  const previewResolved = firstEligible
    ? resolveMergeTags(message, firstEligible.first_name, householdSlug, weddingDate, venueName)
    : resolveMergeTags(message, 'Guest', householdSlug, weddingDate, venueName);

  const unresolvedWarning = hasUnresolvedTags(previewResolved);
  const availableTemplates = getAvailableTemplates(type);

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

        {/* Recipient list */}
        <div className="mt-4 divide-y divide-white/5 rounded-2xl border border-white/5 bg-slate-900/60">
          {targetGuests.map((guest) => {
            const smsOk = isEligibleSms(guest);
            const emailOk = isEligibleEmail(guest);
            const relevant = type === 'sms' ? smsOk : type === 'email' ? emailOk : smsOk || emailOk;
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
                      {smsOk
                        ? guest.mobile
                        : !guest.mobile
                        ? '— no mobile'
                        : '— SMS off'}
                    </div>
                  )}
                  {type !== 'sms' && (
                    <div>
                      {emailOk
                        ? guest.email
                        : !guest.email
                        ? '— no email'
                        : '— email off'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

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
            rows={5}
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
            onClick={() => onConfirm(message, guestIds ?? undefined)}
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

export default function CommsDetailClient({
  householdId,
  householdName: _householdName,
  householdSlug,
  guests,
  comms,
  templates,
  weddingDate,
  venueName,
}: {
  householdId: string;
  householdName: string;
  householdSlug: string;
  guests: DetailGuest[];
  comms: DetailComm[];
  templates: Record<TemplateKey, string>;
  weddingDate: string;
  venueName: string;
}) {
  const router = useRouter();
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);

  function openModal(
    type: 'sms' | 'email' | 'both',
    guestIds?: string[],
    initialMessage?: string
  ) {
    setModalState({ type, guestIds: guestIds ?? null, initialMessage });
    setSendError(null);
  }

  async function handleSend(message: string, guestIds?: string[]) {
    if (!modalState) return;
    setSending(true);
    setSendError(null);
    try {
      const body: Record<string, unknown> = {
        household_ids: [householdId],
        type: modalState.type,
        message,
      };
      if (guestIds?.length) body.guest_ids = guestIds;

      const res = await fetch('/admin/api/comms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setSendError(data.error ?? 'Failed');
        return;
      }
      setModalState(null);
      setSentAt(new Date().toLocaleTimeString());
      router.refresh();
    } catch {
      setSendError('Network error');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {modalState && (
        <SendModal
          modalState={modalState}
          guests={guests}
          householdSlug={householdSlug}
          templates={templates}
          weddingDate={weddingDate}
          venueName={venueName}
          onClose={() => setModalState(null)}
          onConfirm={handleSend}
          sending={sending}
        />
      )}

      {sentAt && (
        <div className="rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          Communication logged at {sentAt}.
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
                onClick={() => openModal('sms')}
                className="rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-sm text-violet-200 transition hover:bg-violet-400/20"
              >
                Send SMS
              </button>
              <button
                type="button"
                onClick={() => openModal('email')}
                className="rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-sm text-sky-200 transition hover:bg-sky-400/20"
              >
                Send Email
              </button>
              <button
                type="button"
                onClick={() => openModal('both')}
                className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
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

                  {/* Per-guest send buttons (Task 3) */}
                  {(guest.mobile && guest.comms_sms) || (guest.email && guest.comms_email) ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {guest.mobile && guest.comms_sms && (
                        <button
                          type="button"
                          onClick={() => openModal('sms', [guest.id])}
                          className="min-h-[44px] rounded-xl border border-violet-400/20 bg-violet-400/5 px-3 py-1 text-xs font-medium text-violet-300 transition hover:bg-violet-400/15"
                        >
                          SMS
                        </button>
                      )}
                      {guest.email && guest.comms_email && (
                        <button
                          type="button"
                          onClick={() => openModal('email', [guest.id])}
                          className="min-h-[44px] rounded-xl border border-sky-400/20 bg-sky-400/5 px-3 py-1 text-xs font-medium text-sky-300 transition hover:bg-sky-400/15"
                        >
                          Email
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
              {comms.map((comm) => (
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
                  <p className="mt-2 text-xs text-slate-400">{relativeTime(comm.sent_at)}</p>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-300">{comm.message}</p>
                  {/* Resend button (Task 7) */}
                  <button
                    type="button"
                    onClick={() => openModal(comm.type, undefined, comm.message)}
                    className="mt-3 min-h-[44px] rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/10"
                  >
                    Resend
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
