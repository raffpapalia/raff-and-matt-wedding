'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { EMAIL_TEMPLATE_TITLES } from '@/lib/email/templateInfo';
import type { EmailTemplateKey } from '@/lib/email/renderTemplate';

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
  onCancel,
  onConfirm,
  confirming = false,
}: {
  templates: ChooserTemplate[];
  defaultKey: EmailTemplateKey | null;
  heading: string;
  recipientSummary: ReactNode;
  emptyMessage?: string;
  onCancel: () => void;
  onConfirm: (key: EmailTemplateKey) => void;
  confirming?: boolean;
}) {
  const activeTemplates = useMemo(() => templates.filter((t) => t.is_active), [templates]);
  const [selected, setSelected] = useState<string>(
    defaultKey && activeTemplates.some((t) => t.key === defaultKey) ? defaultKey : activeTemplates[0]?.key ?? ''
  );
  const selectedTemplate = activeTemplates.find((t) => t.key === selected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-950 p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">Choose template</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">{heading}</h2>
        <div className="mt-3 text-sm text-slate-400">{recipientSummary}</div>

        {activeTemplates.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            {emptyMessage}
          </div>
        ) : (
          <>
            <div className="mt-6">
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400" htmlFor="chooser-template">
                Template
              </label>
              <select
                id="chooser-template"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
              >
                {activeTemplates.map((t) => (
                  <option key={t.id} value={t.key}>
                    {EMAIL_TEMPLATE_TITLES[t.key as EmailTemplateKey] ?? t.key}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Templates are edited on the{' '}
                <a href="/admin/comms/templates" className="underline transition hover:text-slate-300">
                  Templates page
                </a>
                .
              </p>
            </div>

            {selectedTemplate && (
              <div className="mt-4">
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-slate-400">Preview</p>
                <div className="rounded-2xl border border-white/5 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
                  {selectedTemplate.subject && (
                    <p className="font-medium text-white">{selectedTemplate.subject}</p>
                  )}
                  <p className="mt-2 whitespace-pre-wrap text-slate-300">{selectedTemplate.body}</p>
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => selectedTemplate && onConfirm(selectedTemplate.key as EmailTemplateKey)}
            disabled={confirming || !selectedTemplate}
            className="flex-1 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-50"
          >
            {confirming ? 'Checking…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
