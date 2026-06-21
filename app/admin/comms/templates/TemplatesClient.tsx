'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { EmailTemplateRow, SmsTemplateRow } from './page';
import { EMAIL_TEMPLATE_TITLES } from '@/lib/email/templateInfo';
import { resolveMergeTags } from '@/lib/email/mergeTags';

type Draft = { subject: string; body: string; is_active: boolean };
type SmsDraft = { body: string; is_active: boolean };

const MERGE_TAGS: Array<{ tag: string; hint: string }> = [
  { tag: '{{first_name}}', hint: "Guest's first name" },
  { tag: '{{wedding_date}}', hint: 'Wedding date, formatted' },
  { tag: '{{venue}}', hint: 'Venue name' },
];

const SMS_MERGE_TAGS: Array<{ tag: string; hint: string }> = [
  { tag: '{{first_name}}', hint: "Guest's first name" },
];

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  save_the_date: 'Sends automatically to every guest when you switch the wedding into the Save the Date phase.',
  invitation: 'Sends automatically to every guest when you switch the wedding into the Invitation phase.',
  rsvp_reminder: "Send manually, whenever you choose, to guests who haven't RSVPed yet.",
  rsvp_confirmation: "Sends automatically to a household's eligible guests the moment they submit their first RSVP.",
  rsvp_updated: "Sends automatically to a household's eligible guests when they re-submit an RSVP that was already on file.",
  pre_wedding: 'Sends automatically to every guest when you switch the wedding into the Pre-wedding phase.',
  thank_you: 'Sends automatically to every guest when you switch the wedding into the Thank You phase.',
  link_recovery: 'Sends automatically whenever a guest requests their invitation link again.',
};

type TemplateGroup = { label: string; key: string };
type PhaseTab = { id: string; label: string; groups: TemplateGroup[] };

const PHASE_TABS: PhaseTab[] = [
  { id: 'save_the_date', label: 'Save the Date', groups: [{ label: 'Save the Date', key: 'save_the_date' }] },
  {
    id: 'invitation',
    label: 'Invitation',
    groups: [
      { label: 'Invitation', key: 'invitation' },
      { label: 'RSVP Reminder', key: 'rsvp_reminder' },
      { label: 'RSVP Confirmation', key: 'rsvp_confirmation' },
      { label: 'RSVP Updated', key: 'rsvp_updated' },
    ],
  },
  { id: 'pre_wedding', label: 'Pre-wedding', groups: [{ label: 'Pre-wedding', key: 'pre_wedding' }] },
  { id: 'thank_you', label: 'Thank You', groups: [{ label: 'Thank You', key: 'thank_you' }] },
  { id: 'utility', label: 'Utility', groups: [{ label: 'Lost Invitation Link', key: 'link_recovery' }] },
];

const TEST_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sample link shown in the SMS preview only — never sent. The real test-send route
// injects a real household's short link so the actual test message works end to end.
const SMS_SAMPLE_SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mattandraff.com';
const SMS_SAMPLE_SHORT_LINK = `${SMS_SAMPLE_SITE_BASE}/i/A7B2C`;

// Mirrors Twilio's own GSM-7 charset check: messages using only these characters get
// 160 chars/segment (153 once concatenated across multiple segments); anything else
// falls back to UCS-2, which is 70/67. Ported from the pre-redesign SMS composer.
const GSM7_CHARS = new Set(
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
);

function getSmsInfo(text: string) {
  const chars = text.length;
  const isGsm = [...text].every((c) => GSM7_CHARS.has(c));
  const singleLimit = isGsm ? 160 : 70;
  const concatLimit = isGsm ? 153 : 67;
  const segments = chars === 0 ? 0 : chars <= singleLimit ? 1 : Math.ceil(chars / concatLimit);
  return { chars, segments, isGsm, singleLimit };
}

function renderSmsPreviewText(body: string, firstName: string): string {
  return `${resolveMergeTags(body, { first_name: firstName })} ${SMS_SAMPLE_SHORT_LINK}`;
}

