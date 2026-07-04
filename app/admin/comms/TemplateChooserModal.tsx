'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { EMAIL_TEMPLATE_TITLES } from '@/lib/email/templateInfo';
import type { EmailTemplateKey } from '@/lib/email/renderTemplate';

// Synthetic option value for "write a custom message" — never a real template key,
// so callers can branch on it before treating the selection as an EmailTemplateKey.
export const CUSTOM_MESSAGE_KEY = '__custom__';

// Shape shared by EmailTemplateRow and SmsTemplateRow — subject is optional so this
// modal works for both channels (SMS templates have no subject).
export type ChooserTemplate = {
  id: string;
  key: string;
  is_active: boolean;
  subject?: string | null;
  body: string;
};

// Matt picks WHICH template to send for a manual send — templates themselves are
// only ever edited on the Templates page, never free-typed here.
export default function TemplateChooserModal({
  templates,
  defaultKey,
  heading,
  recipientSummary,
  emptyMessage = 'No active email templates. Activate one on the Templates page first.',
  allowCustom = false,
  onCancel,
  onConfirm,
  confirming = false,
}: {
  templates: ChooserTemplate[];
  defaultKey: EmailTemplateKey | null;
  heading: string;
  recipientSummary: ReactNode;
  emptyMessage?: string;
  // Bulk sends (multiple households at once) don't support the customize step, so
  // they keep the original template-only chooser; the single-household comms detail
  // page opts into the "write a custom message" option.
  allowCustom?: boolean;
  onCancel: () => void;
  onConfirm: (key: EmailTemplateKey | typeof CUSTOM_MESSAGE_KEY) => void;
  confirming?: boolean;
}) {
  const activeTemplates = useMemo(() => templates.filter((t) => t.is_active), [templates]);
  const [selected, setSelected] = useState<string>(
    defaultKey && activeTemplates.some((t) => t.key === defaultKey)
      ? defaultKey
      : activeTemplates[0]?.key ?? (allowCustom ? CUSTOM_MESSAGE_KEY : '')
  );
  const isCustom = selected === CUSTOM_MESSAGE_KEY;
  const selectedTemplate = activeTemplates.find((t) => t.key === selected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-white/10 bg-admin-ink p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-admin-sand">Choose template</p>
        <h2 className="mt-2 text-2xl font-semibold text-admin-bone">{heading}</h2>
        <div className="mt-3 text-sm text-admin-bone/60">{recipientSummary}</div>

        {activeTemplates.length === 0 && (
          <div className="mt-6 rounded-2xl border border-admin-warning/30 bg-admin-warning-bg px-4 py-3 text-sm text-admin-warning">
            {emptyMessage}
          </div>
        )}

        <div className="mt-6">
          <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-bone/60" htmlFor="chooser-template">
            Template
          </label>
          <select
            id="chooser-template"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-admin-bone outline-none transition focus:border-admin-green"
          >
            {allowCustom && <option value={CUSTOM_MESSAGE_KEY}>✏️ Write a custom message</option>}
            {activeTemplates.map((t) => (
              <option key={t.id} value={t.key}>
                {EMAIL_TEMPLATE_TITLES[t.key as EmailTemplateKey] ?? t.key}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-admin-bone/50">
            Templates are edited on the{' '}
            <a href="/admin/comms/templates" className="underline transition hover:text-admin-bone/80">
              Templates page
            </a>
            {allowCustom ? <>. Either way, you&apos;ll get a chance to personalize the message before sending.</> : '.'}
          </p>
        </div>

        {selectedTemplate && (
          <div className="mt-4">
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-admin-bone/60">Preview</p>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-admin-bone/80">
              {selectedTemplate.subject && (
                <p className="font-medium text-admin-bone">{selectedTemplate.subject}</p>
              )}
              <p className="mt-2 whitespace-pre-wrap text-admin-bone/70">{selectedTemplate.body}</p>
            </div>
          </div>
        )}

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
            onClick={() => onConfirm((isCustom ? CUSTOM_MESSAGE_KEY : selectedTemplate?.key) as EmailTemplateKey | typeof CUSTOM_MESSAGE_KEY)}
            disabled={confirming || (!isCustom && !selectedTemplate)}
            className="flex-1 rounded-2xl bg-admin-green px-4 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-50"
          >
            {confirming ? 'Checking…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
