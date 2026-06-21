'use client';

import { useState } from 'react';
import type { Settings, ScheduleItem, SectionOrderItem, PracticalitiesSection } from '@/lib/supabase';
import { DEFAULT_SECTION_ORDER } from '@/lib/supabase';
import PhotoUpload from '../components/PhotoUpload';

const PHASE_OPTIONS: { value: string; label: string }[] = [
  { value: 'invitation', label: 'Invitation' },
  { value: 'pre_wedding', label: 'Pre-wedding' },
];

const INPUT_CLASS =
  'w-full rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white placeholder-slate-600 outline-none transition focus:border-emerald-400';

const TEXTAREA_CLASS = `${INPUT_CLASS} resize-none`;

type TabKey = 'wedding' | 'save_the_date' | 'invitation' | 'thank_you' | 'links' | 'rsvp';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'wedding', label: 'The Wedding' },
  { key: 'save_the_date', label: 'Save the Date' },
  { key: 'invitation', label: 'The Invitation' },
  { key: 'thank_you', label: 'Thank You' },
  { key: 'links', label: 'Links' },
  { key: 'rsvp', label: 'RSVP' },
];

// Each practicality card's link button points at one of these existing flat settings keys,
// matched by card id. Mirrors PRACTICALITIES_LINK_KEY_BY_ID in InvitationPhase.tsx.
const PRACTICALITIES_LINK_FIELD_BY_ID: Record<string, 'accommodation_url' | 'photos_upload_url' | 'registry_url'> = {
  accommodation: 'accommodation_url',
  culture: 'photos_upload_url',
  registry: 'registry_url',
};

