'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { EmailTemplateRow } from './page';
import { EMAIL_TEMPLATE_TITLES } from '@/lib/email/templateInfo';

type Draft = { subject: string; body: string; is_active: boolean };

const MERGE_TAGS: Array<{ tag: string; hint: string }> = [
  { tag: '{{first_name}}', hint: "Guest's first name" },
  { tag: '{{wedding_date}}', hint: 'Wedding date, formatted' },
  { tag: '{{venue}}', hint: 'Venue name' },
];

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  save_the_date: 'Sends automatically to every guest when you switch the wedding into the Save the Date phase.',
  invitation: 'Sends automatically to every guest when you switch the wedding into the Invitation phase.',
  rsvp_reminder: "Send manually, whenever you choose, to guests who haven't RSVPed yet.",
  rsvp_confirmation: 'Sends automatically the moment a guest submits their RSVP.',
  pre_wedding: 'Sends automatically to every guest when you switch the wedding into the Pre-wedding phase.',
  thank_you: 'Sends automatically to every guest when you switch the wedding into the Thank You phase.',
  link_recovery: 'Sends automatically whenever a guest requests their invitation link again.',
};

const PHASE_SECTIONS: Array<{ label: string; primaryKey: string; subKeys: string[] }> = [
  { label: 'Save the Date', primaryKey: 'save_the_date', subKeys: [] },
  { label: 'Invitation', primaryKey: 'invitation', subKeys: ['rsvp_reminder', 'rsvp_confirmation'] },
  { label: 'Pre-wedding', primaryKey: 'pre_wedding', subKeys: [] },
  { label: 'Thank You', primaryKey: 'thank_you', subKeys: [] },
];

const UTILITY_KEYS = ['link_recovery'];

const TEST_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isDirty(draft: Draft | undefined, saved: EmailTemplateRow | undefined) {
  if (!draft || !saved) return false;
  return draft.subject !== saved.subject || draft.body !== saved.body || draft.is_active !== saved.is_active;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-accent-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-green ${
        checked ? 'bg-accent-gold' : 'bg-cream/15'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-dark-green shadow transition ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function MergeTagChips() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(tag: string) {
    try {
      await navigator.clipboard.writeText(tag);
      setCopied(tag);
      setTimeout(() => setCopied((prev) => (prev === tag ? null : prev)), 1500);
    } catch {
      // Clipboard API unavailable — silently ignore, the tag is still visible to copy by hand.
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {MERGE_TAGS.map(({ tag, hint }) => (
        <button
          key={tag}
          type="button"
          onClick={() => copy(tag)}
          title={hint}
          className="rounded-full border border-accent-gold/30 bg-accent-gold/5 px-3 py-1 font-mono text-xs text-accent-gold outline-none transition hover:border-accent-gold hover:bg-accent-gold/15 focus-visible:ring-2 focus-visible:ring-accent-gold/60"
        >
          {copied === tag ? 'Copied!' : tag}
        </button>
      ))}
    </div>
  );
}

function usePreview(templateKey: string, subject: string, body: string) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoading(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/admin/api/comms/email-templates/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: templateKey, subject, body }),
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
  }, [templateKey, subject, body]);

  return { html, loading, error };
}

function PhaseSection({ label, primary, subs }: { label: string; primary: ReactNode; subs?: ReactNode[] }) {
  return (
    <section>
      <h2 className="mb-4 font-cinzel text-xs uppercase tracking-[0.35em] text-accent-gold/70">{label}</h2>
      <div className="space-y-4">
        {primary}
        {subs && subs.length > 0 && (
          <div className="ml-2 space-y-4 border-l border-accent-gold/20 pl-6 sm:ml-4">{subs}</div>
        )}
      </div>
    </section>
  );
}

