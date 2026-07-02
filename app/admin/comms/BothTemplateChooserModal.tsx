'use client';

import { useMemo, useState, type ReactNode } from 'react';
import type { EmailTemplateRow, SmsTemplateRow } from './templates/page';
import { EMAIL_TEMPLATE_TITLES } from '@/lib/email/templateInfo';
import type { EmailTemplateKey } from '@/lib/email/renderTemplate';

// "Both" needs a template picked for EACH channel before it can send — unlike the
// single-channel chooser, there's no single "Continue" until both selections resolve
// to an active template.
export default function BothTemplateChooserModal({
  emailTemplates,
  smsTemplates,
  defaultEmailKey,
  defaultSmsKey,
  heading,
  recipientSummary,
  onCancel,
  onConfirm,
  confirming = false,
}: {
  emailTemplates: EmailTemplateRow[];
  smsTemplates: SmsTemplateRow[];
  defaultEmailKey: EmailTemplateKey | null;
  defaultSmsKey: EmailTemplateKey | null;
  heading: string;
  recipientSummary: ReactNode;
  onCancel: () => void;
  onConfirm: (emailKey: EmailTemplateKey, smsKey: EmailTemplateKey) => void;
  confirming?: boolean;
}) {
  const activeEmailTemplates = useMemo(() => emailTemplates.filter((t) => t.is_active), [emailTemplates]);
  const activeSmsTemplates = useMemo(() => smsTemplates.filter((t) => t.is_active), [smsTemplates]);

  const [selectedEmailKey, setSelectedEmailKey] = useState<string>(
    defaultEmailKey && activeEmailTemplates.some((t) => t.key === defaultEmailKey)
      ? defaultEmailKey
      : activeEmailTemplates[0]?.key ?? ''
  );
  const [selectedSmsKey, setSelectedSmsKey] = useState<string>(
    defaultSmsKey && activeSmsTemplates.some((t) => t.key === defaultSmsKey)
      ? defaultSmsKey
      : activeSmsTemplates[0]?.key ?? ''
  );

  const selectedEmail = activeEmailTemplates.find((t) => t.key === selectedEmailKey);
  const selectedSms = activeSmsTemplates.find((t) => t.key === selectedSmsKey);
  const canContinue = !!selectedEmail && !!selectedSms;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-white/10 bg-admin-ink p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-admin-sand">Choose templates</p>
        <h2 className="mt-2 text-2xl font-semibold text-admin-bone">{heading}</h2>
        <div className="mt-3 text-sm text-admin-bone/60">{recipientSummary}</div>

        <div className="mt-6">
          <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-sand" htmlFor="chooser-email-template">
            Email template
          </label>
          {activeEmailTemplates.length === 0 ? (
            <div className="rounded-2xl border border-admin-warning/30 bg-admin-warning-bg px-4 py-3 text-sm text-admin-warning">
              No active email templates. Activate one on the Templates page first.
            </div>
          ) : (
            <select
              id="chooser-email-template"
              value={selectedEmailKey}
              onChange={(e) => setSelectedEmailKey(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-admin-bone outline-none transition focus:border-admin-sand"
            >
              {activeEmailTemplates.map((t) => (
                <option key={t.id} value={t.key}>
                  {EMAIL_TEMPLATE_TITLES[t.key as EmailTemplateKey] ?? t.key}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-violet" htmlFor="chooser-sms-template">
            SMS template
          </label>
          {activeSmsTemplates.length === 0 ? (
            <div className="rounded-2xl border border-admin-warning/30 bg-admin-warning-bg px-4 py-3 text-sm text-admin-warning">
              No active SMS templates. Activate one on the Templates page first.
            </div>
          ) : (
            <select
              id="chooser-sms-template"
              value={selectedSmsKey}
              onChange={(e) => setSelectedSmsKey(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-admin-bone outline-none transition focus:border-admin-violet"
            >
              {activeSmsTemplates.map((t) => (
                <option key={t.id} value={t.key}>
                  {EMAIL_TEMPLATE_TITLES[t.key as EmailTemplateKey] ?? t.key}
                </option>
              ))}
            </select>
          )}
        </div>

        <p className="mt-4 text-xs text-admin-bone/50">
          Templates are edited on the{' '}
          <a href="/admin/comms/templates" className="underline transition hover:text-admin-bone/80">
            Templates page
          </a>
          .
        </p>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-admin-bone transition hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              selectedEmail &&
              selectedSms &&
              onConfirm(selectedEmail.key as EmailTemplateKey, selectedSms.key as EmailTemplateKey)
            }
            disabled={confirming || !canContinue}
            className="flex-1 rounded-2xl bg-admin-green px-4 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-50"
          >
            {confirming ? 'Checking…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