function Section({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
      <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">{label}</p>
      <h2 className="mt-1 mb-7 text-xl font-semibold text-white">{title}</h2>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function Field({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-slate-400">{label}</p>
      {helper && <p className="mb-2 text-xs text-slate-500">{helper}</p>}
      {children}
    </div>
  );
}

function SaveFeedback({ error, success }: { error: string | null; success: boolean }) {
  return (
    <>
      {error && (
        <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      )}
      {success && (
        <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Saved successfully.
        </div>
      )}
    </>
  );
}

export default function SettingsClient({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState<Settings>(initial);
  const [activeTab, setActiveTab] = useState<TabKey>('wedding');

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }));
    setTabSuccess(prev => ({ ...prev, [activeTab]: false }));
  }

  // ── Per-tab save ──────────────────────────────────────────────────────────────

  const [savingTab, setSavingTab] = useState<TabKey | null>(null);
  const [tabError, setTabError] = useState<Record<TabKey, string | null>>({
    wedding: null,
    save_the_date: null,
    invitation: null,
    thank_you: null,
    links: null,
    rsvp: null,
  });
  const [tabSuccess, setTabSuccess] = useState<Record<TabKey, boolean>>({
    wedding: false,
    save_the_date: false,
    invitation: false,
    thank_you: false,
    links: false,
    rsvp: false,
  });

  async function saveTab(tab: TabKey, body: Record<string, unknown>) {
    setSavingTab(tab);
    setTabError(prev => ({ ...prev, [tab]: null }));
    setTabSuccess(prev => ({ ...prev, [tab]: false }));

    const res = await fetch('/admin/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setTabError(prev => ({ ...prev, [tab]: data.message || 'Failed to save settings.' }));
    } else {
      setTabSuccess(prev => ({ ...prev, [tab]: true }));
    }

    setSavingTab(null);
  }

  function handleSaveWedding() {
    saveTab('wedding', {
      couple_names: settings.couple_names,
      wedding_date: settings.wedding_date,
      wedding_time: settings.wedding_time,
      venue_name: settings.venue_name,
      location: settings.location,
      tagline: settings.tagline,
      hashtag: settings.hashtag,
    });
  }

  function handleSaveSaveTheDate() {
    saveTab('save_the_date', {
      save_the_date_footer: settings.save_the_date_footer,
    });
  }

  function handleSaveInvitation() {
    saveTab('invitation', {
      dress_code_description: settings.dress_code_description,
      practicalities_sections: settings.practicalities_sections,
      accommodation_url: settings.accommodation_url,
      registry_url: settings.registry_url,
      photos_upload_url: settings.photos_upload_url,
    });
  }

  function handleSaveThankYou() {
    saveTab('thank_you', {
      thank_you_attended_message: settings.thank_you_attended_message,
      thank_you_not_attended_message: settings.thank_you_not_attended_message,
      wedding_photo_url: settings.wedding_photo_url,
    });
  }

  function handleSaveLinks() {
    saveTab('links', {
      google_photos_url: settings.google_photos_url,
      accommodation_url: settings.accommodation_url,
      registry_url: settings.registry_url,
      photos_upload_url: settings.photos_upload_url,
    });
  }

  function handleSaveRsvp() {
    saveTab('rsvp', {
      rsvp_cutoff_date: settings.rsvp_cutoff_date,
      default_plus_one_allowance: Number(settings.default_plus_one_allowance),
      dietary_options: settings.dietary_options.filter(o => o.trim()),
    });
  }

  // ── Practicalities cards ─────────────────────────────────────────────────────

  function updatePracticalityCard<K extends keyof PracticalitiesSection>(
    id: string,
    key: K,
    value: PracticalitiesSection[K]
  ) {
    update(
      'practicalities_sections',
      settings.practicalities_sections.map(card => (card.id === id ? { ...card, [key]: value } : card))
    );
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

  // ── On the Day schedule ──────────────────────────────────────────────────────

  const [schedule, setSchedule] = useState<ScheduleItem[]>(initial.wedding_schedule ?? []);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  function addScheduleItem() {
    setSchedule(prev => [...prev, { time: '', label: '' }]);
    setScheduleSuccess(false);
  }

  function updateScheduleItem(i: number, key: keyof ScheduleItem, value: string) {
    setSchedule(prev => prev.map((item, idx) => (idx === i ? { ...item, [key]: value } : item)));
    setScheduleSuccess(false);
  }

  function removeScheduleItem(i: number) {
    setSchedule(prev => prev.filter((_, idx) => idx !== i));
    setScheduleSuccess(false);
  }

  function moveScheduleItem(i: number, direction: -1 | 1) {
    setSchedule(prev => {
      const target = i + direction;
      if (target < 0 || target >= prev.length) return prev;
      const reordered = [...prev];
      [reordered[i], reordered[target]] = [reordered[target], reordered[i]];
      return reordered;
    });
    setScheduleSuccess(false);
  }

  async function handleSaveSchedule() {
    setScheduleSaving(true);
    setScheduleError(null);
    setScheduleSuccess(false);

    const res = await fetch('/admin/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wedding_schedule: schedule }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setScheduleError(data.message || 'Failed to save schedule.');
    } else {
      setScheduleSuccess(true);
    }

    setScheduleSaving(false);
  }

  // ── Section order ─────────────────────────────────────────────────────────────

  const initialSectionOrder = initial.section_order?.length ? initial.section_order : DEFAULT_SECTION_ORDER;
  const theDaySection = initialSectionOrder.find(s => s.id === 'the_day')
    ?? DEFAULT_SECTION_ORDER.find(s => s.id === 'the_day')!;

  const [sectionOrder, setSectionOrder] = useState<SectionOrderItem[]>(
    initialSectionOrder.filter(s => s.id !== 'the_day')
  );
  const [sectionOrderSaving, setSectionOrderSaving] = useState(false);
  const [sectionOrderError, setSectionOrderError] = useState<string | null>(null);
  const [sectionOrderSuccess, setSectionOrderSuccess] = useState(false);

  function moveSectionOrderItem(i: number, direction: -1 | 1) {
    setSectionOrder(prev => {
      const target = i + direction;
      if (target < 0 || target >= prev.length) return prev;
      const reordered = [...prev];
      [reordered[i], reordered[target]] = [reordered[target], reordered[i]];
      return reordered;
    });
    setSectionOrderSuccess(false);
  }

  function toggleSectionPhase(i: number, phase: string) {
    setSectionOrder(prev => prev.map((item, idx) => {
      if (idx !== i) return item;
      const visible_phases = item.visible_phases.includes(phase)
        ? item.visible_phases.filter(p => p !== phase)
        : [...item.visible_phases, phase];
      return { ...item, visible_phases };
    }));
    setSectionOrderSuccess(false);
  }

  async function handleSaveSectionOrder() {
    setSectionOrderSaving(true);
    setSectionOrderError(null);
    setSectionOrderSuccess(false);

    const payload = [
      theDaySection,
      ...sectionOrder.map((item, idx) => ({ ...item, order: idx + 2 })),
    ];

    const res = await fetch('/admin/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section_order: payload }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSectionOrderError(data.message || 'Failed to save section order.');
    } else {
      setSectionOrderSuccess(true);
    }

    setSectionOrderSaving(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Tab nav */}
      <div className="flex flex-wrap gap-2 rounded-3xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-2xl px-5 py-2.5 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-emerald-400/20 text-emerald-200'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1 — The Wedding */}
      {activeTab === 'wedding' && (
        <Section label="Event info" title="The Wedding">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Couple names">
              <input
                type="text"
                value={settings.couple_names}
                onChange={e => update('couple_names', e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Tagline">
              <input
                type="text"
                value={settings.tagline}
                onChange={e => update('tagline', e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
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
          <Field label="Wedding hashtag">
            <input
              type="text"
              value={settings.hashtag}
              onChange={e => update('hashtag', e.target.value)}
              placeholder="#mattraff2027"
              className={INPUT_CLASS}
            />
          </Field>

          <SaveFeedback error={tabError.wedding} success={tabSuccess.wedding} />
          <div>
            <button
              type="button"
              onClick={handleSaveWedding}
              disabled={savingTab === 'wedding'}
              className="rounded-3xl bg-amber-300 px-8 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
            >
              {savingTab === 'wedding' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Section>
      )}

      {/* Tab 2 — Save the Date */}
      {activeTab === 'save_the_date' && (
        <Section label="Guest-facing copy" title="Save the Date">
          <Field label="Footer text" helper="Shown at the bottom of the save the date page">
            <input
              type="text"
              value={settings.save_the_date_footer}
              onChange={e => update('save_the_date_footer', e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>

          <SaveFeedback error={tabError.save_the_date} success={tabSuccess.save_the_date} />
          <div>
            <button
              type="button"
              onClick={handleSaveSaveTheDate}
              disabled={savingTab === 'save_the_date'}
              className="rounded-3xl bg-amber-300 px-8 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
            >
              {savingTab === 'save_the_date' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Section>
      )}

      {/* Tab 3 — The Invitation */}
      {activeTab === 'invitation' && (
        <>
          <Section label="Guest-facing copy" title="The Invitation">
            <Field label="Dress code description">
              <textarea
                rows={4}
                value={settings.dress_code_description}
                onChange={e => update('dress_code_description', e.target.value)}
                className={TEXTAREA_CLASS}
              />
            </Field>

            <div>
              <p className="mb-1 text-xs uppercase tracking-[0.25em] text-slate-400">Practicalities cards</p>
              <p className="mb-4 text-xs text-slate-500">
                Controls the three cards in the &ldquo;The Practicalities&rdquo; section of the invitation.
              </p>
              <div className="space-y-3">
                {settings.practicalities_sections.map(card => {
                  const linkField = PRACTICALITIES_LINK_FIELD_BY_ID[card.id];
                  return (
                    <details
                      key={card.id}
                      className="group rounded-2xl border border-white/10 bg-slate-950/90 px-5 py-4"
                    >
                      <summary className="flex cursor-pointer items-center justify-between text-sm text-white">
                        <span>{card.title || card.id}</span>
                        <span className={`text-xs ${card.enabled ? 'text-emerald-300' : 'text-slate-500'}`}>
                          {card.enabled ? 'Enabled' : 'Hidden'}
                        </span>
                      </summary>

                      <div className="mt-5 space-y-5">
                        <Field label="Title">
                          <input
                            type="text"
                            value={card.title}
                            onChange={e => updatePracticalityCard(card.id, 'title', e.target.value)}
                            className={INPUT_CLASS}
                          />
                        </Field>
                        <Field label="Body">
                          <textarea
                            rows={3}
                            value={card.body}
                            onChange={e => updatePracticalityCard(card.id, 'body', e.target.value)}
                            className={TEXTAREA_CLASS}
                          />
                        </Field>
                        <Field label="Button label">
                          <input
                            type="text"
                            value={card.link_label ?? ''}
                            onChange={e =>
                              updatePracticalityCard(card.id, 'link_label', e.target.value.trim() ? e.target.value : null)
                            }
                            placeholder="Optional — leave blank to hide the button"
                            className={INPUT_CLASS}
                          />
                        </Field>
                        {linkField && (
                          <Field label="Button link URL">
                            <input
                              type="text"
                              value={settings[linkField]}
                              onChange={e => update(linkField, e.target.value)}
                              placeholder="https://..."
                              className={INPUT_CLASS}
                            />
                          </Field>
                        )}
                        <PhotoUpload
                          value={card.image_url || null}
                          onChange={url => updatePracticalityCard(card.id, 'image_url', url ?? '')}
                          aspectRatio={16 / 9}
                          label="Card photo"
                          uploadPathPrefix={`settings/practicalities-${card.id}`}
                        />
                        <label className="flex items-center gap-2 text-sm text-slate-300">
                          <input
                            type="checkbox"
                            checked={card.enabled}
                            onChange={e => updatePracticalityCard(card.id, 'enabled', e.target.checked)}
                            className="accent-emerald-400"
                          />
                          Enabled
                        </label>
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>

            <SaveFeedback error={tabError.invitation} success={tabSuccess.invitation} />
            <div>
              <button
                type="button"
                onClick={handleSaveInvitation}
                disabled={savingTab === 'invitation'}
                className="rounded-3xl bg-amber-300 px-8 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
              >
                {savingTab === 'invitation' ? 'Saving…' : 'Save'}
              </button>
            </div>
          </Section>

          {/* On the Day schedule */}
          <Section label="Invitation Page" title="On the Day Schedule">
            <p className="-mt-2 text-xs text-slate-500">
              These times appear in the &ldquo;On the Day&rdquo; section of the invitation. Leave empty to hide that part of the section.
            </p>
            <div className="space-y-2">
              {schedule.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.time}
                    onChange={e => updateScheduleItem(i, 'time', e.target.value)}
                    placeholder="3:00 PM"
                    className="w-28 rounded-2xl border border-white/10 bg-slate-950/90 px-3 py-2 text-sm text-white placeholder-slate-600 outline-none transition focus:border-emerald-400"
                  />
                  <input
                    type="text"
                    value={item.label}
                    onChange={e => updateScheduleItem(i, 'label', e.target.value)}
                    placeholder="Ceremony"
                    className="flex-1 rounded-2xl border border-white/10 bg-slate-950/90 px-3 py-2 text-sm text-white placeholder-slate-600 outline-none transition focus:border-emerald-400"
                  />
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => moveScheduleItem(i, -1)}
                      disabled={i === 0}
                      className="px-1 text-xs leading-none text-slate-500 transition hover:text-emerald-300 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveScheduleItem(i, 1)}
                      disabled={i === schedule.length - 1}
                      className="px-1 text-xs leading-none text-slate-500 transition hover:text-emerald-300 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      ▼
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeScheduleItem(i)}
                    className="px-2 text-lg leading-none text-slate-500 transition hover:text-rose-400"
                    aria-label="Remove item"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={addScheduleItem}
                className="text-sm text-emerald-400 transition hover:text-emerald-200"
              >
                + Add item
              </button>
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={scheduleSaving}
                className="rounded-3xl bg-amber-300 px-6 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
              >
                {scheduleSaving ? 'Saving…' : 'Save schedule'}
              </button>
            </div>
            {scheduleError && (
              <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{scheduleError}</div>
            )}
            {scheduleSuccess && (
              <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Schedule saved successfully.
              </div>
            )}
          </Section>

          {/* Section order */}
          <Section label="Invitation Page" title="Section Order">
            <p className="-mt-2 text-xs text-slate-500">
              Controls the order of sections on the invitation page and which phases each one appears on.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/50 px-4 py-3 text-sm text-slate-400">
                <span>The Day (always shown)</span>
              </div>
              {sectionOrder.map((section, i) => (
                <div key={section.id} className="rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-white">{section.label}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveSectionOrderItem(i, -1)}
                        disabled={i === 0}
                        className="px-1 text-xs leading-none text-slate-500 transition hover:text-emerald-300 disabled:opacity-30"
                        aria-label="Move up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSectionOrderItem(i, 1)}
                        disabled={i === sectionOrder.length - 1}
                        className="px-1 text-xs leading-none text-slate-500 transition hover:text-emerald-300 disabled:opacity-30"
                        aria-label="Move down"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    {PHASE_OPTIONS.map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 text-xs text-slate-400">
                        <input
                          type="checkbox"
                          checked={section.visible_phases.includes(opt.value)}
                          onChange={() => toggleSectionPhase(i, opt.value)}
                          className="accent-emerald-400"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <button
                type="button"
                onClick={handleSaveSectionOrder}
                disabled={sectionOrderSaving}
                className="rounded-3xl bg-amber-300 px-6 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
              >
                {sectionOrderSaving ? 'Saving…' : 'Save section order'}
              </button>
            </div>
            {sectionOrderError && (
              <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{sectionOrderError}</div>
            )}
            {sectionOrderSuccess && (
              <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Section order saved successfully.
              </div>
            )}
          </Section>
        </>
      )}

      {/* Tab 4 — Thank You */}
      {activeTab === 'thank_you' && (
        <Section label="Guest-facing copy" title="Thank You">
          <Field label="Attended message" helper="Shown to guests who attended">
            <textarea
              rows={3}
              value={settings.thank_you_attended_message}
              onChange={e => update('thank_you_attended_message', e.target.value)}
              className={TEXTAREA_CLASS}
            />
          </Field>
          <Field label="Not attended message" helper="Shown to guests who could not attend">
            <textarea
              rows={3}
              value={settings.thank_you_not_attended_message}
              onChange={e => update('thank_you_not_attended_message', e.target.value)}
              className={TEXTAREA_CLASS}
            />
          </Field>
          <PhotoUpload
            value={settings.wedding_photo_url || null}
            onChange={url => update('wedding_photo_url', url ?? '')}
            aspectRatio={16 / 9}
            label="Wedding day photo"
            uploadPathPrefix="settings/wedding-photo"
          />

          <SaveFeedback error={tabError.thank_you} success={tabSuccess.thank_you} />
          <div>
            <button
              type="button"
              onClick={handleSaveThankYou}
              disabled={savingTab === 'thank_you'}
              className="rounded-3xl bg-amber-300 px-8 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
            >
              {savingTab === 'thank_you' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Section>
      )}

      {/* Tab 5 — Links */}
      {activeTab === 'links' && (
        <Section label="Links & Details" title="Links">
          <Field label="Google Photos album link">
            <input
              type="text"
              value={settings.google_photos_url}
              onChange={e => update('google_photos_url', e.target.value)}
              placeholder="https://photos.google.com/..."
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="QT Hotel booking URL">
            <input
              type="text"
              value={settings.accommodation_url}
              onChange={e => update('accommodation_url', e.target.value)}
              placeholder="https://..."
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Registry link">
            <input
              type="text"
              value={settings.registry_url}
              onChange={e => update('registry_url', e.target.value)}
              placeholder="https://..."
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Guest photo upload link (Google Drive)">
            <input
              type="text"
              value={settings.photos_upload_url}
              onChange={e => update('photos_upload_url', e.target.value)}
              placeholder="https://..."
              className={INPUT_CLASS}
            />
          </Field>

          <SaveFeedback error={tabError.links} success={tabSuccess.links} />
          <div>
            <button
              type="button"
              onClick={handleSaveLinks}
              disabled={savingTab === 'links'}
              className="rounded-3xl bg-amber-300 px-8 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
            >
              {savingTab === 'links' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Section>
      )}

      {/* Tab 6 — RSVP */}
      {activeTab === 'rsvp' && (
        <Section label="Form options" title="RSVP">
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

          <SaveFeedback error={tabError.rsvp} success={tabSuccess.rsvp} />
          <div>
            <button
              type="button"
              onClick={handleSaveRsvp}
              disabled={savingTab === 'rsvp'}
              className="rounded-3xl bg-amber-300 px-8 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
            >
              {savingTab === 'rsvp' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Section>
      )}
    </div>
  );
}