function TemplateCard({
  template,
  draft,
  dirty,
  saving,
  savedFlash,
  error,
  onChange,
  onSave,
}: {
  template: EmailTemplateRow;
  draft: Draft;
  dirty: boolean;
  saving: boolean;
  savedFlash: boolean;
  error?: string;
  onChange: (patch: Partial<Draft>) => void;
  onSave: () => void;
}) {
  const info = {
    title: EMAIL_TEMPLATE_TITLES[template.key] ?? template.key,
    description: TEMPLATE_DESCRIPTIONS[template.key] ?? '',
  };
  const { html, loading, error: previewError } = usePreview(template.key, draft.subject, draft.body);

  const [testEmail, setTestEmail] = useState('');
  const [testStep, setTestStep] = useState<'idle' | 'confirm' | 'sending' | 'done' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);

  function handleSendTestClick() {
    if (!TEST_EMAIL_RE.test(testEmail.trim())) {
      setTestStep('error');
      setTestMessage('Enter a valid email address.');
      return;
    }
    setTestStep('confirm');
    setTestMessage(null);
  }

  async function handleConfirmTest() {
    setTestStep('sending');
    try {
      const res = await fetch('/admin/api/comms/email-templates/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: template.key, to: testEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to send test email');
      setTestStep('done');
      setTestMessage(`Test sent to ${testEmail.trim()}.`);
    } catch (err) {
      setTestStep('error');
      setTestMessage(err instanceof Error ? err.message : 'Failed to send test email');
    }
  }

  return (
    <div className="rounded-3xl border border-cream/10 bg-dark-green/60 p-6 shadow-lg shadow-black/20 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="font-cinzel text-xl text-cream">{info.title}</h3>
            {!draft.is_active && (
              <span className="rounded-full bg-cream/10 px-2.5 py-0.5 text-[11px] uppercase tracking-[0.2em] text-cream/50">
                Inactive
              </span>
            )}
          </div>
          <p className="mt-1 max-w-md font-dm-sans text-sm text-cream/60">{info.description}</p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.15em] text-cream/30">key: {template.key}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-dm-sans text-xs uppercase tracking-[0.2em] text-cream/50">
            {draft.is_active ? 'Active' : 'Inactive'}
          </span>
          <Toggle
            checked={draft.is_active}
            onChange={(value) => onChange({ is_active: value })}
            label={`Toggle ${info.title} active`}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label
              className="mb-2 block font-dm-sans text-xs uppercase tracking-[0.2em] text-cream/50"
              htmlFor={`subject-${template.id}`}
            >
              Subject
            </label>
            <input
              id={`subject-${template.id}`}
              value={draft.subject}
              onChange={(e) => onChange({ subject: e.target.value })}
              className="w-full rounded-2xl border border-cream/15 bg-black/20 px-4 py-3 font-dm-sans text-sm text-cream outline-none transition focus-visible:border-accent-gold focus-visible:ring-2 focus-visible:ring-accent-gold/40"
            />
          </div>
          <div>
            <label
              className="mb-2 block font-dm-sans text-xs uppercase tracking-[0.2em] text-cream/50"
              htmlFor={`body-${template.id}`}
            >
              Body
            </label>
            <textarea
              id={`body-${template.id}`}
              value={draft.body}
              onChange={(e) => onChange({ body: e.target.value })}
              rows={10}
              className="w-full resize-none rounded-2xl border border-cream/15 bg-black/20 px-4 py-3 font-dm-sans text-sm text-cream outline-none transition focus-visible:border-accent-gold focus-visible:ring-2 focus-visible:ring-accent-gold/40"
            />
          </div>
          <div>
            <p className="mb-2 font-dm-sans text-xs uppercase tracking-[0.2em] text-cream/50">Merge tags</p>
            <MergeTagChips />
            <p className="mt-2 font-dm-sans text-xs text-cream/40">
              The invite button is added automatically below the body — you don&apos;t need to add a link yourself.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onSave}
              disabled={!dirty || saving}
              className="rounded-2xl bg-accent-gold px-6 py-2.5 font-dm-sans text-sm font-semibold text-dark-green outline-none transition hover:bg-accent-gold/90 focus-visible:ring-2 focus-visible:ring-accent-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-green disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {dirty && !saving && (
              <span className="font-dm-sans text-xs uppercase tracking-[0.2em] text-brand-amber">Unsaved changes</span>
            )}
            {savedFlash && <span className="font-dm-sans text-xs uppercase tracking-[0.2em] text-emerald-300">Saved</span>}
            {error && <span className="font-dm-sans text-xs text-rose-300">{error}</span>}
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-2 font-dm-sans text-xs uppercase tracking-[0.2em] text-cream/50">
            Preview · sample guest &quot;Jane&quot;
            {loading && <span className="text-accent-gold/70">· updating…</span>}
          </p>
          <div className="overflow-hidden rounded-2xl border border-cream/10 bg-black/30">
            {previewError ? (
              <div className="p-6 font-dm-sans text-sm text-rose-300">{previewError}</div>
            ) : (
              <iframe
                title={`${info.title} preview`}
                srcDoc={html ?? ''}
                className="h-[420px] w-full sm:h-[560px]"
                sandbox=""
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-cream/10 bg-black/10 p-4 sm:p-5">
        <p className="mb-3 font-dm-sans text-xs uppercase tracking-[0.2em] text-cream/50">Send a test</p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => {
              setTestEmail(e.target.value);
              setTestStep('idle');
              setTestMessage(null);
            }}
            placeholder="you@example.com"
            aria-label="Test email address"
            className="min-w-[220px] flex-1 rounded-2xl border border-cream/15 bg-black/20 px-4 py-2.5 font-dm-sans text-sm text-cream outline-none transition focus-visible:border-accent-gold focus-visible:ring-2 focus-visible:ring-accent-gold/40"
          />
          <button
            type="button"
            onClick={handleSendTestClick}
            disabled={testStep === 'sending'}
            className="rounded-2xl border border-accent-gold/40 bg-accent-gold/10 px-4 py-2.5 font-dm-sans text-sm font-semibold text-accent-gold outline-none transition hover:bg-accent-gold/20 focus-visible:ring-2 focus-visible:ring-accent-gold/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send test
          </button>
          <button
            type="button"
            disabled
            title="SMS sending coming soon"
            className="cursor-not-allowed rounded-2xl border border-cream/10 bg-cream/5 px-4 py-2.5 font-dm-sans text-sm text-cream/40"
          >
            Send test SMS
          </button>
        </div>

        {dirty && (
          <p className="mt-2 font-dm-sans text-xs text-cream/40">
            Sends the last saved version — save your edits first to test them.
          </p>
        )}

        {testStep === 'confirm' && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-brand-amber/30 bg-brand-amber/5 px-4 py-3">
            <span className="font-dm-sans text-sm text-cream">
              Send the saved &quot;{info.title}&quot; email to {testEmail.trim()}?
            </span>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => setTestStep('idle')}
                className="rounded-xl border border-cream/15 px-3 py-1.5 font-dm-sans text-xs text-cream/80 transition hover:border-cream/30"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTest}
                className="rounded-xl bg-accent-gold px-3 py-1.5 font-dm-sans text-xs font-semibold text-dark-green transition hover:bg-accent-gold/90"
              >
                Confirm send
              </button>
            </div>
          </div>
        )}

        {testStep === 'sending' && <p className="mt-2 font-dm-sans text-xs text-accent-gold/80">Sending…</p>}
        {testStep === 'done' && <p className="mt-2 font-dm-sans text-xs text-emerald-300">{testMessage}</p>}
        {testStep === 'error' && <p className="mt-2 font-dm-sans text-xs text-rose-300">{testMessage}</p>}
      </div>
    </div>
  );
}

