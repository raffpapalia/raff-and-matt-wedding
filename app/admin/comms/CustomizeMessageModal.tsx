'use client';

import { useEffect, useRef, useState } from 'react';
import type { EmailTemplateKey } from '@/lib/email/renderTemplate';
import { resolveMergeTags } from '@/lib/email/mergeTags';
import MergeTagChips from './MergeTagChips';

const EMAIL_MERGE_TAGS = [
  { tag: '{{first_name}}', hint: "Guest's first name" },
  { tag: '{{household_name}}', hint: 'Household name' },
  { tag: '{{wedding_date}}', hint: 'Wedding date, formatted' },
  { tag: '{{venue}}', hint: 'Venue name' },
  { tag: '{{cta_button}}', hint: 'Invite button — must be on its own line' },
];

const SMS_MERGE_TAGS = [{ tag: '{{first_name}}', hint: "Guest's first name" }];

function useEmailPreview(subject: string, body: string, baseKey?: EmailTemplateKey) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoading(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/admin/api/send-email/custom-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, body, baseKey }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Failed to render preview');
        setHtml(data.html);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render preview');
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [subject, body, baseKey]);

  return { html, loading, error };
}

export type CustomizeDraft = {
  channel: 'email' | 'sms';
  subject?: string;
  body: string;
  baseKey?: EmailTemplateKey;
};

export default function CustomizeMessageModal({
  title,
  draft,
  onCancel,
  onContinue,
}: {
  title: string;
  draft: CustomizeDraft;
  onCancel: () => void;
  onContinue: (content: { subject?: string; body: string }) => void;
}) {
  const [subject, setSubject] = useState(draft.subject ?? '');
  const [body, setBody] = useState(draft.body);

  const emailPreview = useEmailPreview(subject, body, draft.baseKey);
  const smsPreviewText = resolveMergeTags(body, { first_name: 'Jane' });

  const canContinue = draft.channel === 'email' ? subject.trim().length > 0 && body.trim().length > 0 : body.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/10 bg-admin-ink p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-admin-sand">Personalize this send</p>
        <h2 className="mt-2 text-2xl font-semibold text-admin-bone">{title}</h2>
        <p className="mt-2 text-sm text-admin-bone/60">
          These edits apply to this send only — nothing is saved back to your templates.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {draft.channel === 'email' && (
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-bone/60" htmlFor="custom-subject">
                  Subject
                </label>
                <input
                  id="custom-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-admin-bone outline-none transition focus:border-admin-green"
                />
              </div>
            )}
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-bone/60" htmlFor="custom-body">
                Message
              </label>
              <textarea
                id="custom-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-admin-bone outline-none transition focus:border-admin-green"
              />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.25em] text-admin-bone/60">Merge tags</p>
              <MergeTagChips tags={draft.channel === 'email' ? EMAIL_MERGE_TAGS : SMS_MERGE_TAGS} />
              {draft.channel === 'email' ? (
                <p className="mt-2 text-xs text-admin-bone/40">
                  The invite button renders wherever <code>{'{{cta_button}}'}</code> appears on its own line.
                </p>
              ) : (
                <p className="mt-2 text-xs text-admin-bone/40">Your invite link is appended automatically after sending.</p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-admin-bone/60">
              Preview · sample guest &quot;Jane&quot;
              {draft.channel === 'email' && emailPreview.loading && <span className="text-admin-green/70">· updating…</span>}
            </p>
            {draft.channel === 'email' ? (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/10">
                {emailPreview.error ? (
                  <div className="p-6 text-sm text-admin-persimmon">{emailPreview.error}</div>
                ) : (
                  <iframe
                    title="Email preview"
                    srcDoc={emailPreview.html ?? ''}
                    className="h-[50vh] min-h-[260px] w-full"
                    sandbox=""
                  />
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-admin-bone/80">
                <p className="whitespace-pre-wrap">{smsPreviewText || <span className="text-admin-bone/40">Nothing to preview yet.</span>}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-admin-bone transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onContinue(draft.channel === 'email' ? { subject, body } : { body })}
            disabled={!canContinue}
            className="flex-1 rounded-2xl bg-admin-green px-4 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
