'use client';

import { useState } from 'react';
import type { TemplateKey } from './page';

type Templates = Record<TemplateKey, string>;

const TEMPLATE_GROUPS: Array<{
  label: string;
  templates: Array<{ key: TemplateKey; label: string; multiline: boolean }>;
}> = [
  {
    label: 'Save the Date',
    templates: [
      { key: 'tmpl_sms_save_the_date', label: 'SMS', multiline: false },
      { key: 'tmpl_email_save_the_date_subject', label: 'Email subject', multiline: false },
      { key: 'tmpl_email_save_the_date_body', label: 'Email body', multiline: true },
    ],
  },
  {
    label: 'RSVP Reminder',
    templates: [{ key: 'tmpl_sms_rsvp_reminder', label: 'SMS', multiline: false }],
  },
  {
    label: 'RSVP Confirmation',
    templates: [
      { key: 'tmpl_sms_rsvp_confirmation', label: 'SMS', multiline: false },
      { key: 'tmpl_email_rsvp_confirmation_subject', label: 'Email subject', multiline: false },
      { key: 'tmpl_email_rsvp_confirmation_body', label: 'Email body', multiline: true },
    ],
  },
];

function renderPreview(
  template: string,
  firstName: string,
  inviteLink: string,
  weddingDate: string,
  venue: string
) {
  return template
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{invite_link\}\}/g, inviteLink)
    .replace(/\{\{wedding_date\}\}/g, weddingDate)
    .replace(/\{\{venue\}\}/g, venue);
}

export default function TemplatesClient({
  templates: initial,
  weddingDate,
  venueName,
}: {
  templates: Templates;
  weddingDate: string;
  venueName: string;
}) {
  const [templates, setTemplates] = useState<Templates>(initial);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewFirst, setPreviewFirst] = useState('Jane');

  const previewLink = 'https://yourwedding.com/invite/sample';
  const previewDate = (() => {
    try {
      return new Date(weddingDate + 'T00:00:00Z').toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return weddingDate;
    }
  })();

  function update(key: TemplateKey, value: string) {
    setTemplates((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/admin/api/comms/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templates),
      });
      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error ?? 'Failed to save');
      } else {
        setSaveSuccess(true);
      }
    } catch {
      setSaveError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Preview controls */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-emerald-200/70">Preview as</p>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-[0.25em] text-slate-400">First name</span>
            <input
              value={previewFirst}
              onChange={(e) => setPreviewFirst(e.target.value)}
              className="w-36 rounded-2xl border border-white/10 bg-slate-950/90 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
            />
          </label>
          <div className="text-sm text-slate-500">
            Wedding date: <span className="text-slate-300">{previewDate}</span>
            <span className="mx-3 text-slate-700">·</span>
            Venue: <span className="text-slate-300">{venueName}</span>
          </div>
        </div>
      </div>

      {/* Status messages */}
      {saveSuccess && (
        <div className="rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          Templates saved successfully.
        </div>
      )}
      {saveError && (
        <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{saveError}</div>
      )}

      {/* Template groups */}
      {TEMPLATE_GROUPS.map((group) => (
        <div
          key={group.label}
          className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-slate-950/20 backdrop-blur-xl"
        >
          <p className="mb-6 text-sm uppercase tracking-[0.3em] text-emerald-200/70">{group.label}</p>
          <div className="space-y-10">
            {group.templates.map(({ key, label, multiline }) => (
              <div key={key} className="grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.25em] text-slate-400">{label}</p>
                  {multiline ? (
                    <textarea
                      value={templates[key]}
                      onChange={(e) => update(key, e.target.value)}
                      rows={6}
                      className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                    />
                  ) : (
                    <input
                      value={templates[key]}
                      onChange={(e) => update(key, e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                    />
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    {'{{first_name}}'} · {'{{invite_link}}'} · {'{{wedding_date}}'} · {'{{venue}}'}
                  </p>
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.25em] text-slate-400">Preview</p>
                  <div className="min-h-[52px] rounded-2xl border border-white/5 bg-slate-900/60 px-4 py-3 text-sm text-slate-200 whitespace-pre-wrap">
                    {renderPreview(
                      templates[key],
                      previewFirst,
                      previewLink,
                      previewDate,
                      venueName
                    ) || <span className="italic text-slate-500">Empty template</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Save button */}
      <div className="flex justify-end pb-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-2xl bg-amber-300 px-8 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save templates'}
        </button>
      </div>
    </div>
  );
}
