'use client';

import type { EmailTemplateKey } from '@/lib/email/renderTemplate';
import { EMAIL_TEMPLATE_TITLES } from '@/lib/email/templateInfo';

export type BothPreview = {
  emailCount: number;
  smsCount: number;
  totalGuests: number;
};

// No three-way "unsent only" option here — resend control is what the dedicated
// Email/SMS buttons are for. This is a single send-to-everyone-eligible confirm.
export default function BothConfirmModal({
  title,
  emailTemplateKey,
  smsTemplateKey,
  preview,
  sending,
  onSend,
  onCancel,
}: {
  title: string;
  emailTemplateKey: EmailTemplateKey;
  smsTemplateKey: EmailTemplateKey;
  preview: BothPreview;
  sending: boolean;
  onSend: () => void;
  onCancel: () => void;
}) {
  const emailLabel = EMAIL_TEMPLATE_TITLES[emailTemplateKey] ?? emailTemplateKey;
  const smsLabel = EMAIL_TEMPLATE_TITLES[smsTemplateKey] ?? smsTemplateKey;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-white/10 bg-admin-ink p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-admin-bone/60">Confirm send</p>
        <h2 className="mt-2 text-2xl font-semibold text-admin-bone">Send to {title}</h2>

        <div className="mt-4 space-y-1 text-sm text-admin-bone/70">
          <p>
            Email: <span className="text-admin-sand">&ldquo;{emailLabel}&rdquo;</span>
          </p>
          <p>
            SMS: <span className="text-admin-violet">&ldquo;{smsLabel}&rdquo;</span>
          </p>
        </div>

        <p className="mt-4 text-sm text-admin-bone/70">
          This will send <span className="font-semibold text-admin-sand">{preview.emailCount} email{preview.emailCount !== 1 ? 's' : ''}</span>{' '}
          and <span className="font-semibold text-admin-violet">{preview.smsCount} SMS</span> across{' '}
          <span className="font-semibold text-admin-bone">{preview.totalGuests} guest{preview.totalGuests !== 1 ? 's' : ''}</span>, based on
          each guest&apos;s own contact preferences.
        </p>
        <p className="mt-2 inline-block rounded-xl bg-admin-warning-bg px-3 py-1.5 text-xs text-admin-warning">SMS costs real money to send — double-check before confirming.</p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={onSend}
            disabled={sending}
            className="rounded-2xl bg-admin-green px-4 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-50"
          >
            {sending ? 'Sending…' : `Send (${preview.totalGuests})`}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={sending}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-admin-bone transition hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