function isDirty(draft: Draft | undefined, saved: EmailTemplateRow | undefined) {
  if (!draft || !saved) return false;
  return draft.subject !== saved.subject || draft.body !== saved.body || draft.is_active !== saved.is_active;
}

function isSmsDirty(draft: SmsDraft | undefined, saved: SmsTemplateRow | undefined) {
  if (!draft || !saved) return false;
  return draft.body !== saved.body || draft.is_active !== saved.is_active;
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

function MergeTagChips({ tags }: { tags: Array<{ tag: string; hint: string }> }) {
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
      {tags.map(({ tag, hint }) => (
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

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 text-cream/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function AccordionItem({
  channel,
  title,
  isActive,
  dirty,
  isOpen,
  onToggle,
  children,
}: {
  channel: 'Email' | 'SMS';
  title: string;
  isActive: boolean;
  dirty: boolean;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const channelBadgeClass =
    channel === 'Email' ? 'bg-accent-gold/10 text-accent-gold' : 'bg-emerald-400/10 text-emerald-300';

  return (
    <div className="overflow-hidden rounded-3xl border border-cream/10 bg-dark-green/60 shadow-lg shadow-black/20">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full flex-wrap items-center justify-between gap-3 px-6 py-5 text-left outline-none transition hover:bg-cream/[0.03] focus-visible:ring-2 focus-visible:ring-accent-gold/60 sm:px-8"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] ${channelBadgeClass}`}
          >
            {channel}
          </span>
          <h3 className="font-cinzel text-lg text-cream sm:text-xl">{title}</h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.2em] ${
              isActive ? 'bg-emerald-400/10 text-emerald-300' : 'bg-cream/10 text-cream/50'
            }`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
          {dirty && (
            <span className="rounded-full bg-brand-amber/10 px-2.5 py-0.5 text-[11px] uppercase tracking-[0.2em] text-brand-amber">
              Unsaved
            </span>
          )}
        </div>
        <ChevronIcon open={isOpen} />
      </button>
      {isOpen && <div className="border-t border-cream/10 p-6 sm:p-8">{children}</div>}
    </div>
  );
}

function PhaseTabs({
  tabs,
  activeTab,
  currentPhase,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>;
  activeTab: string;
  currentPhase: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-cream/10">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const isLive = tab.id === currentPhase;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-3 font-dm-sans text-sm font-semibold uppercase tracking-[0.1em] outline-none transition focus-visible:ring-2 focus-visible:ring-accent-gold/60 ${
              isActive
                ? 'border-b-2 border-accent-gold text-accent-gold'
                : 'border-b-2 border-transparent text-cream/50 hover:text-cream/80'
            }`}
          >
            {tab.label}
            {isLive && (
              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-emerald-300">
                Live
              </span>
            )}
          </button>
        );
      })}
    </div>
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
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="max-w-md font-dm-sans text-sm text-cream/60">{info.description}</p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.15em] text-cream/30">key: {template.key}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-dm-sans text-xs uppercase tracking-[0.2em] text-cream/50">
            {draft.is_active ? 'Active' : 'Inactive'}
          </span>
          <Toggle
            checked={draft.is_active}
            onChange={(value) => onChange({ is_active: value })}
            label={`Toggle ${info.title} email active`}
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
            <MergeTagChips tags={MERGE_TAGS} />
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

function SmsTemplateCard({
  template,
  draft,
  dirty,
  saving,
  savedFlash,
  error,
  onChange,
  onSave,
}: {
  template: SmsTemplateRow;
  draft: SmsDraft;
  dirty: boolean;
  saving: boolean;
  savedFlash: boolean;
  error?: string;
  onChange: (patch: Partial<SmsDraft>) => void;
  onSave: () => void;
}) {
  const info = {
    title: EMAIL_TEMPLATE_TITLES[template.key] ?? template.key,
    description: TEMPLATE_DESCRIPTIONS[template.key] ?? '',
  };

  const previewText = useMemo(() => renderSmsPreviewText(draft.body, 'Jane'), [draft.body]);
  const smsInfo = useMemo(() => getSmsInfo(previewText), [previewText]);

  const [testMobile, setTestMobile] = useState('');
  const [testStep, setTestStep] = useState<'idle' | 'confirm' | 'sending' | 'done' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);

  function handleSendTestClick() {
    if (!testMobile.trim()) {
      setTestStep('error');
      setTestMessage('Enter a mobile number.');
      return;
    }
    setTestStep('confirm');
    setTestMessage(null);
  }

  async function handleConfirmTest() {
    setTestStep('sending');
    try {
      const res = await fetch('/admin/api/comms/sms-templates/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: template.key, to: testMobile.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to send test SMS');
      setTestStep('done');
      setTestMessage(`Test sent to ${data.to ?? testMobile.trim()}.`);
    } catch (err) {
      setTestStep('error');
      setTestMessage(err instanceof Error ? err.message : 'Failed to send test SMS');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="max-w-md font-dm-sans text-sm text-cream/60">{info.description}</p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.15em] text-cream/30">key: {template.key}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-dm-sans text-xs uppercase tracking-[0.2em] text-cream/50">
            {draft.is_active ? 'Active' : 'Inactive'}
          </span>
          <Toggle
            checked={draft.is_active}
            onChange={(value) => onChange({ is_active: value })}
            label={`Toggle ${info.title} SMS active`}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label
              className="mb-2 block font-dm-sans text-xs uppercase tracking-[0.2em] text-cream/50"
              htmlFor={`sms-body-${template.id}`}
            >
              Message
            </label>
            <textarea
              id={`sms-body-${template.id}`}
              value={draft.body}
              onChange={(e) => onChange({ body: e.target.value })}
              rows={5}
              className="w-full resize-none rounded-2xl border border-cream/15 bg-black/20 px-4 py-3 font-dm-sans text-sm text-cream outline-none transition focus-visible:border-accent-gold focus-visible:ring-2 focus-visible:ring-accent-gold/40"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 font-dm-sans text-xs">
              <span className={smsInfo.segments > 1 ? 'font-semibold text-rose-300' : 'text-cream/50'}>
                {smsInfo.chars} characters (incl. name + link) · {smsInfo.segments || 1} segment
                {smsInfo.segments === 1 ? '' : 's'}
              </span>
              {smsInfo.segments > 1 && (
                <span className="rounded-full bg-rose-400/10 px-2.5 py-0.5 text-[11px] uppercase tracking-[0.15em] text-rose-300">
                  2nd segment — doubles cost
                </span>
              )}
              {!smsInfo.isGsm && <span className="text-cream/40">Contains non-GSM characters — lower per-segment limit.</span>}
            </div>
          </div>
          <div>
            <p className="mb-2 font-dm-sans text-xs uppercase tracking-[0.2em] text-cream/50">Merge tags</p>
            <MergeTagChips tags={SMS_MERGE_TAGS} />
            <p className="mt-2 font-dm-sans text-xs text-cream/40">
              The short invite link is added automatically at the end — you don&apos;t need to type it. Plain text
              only, no formatting.
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
          <p className="mb-2 font-dm-sans text-xs uppercase tracking-[0.2em] text-cream/50">
            Preview · sample guest &quot;Jane&quot;
          </p>
          <div className="rounded-2xl border border-cream/10 bg-black/30 p-5">
            <div className="mx-auto max-w-xs rounded-2xl rounded-bl-sm bg-cream/95 px-4 py-3 font-dm-sans text-sm leading-relaxed text-dark-green shadow">
              {previewText}
            </div>
            <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.15em] text-cream/30">
              from Matt &amp; Raff
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-cream/10 bg-black/10 p-4 sm:p-5">
        <p className="mb-3 font-dm-sans text-xs uppercase tracking-[0.2em] text-cream/50">Send a test</p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="tel"
            value={testMobile}
            onChange={(e) => {
              setTestMobile(e.target.value);
              setTestStep('idle');
              setTestMessage(null);
            }}
            placeholder="04xx xxx xxx"
            aria-label="Test mobile number"
            className="min-w-[220px] flex-1 rounded-2xl border border-cream/15 bg-black/20 px-4 py-2.5 font-dm-sans text-sm text-cream outline-none transition focus-visible:border-accent-gold focus-visible:ring-2 focus-visible:ring-accent-gold/40"
          />
          <button
            type="button"
            onClick={handleSendTestClick}
            disabled={testStep === 'sending'}
            className="rounded-2xl border border-accent-gold/40 bg-accent-gold/10 px-4 py-2.5 font-dm-sans text-sm font-semibold text-accent-gold outline-none transition hover:bg-accent-gold/20 focus-visible:ring-2 focus-visible:ring-accent-gold/60 disabled:cursor-not-allowed disabled:opacity-50"
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
              Send the saved &quot;{info.title}&quot; SMS to {testMobile.trim()}?
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
  emailTemplates,
  smsTemplates,
  weddingDate,
  venueName,
  currentPhase,
}: {
  emailTemplates: EmailTemplateRow[];
  smsTemplates: SmsTemplateRow[];
  weddingDate: string;
  venueName: string;
  currentPhase: string;
}) {
  const [savedMap, setSavedMap] = useState<Record<string, EmailTemplateRow>>(() =>
    Object.fromEntries(emailTemplates.map((t) => [t.id, t]))
  );
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(emailTemplates.map((t) => [t.id, { subject: t.subject, body: t.body, is_active: t.is_active }]))
  );
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedFlashIds, setSavedFlashIds] = useState<Set<string>>(new Set());
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  const [smsSavedMap, setSmsSavedMap] = useState<Record<string, SmsTemplateRow>>(() =>
    Object.fromEntries(smsTemplates.map((t) => [t.id, t]))
  );
  const [smsDrafts, setSmsDrafts] = useState<Record<string, SmsDraft>>(() =>
    Object.fromEntries(smsTemplates.map((t) => [t.id, { body: t.body, is_active: t.is_active }]))
  );
  const [smsSavingIds, setSmsSavingIds] = useState<Set<string>>(new Set());
  const [smsSavedFlashIds, setSmsSavedFlashIds] = useState<Set<string>>(new Set());
  const [smsErrorMap, setSmsErrorMap] = useState<Record<string, string>>({});

  const byKey = useMemo(() => Object.fromEntries(emailTemplates.map((t) => [t.key, t])), [emailTemplates]);
  const smsByKey = useMemo(() => Object.fromEntries(smsTemplates.map((t) => [t.key, t])), [smsTemplates]);

  const [activeTab, setActiveTab] = useState<string>(() =>
    PHASE_TABS.some((tab) => tab.id === currentPhase) ? currentPhase : PHASE_TABS[0].id
  );
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  function isSectionDirty(sectionKey: string | null) {
    if (!sectionKey) return false;
    const [key, channel] = sectionKey.split(':');
    if (channel === 'email') {
      const t = byKey[key];
      return t ? isDirty(drafts[t.id], savedMap[t.id]) : false;
    }
    const t = smsByKey[key];
    return t ? isSmsDirty(smsDrafts[t.id], smsSavedMap[t.id]) : false;
  }

  function guardedSwitch(action: () => void) {
    if (
      isSectionDirty(expandedSection) &&
      !window.confirm('You have unsaved changes in this template. Continue without saving?')
    ) {
      return;
    }
    action();
  }

  function handleTabChange(tabId: string) {
    if (tabId === activeTab) return;
    guardedSwitch(() => {
      setActiveTab(tabId);
      setExpandedSection(null);
    });
  }

  function handleToggleSection(sectionKey: string) {
    guardedSwitch(() => {
      setExpandedSection((prev) => (prev === sectionKey ? null : sectionKey));
    });
  }

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

  const anyDirty =
    emailTemplates.some((t) => isDirty(drafts[t.id], savedMap[t.id])) ||
    smsTemplates.some((t) => isSmsDirty(smsDrafts[t.id], smsSavedMap[t.id]));

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

  function updateSmsDraft(id: string, patch: Partial<SmsDraft>) {
    setSmsDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
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

  async function handleSaveSms(id: string) {
    setSmsSavingIds((prev) => new Set(prev).add(id));
    setSmsErrorMap((prev) => ({ ...prev, [id]: '' }));
    try {
      const res = await fetch(`/admin/api/comms/sms-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smsDrafts[id]),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to save');
      setSmsSavedMap((prev) => ({ ...prev, [id]: data }));
      setSmsSavedFlashIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setSmsSavedFlashIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 2500);
    } catch (err) {
      setSmsErrorMap((prev) => ({ ...prev, [id]: err instanceof Error ? err.message : 'Failed to save' }));
    } finally {
      setSmsSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function renderGroup(group: TemplateGroup) {
    const emailTemplate = byKey[group.key];
    const smsTemplate = smsByKey[group.key];
    if (!emailTemplate && !smsTemplate) return null;

    return (
      <div key={group.key} className="space-y-3">
        {emailTemplate && (
          <AccordionItem
            channel="Email"
            title={group.label}
            isActive={drafts[emailTemplate.id]?.is_active ?? emailTemplate.is_active}
            dirty={isDirty(drafts[emailTemplate.id], savedMap[emailTemplate.id])}
            isOpen={expandedSection === `${group.key}:email`}
            onToggle={() => handleToggleSection(`${group.key}:email`)}
          >
            <TemplateCard
              template={emailTemplate}
              draft={drafts[emailTemplate.id]}
              dirty={isDirty(drafts[emailTemplate.id], savedMap[emailTemplate.id])}
              saving={savingIds.has(emailTemplate.id)}
              savedFlash={savedFlashIds.has(emailTemplate.id)}
              error={errorMap[emailTemplate.id]}
              onChange={(patch) => updateDraft(emailTemplate.id, patch)}
              onSave={() => handleSave(emailTemplate.id)}
            />
          </AccordionItem>
        )}
        {smsTemplate && (
          <AccordionItem
            channel="SMS"
            title={group.label}
            isActive={smsDrafts[smsTemplate.id]?.is_active ?? smsTemplate.is_active}
            dirty={isSmsDirty(smsDrafts[smsTemplate.id], smsSavedMap[smsTemplate.id])}
            isOpen={expandedSection === `${group.key}:sms`}
            onToggle={() => handleToggleSection(`${group.key}:sms`)}
          >
            <SmsTemplateCard
              template={smsTemplate}
              draft={smsDrafts[smsTemplate.id]}
              dirty={isSmsDirty(smsDrafts[smsTemplate.id], smsSavedMap[smsTemplate.id])}
              saving={smsSavingIds.has(smsTemplate.id)}
              savedFlash={smsSavedFlashIds.has(smsTemplate.id)}
              error={smsErrorMap[smsTemplate.id]}
              onChange={(patch) => updateSmsDraft(smsTemplate.id, patch)}
              onSave={() => handleSaveSms(smsTemplate.id)}
            />
          </AccordionItem>
        )}
      </div>
    );
  }

  const activePhaseTab = PHASE_TABS.find((tab) => tab.id === activeTab) ?? PHASE_TABS[0];

  return (
    <div className="space-y-6">
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

      <PhaseTabs
        tabs={PHASE_TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
        activeTab={activeTab}
        currentPhase={currentPhase}
        onChange={handleTabChange}
      />

      <div className="space-y-6">
        {activePhaseTab.groups.length > 1 ? (
          <>
            {renderGroup(activePhaseTab.groups[0])}
            <div className="ml-2 space-y-6 border-l border-accent-gold/20 pl-6 sm:ml-4">
              {activePhaseTab.groups.slice(1).map((group) => (
                <div key={group.key} className="space-y-3">
                  <h3 className="font-cinzel text-xs uppercase tracking-[0.35em] text-accent-gold/70">
                    {group.label}
                  </h3>
                  {renderGroup(group)}
                </div>
              ))}
            </div>
          </>
        ) : (
          activePhaseTab.groups.map((group) => renderGroup(group))
        )}
      </div>
    </div>
  );
}
