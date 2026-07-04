'use client';

import type { PhaseName } from '@/lib/supabase';
import type { EmailTemplateKey } from '@/lib/email/renderTemplate';
import { EMAIL_TEMPLATE_TITLES, PHASE_LABELS } from '@/lib/email/templateInfo';

export type EmailPreview = {
  phase: PhaseName;
  total: number;
  alreadyEmailed: number;
  notYetEmailed: number;
};

export default function EmailConfirmModal({
  title,
  templateKey,
  preview,
  sending,
  onSendAll,
  onSendNotYetEmailed,
  onCancel,
}: {
  title: string;
  templateKey: EmailTemplateKey | null;
  preview: EmailPreview;
  sending: boolean;
  onSendAll: () => void;
  onSendNotYetEmailed: () => void;
  onCancel: () => void;
}) {
  const phaseLabel = PHASE_LABELS[preview.phase] ?? preview.phase;
  const templateLabel = templateKey ? EMAIL_TEMPLATE_TITLES[templateKey] ?? templateKey : 'your custom message';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-white/10 bg-admin-ink p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-admin-sand">Confirm send</p>
        <h2 className="mt-2 text-2xl font-semibold text-admin-bone">
          Send &ldquo;{templateLabel}&rdquo; to {title}
        </h2>
        <p className="mt-3 text-sm text-admin-bone/70">
          {preview.total} guest{preview.total !== 1 ? 's' : ''}, {preview.alreadyEmailed} already emailed for{' '}
          {phaseLabel}.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={onSendAll}
            disabled={sending}
            className="rounded-2xl bg-admin-green px-4 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-50"
          >
            Send to all ({preview.total})
          </button>
          <button
            type="button"
            onClick={onSendNotYetEmailed}
            disabled={sending || preview.notYetEmailed === 0}
            className="rounded-2xl border border-admin-sand/40 bg-admin-sand/15 px-4 py-3 text-sm font-semibold text-admin-sand transition hover:bg-admin-sand/25 disabled:opacity-50"
          >
            Send to not-yet-emailed only ({preview.notYetEmailed})
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
