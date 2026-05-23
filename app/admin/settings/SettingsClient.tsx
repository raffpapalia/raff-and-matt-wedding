'use client';

import { useState } from 'react';
import type { Settings } from '@/lib/supabase';

const INPUT_CLASS =
  'w-full rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white placeholder-slate-600 outline-none transition focus:border-emerald-400';

function Section({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
      <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">{label}</p>
      <h2 className="mt-1 mb-7 text-xl font-semibold text-white">{title}</h2>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-slate-400">{label}</p>
      {children}
    </div>
  );
}

export default function SettingsClient({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  }

  // ── Dietary options ──────────────────────────────────────────────────────────

  function addDietaryOption() {
    update('dietary_options', [...settings.dietary_options, '']);
  }

  function updateDietaryOption(i: number, value: string) {
    update('dietary_options', settings.dietary_options.map((o, idx) => (idx === i ? value : o)));
  }

  function removeDietaryOption(i: number) {
    update('dietary_options', settings.dietary_options.filter((_, idx) => idx !== i));
  }

  function handleDietaryDragStart(e: React.DragEvent, index: number) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }

  function handleDietaryDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDietaryDrop(e: React.DragEvent, toIndex: number) {
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData('text/plain'));
    if (fromIndex === toIndex) return;
    const reordered = Array.from(settings.dietary_options);
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    update('dietary_options', reordered);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const body = {
      wedding_date: settings.wedding_date,
      wedding_time: settings.wedding_time,
      venue_name: settings.venue_name,
      location: settings.location,
      couple_names: settings.couple_names,
      tagline: settings.tagline,
      invitation_footer: settings.invitation_footer,
      rsvp_cutoff_date: settings.rsvp_cutoff_date,
      dietary_options: settings.dietary_options.filter(o => o.trim()),
      default_plus_one_allowance: Number(settings.default_plus_one_allowance),
    };

    const res = await fetch('/admin/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSaveError(data.message || 'Failed to save settings.');
    } else {
      setSaveSuccess(true);
    }

    setSaving(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Wedding Details */}
      <Section label="Event info" title="Wedding Details">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Wedding date">
            <input
              type="date"
              value={settings.wedding_date}
              onChange={e => update('wedding_date', e.target.value)}
              className={INPUT_CLASS}
              style={{ colorScheme: 'dark' }}
            />
          </Field>
          <Field label="Wedding time">
            <input
              type="text"
              value={settings.wedding_time}
              onChange={e => update('wedding_time', e.target.value)}
              placeholder="6:00 PM"
              className={INPUT_CLASS}
            />
          </Field>
        </div>
        <Field label="Venue name">
          <input
            type="text"
            value={settings.venue_name}
            onChange={e => update('venue_name', e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Location">
          <input
            type="text"
            value={settings.location}
            onChange={e => update('location', e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Couple names">
          <input
            type="text"
            value={settings.couple_names}
            onChange={e => update('couple_names', e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>
      </Section>

      {/* Invite Page Content */}
      <Section label="Guest-facing copy" title="Invite Page Content">
        <Field label="Tagline">
          <input
            type="text"
            value={settings.tagline}
            onChange={e => update('tagline', e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Invitation footer text">
          <input
            type="text"
            value={settings.invitation_footer}
            onChange={e => update('invitation_footer', e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>
      </Section>

      {/* RSVP Settings */}
      <Section label="Form options" title="RSVP Settings">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="RSVP cutoff date">
            <input
              type="date"
              value={settings.rsvp_cutoff_date}
              onChange={e => update('rsvp_cutoff_date', e.target.value)}
              className={INPUT_CLASS}
              style={{ colorScheme: 'dark' }}
            />
          </Field>
          <Field label="Default plus-one allowance">
            <input
              type="number"
              min={0}
              max={5}
              value={settings.default_plus_one_allowance}
              onChange={e => update('default_plus_one_allowance', Number(e.target.value))}
              className="w-24 rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
            />
          </Field>
        </div>

        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.25em] text-slate-400">Dietary options</p>
          <p className="mb-4 text-xs text-slate-500">Drag to reorder. &ldquo;Other&rdquo; always shows a free-text field.</p>
          <div className="space-y-2 mb-3">
            {settings.dietary_options.map((opt, i) => (
              <div
                key={i}
                draggable
                onDragStart={e => handleDietaryDragStart(e, i)}
                onDragOver={handleDietaryDragOver}
                onDrop={e => handleDietaryDrop(e, i)}
                className="flex items-center gap-2"
              >
                <div className="cursor-move select-none px-1 text-lg leading-none text-slate-500">⠿</div>
                <input
                  type="text"
                  value={opt}
                  onChange={e => updateDietaryOption(i, e.target.value)}
                  className="flex-1 rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-2 text-sm text-white placeholder-slate-600 outline-none transition focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => removeDietaryOption(i)}
                  className="px-2 text-lg leading-none text-slate-500 transition hover:text-rose-400"
                  aria-label="Remove option"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addDietaryOption}
            className="text-sm text-emerald-400 transition hover:text-emerald-200"
          >
            + Add option
          </button>
        </div>
      </Section>

      {/* Feedback */}
      {saveError && (
        <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{saveError}</div>
      )}
      {saveSuccess && (
        <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Settings saved successfully.
        </div>
      )}

      {/* Save */}
      <div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-3xl bg-amber-300 px-8 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