export default function TemplatesClient({
  templates,
  weddingDate,
  venueName,
}: {
  templates: EmailTemplateRow[];
  weddingDate: string;
  venueName: string;
}) {
  const [savedMap, setSavedMap] = useState<Record<string, EmailTemplateRow>>(() =>
    Object.fromEntries(templates.map((t) => [t.id, t]))
  );
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(templates.map((t) => [t.id, { subject: t.subject, body: t.body, is_active: t.is_active }]))
  );
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedFlashIds, setSavedFlashIds] = useState<Set<string>>(new Set());
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  const byKey = useMemo(() => Object.fromEntries(templates.map((t) => [t.key, t])), [templates]);

  const previewDate = useMemo(() => {
    try {
      return new Date(weddingDate + 'T00:00:00Z').toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return weddingDate;
    }
  }, [weddingDate]);

  const anyDirty = templates.some((t) => isDirty(drafts[t.id], savedMap[t.id]));

  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (anyDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [anyDirty]);

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function handleSave(id: string) {
    setSavingIds((prev) => new Set(prev).add(id));
    setErrorMap((prev) => ({ ...prev, [id]: '' }));
    try {
      const res = await fetch(`/admin/api/comms/email-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(drafts[id]),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to save');
      setSavedMap((prev) => ({ ...prev, [id]: data }));
      setSavedFlashIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setSavedFlashIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 2500);
    } catch (err) {
      setErrorMap((prev) => ({ ...prev, [id]: err instanceof Error ? err.message : 'Failed to save' }));
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function renderCard(key: string) {
    const template = byKey[key];
    if (!template) return null;
    const draft = drafts[template.id];
    return (
      <TemplateCard
        key={template.id}
        template={template}
        draft={draft}
        dirty={isDirty(draft, savedMap[template.id])}
        saving={savingIds.has(template.id)}
        savedFlash={savedFlashIds.has(template.id)}
        error={errorMap[template.id]}
        onChange={(patch) => updateDraft(template.id, patch)}
        onSave={() => handleSave(template.id)}
      />
    );
  }

  return (
    <div className="space-y-10">
      <div className="rounded-2xl border border-cream/10 bg-black/20 px-5 py-3 font-dm-sans text-xs text-cream/50">
        Merge tags resolve against your real settings — wedding date{' '}
        <span className="text-cream/80">{previewDate}</span> · venue <span className="text-cream/80">{venueName}</span>.
        The preview on each template shows a sample guest named &quot;Jane&quot;.
      </div>

      {anyDirty && (
        <div className="sticky top-4 z-10 rounded-2xl border border-brand-amber/40 bg-brand-amber/10 px-5 py-3 font-dm-sans text-sm text-cream backdrop-blur">
          You have unsaved changes. Save each template before leaving this page.
        </div>
      )}

      {PHASE_SECTIONS.map((section) => (
        <PhaseSection
          key={section.label}
          label={section.label}
          primary={renderCard(section.primaryKey)}
          subs={section.subKeys.map((key) => renderCard(key))}
        />
      ))}

      <PhaseSection label="Utility · Always available" primary={UTILITY_KEYS.map((key) => renderCard(key))} />
    </div>
  );
}
