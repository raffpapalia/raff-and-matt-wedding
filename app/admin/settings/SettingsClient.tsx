'use client';

import { useState } from 'react';
import type { Settings, ScheduleItem, SectionOrderItem } from '@/lib/supabase';
import { DEFAULT_SECTION_ORDER } from '@/lib/supabase';
import PhotoUpload from '../components/PhotoUpload';
import CouplePhotoUpload from '../components/CouplePhotoUpload';
import ImmediatePhotoUpload from '../components/ImmediatePhotoUpload';

const PHASE_OPTIONS: { value: string; label: string }[] = [
  { value: 'invitation', label: 'Invitation' },
  { value: 'pre_wedding', label: 'Pre-wedding' },
];

const INPUT_CLASS =
  'w-full rounded-2xl border border-admin-sand/40 bg-white px-4 py-3 text-admin-ink placeholder-admin-ink/30 outline-none transition focus:border-admin-green';

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


function Section({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
      <p className="text-sm uppercase tracking-[0.3em] text-admin-green">{label}</p>
      <h2 className="mt-1 mb-7 text-xl font-semibold text-admin-ink">{title}</h2>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function Field({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-admin-ink/60">{label}</p>
      {helper && <p className="mb-2 text-xs text-admin-ink/50">{helper}</p>}
      {children}
    </div>
  );
}

function SaveFeedback({ error, success }: { error: string | null; success: boolean }) {
  return (
    <>
      {error && (
        <div className="rounded-2xl bg-admin-persimmon/10 px-4 py-3 text-sm text-admin-persimmon">{error}</div>
      )}
      {success && (
        <div className="rounded-2xl bg-admin-green/10 px-4 py-3 text-sm text-admin-green">
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
      contact_email: settings.contact_email,
    });
  }

  function handleSaveInvitation() {
    saveTab('invitation', {
      dress_code_heading: settings.dress_code_heading,
      dress_code_description: settings.dress_code_description,
      accommodation_url: settings.accommodation_url,
      registry_url: settings.registry_url,
      photos_upload_url: settings.photos_upload_url,
      story_heading: settings.story_heading,
      story_body: settings.story_body,
      band_quote: settings.band_quote,
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
    });
  }

  function handleSaveRsvp() {
    saveTab('rsvp', {
      rsvp_cutoff_date: settings.rsvp_cutoff_date,
      default_plus_one_allowance: Number(settings.default_plus_one_allowance),
      dietary_options: settings.dietary_options.filter(o => o.trim()),
    });
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
      <div className="flex flex-wrap gap-2 rounded-3xl border border-admin-sand/20 bg-white p-2">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-2xl px-5 py-2.5 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-admin-green/15 text-admin-green'
                : 'text-admin-ink/60 hover:bg-admin-bone/60 hover:text-admin-ink'
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
            <Field label="Couple names" helper="Shown as the headline on every page. Always 'Matt & Raff'.">
              <input
                type="text"
                value={settings.couple_names}
                onChange={e => update('couple_names', e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Tagline" helper="The italic line under your names on the invitation hero.">
              <input
                type="text"
                value={settings.tagline}
                onChange={e => update('tagline', e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Wedding date" helper="Drives the countdown and every date shown to guests.">
              <input
                type="date"
                value={settings.wedding_date}
                onChange={e => update('wedding_date', e.target.value)}
                className={INPUT_CLASS}
                style={{ colorScheme: 'light' }}
              />
            </Field>
            <Field label="Wedding time" helper="The ceremony start time shown to guests.">
              <input
                type="time"
                value={settings.wedding_time}
                onChange={e => update('wedding_time', e.target.value)}
                className={INPUT_CLASS}
                style={{ colorScheme: 'light' }}
              />
            </Field>
          </div>
          <Field label="Venue name" helper="Shown wherever the venue is named on guest-facing pages.">
            <input
              type="text"
              value={settings.venue_name}
              onChange={e => update('venue_name', e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Location" helper="The city or area shown under the venue name.">
            <input
              type="text"
              value={settings.location}
              onChange={e => update('location', e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Wedding hashtag" helper="Shown for guests to use when posting their own photos.">
            <input
              type="text"
              value={settings.hashtag}
              onChange={e => update('hashtag', e.target.value)}
              placeholder="#mattraff2027"
              className={INPUT_CLASS}
            />
          </Field>
          <Field
            label="Contact email"
            helper="Used for the 'Get in touch' button guests see once RSVPs are locked."
          >
            <input
              type="email"
              value={settings.contact_email}
              onChange={e => update('contact_email', e.target.value)}
              placeholder="you@example.com"
              className={INPUT_CLASS}
            />
          </Field>

          <SaveFeedback error={tabError.wedding} success={tabSuccess.wedding} />
          <div>
            <button
              type="button"
              onClick={handleSaveWedding}
              disabled={savingTab === 'wedding'}
              className="rounded-3xl bg-admin-green px-8 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-60"
            >
              {savingTab === 'wedding' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Section>
      )}

      {/* Tab 2 — Save the Date */}
      {activeTab === 'save_the_date' && (
        <Section label="Photos" title="Save the Date">
          <p className="-mt-2 text-xs text-admin-ink/50">Uploads and saves immediately.</p>

          <Field
            label="Couple Photo"
            helper="Shown on the save the date and invitation heroes. Crop ratio 3:4."
          >
            <CouplePhotoUpload
              currentUrl={settings.couple_photo_url}
              onSaved={url => update('couple_photo_url', url)}
            />
          </Field>
        </Section>
      )}

      {/* Tab 3 — The Invitation */}
      {activeTab === 'invitation' && (
        <>
          <Section label="Guest-facing copy" title="The Invitation">
            <Field label="Dress code heading" helper="The dress code's title, e.g. 'Elevated Cocktail'.">
              <input
                type="text"
                value={settings.dress_code_heading}
                onChange={e => update('dress_code_heading', e.target.value)}
                placeholder="Elevated Cocktail"
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Dress code description" helper="The paragraph explaining the dress code to guests.">
              <textarea
                rows={4}
                value={settings.dress_code_description}
                onChange={e => update('dress_code_description', e.target.value)}
                className={TEXTAREA_CLASS}
                style={{ resize: 'vertical', minHeight: '120px' }}
              />
            </Field>

            <Field label="Story heading" helper="Used in the 'How we got here' section (v4 design)">
              <input
                type="text"
                value={settings.story_heading}
                onChange={e => update('story_heading', e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Story body" helper="Used in the 'How we got here' section (v4 design)">
              <textarea
                rows={4}
                value={settings.story_body}
                onChange={e => update('story_body', e.target.value)}
                className={TEXTAREA_CLASS}
                style={{ resize: 'vertical', minHeight: '120px' }}
              />
            </Field>

            <Field label="Band quote" helper="Used in the full-bleed photo band section (v4 design)">
              <textarea
                rows={2}
                value={settings.band_quote}
                onChange={e => update('band_quote', e.target.value)}
                className={TEXTAREA_CLASS}
              />
            </Field>

            <Field label="Accommodation URL" helper="Where to stay — shown as the card button. Leave blank to hide the card.">
              <input
                type="text"
                value={settings.accommodation_url}
                onChange={e => update('accommodation_url', e.target.value)}
                placeholder="https://..."
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Photo upload URL" helper="Share photos link — shown as the card button. Leave blank to hide the card.">
              <input
                type="text"
                value={settings.photos_upload_url}
                onChange={e => update('photos_upload_url', e.target.value)}
                placeholder="https://..."
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Registry URL" helper="Registry link — shown as the card button. Leave blank to hide the card.">
              <input
                type="text"
                value={settings.registry_url}
                onChange={e => update('registry_url', e.target.value)}
                placeholder="https://..."
                className={INPUT_CLASS}
              />
            </Field>

            <Field
              label="Story Photo"
              helper="Used in the 'How we got here' section. Crop ratio 4:5. Uploads and saves immediately."
            >
              <ImmediatePhotoUpload
                settingsKey="story_photo_url"
                pathPrefix="settings/story-photo"
                aspectRatio={4 / 5}
                currentUrl={settings.story_photo_url}
                onSaved={url => update('story_photo_url', url)}
              />
            </Field>

            <Field
              label="Band Photo"
              helper="The full-bleed photo band. Crop ratio 16:9. Uploads and saves immediately."
            >
              <ImmediatePhotoUpload
                settingsKey="band_photo_url"
                pathPrefix="settings/band-photo"
                aspectRatio={16 / 9}
                currentUrl={settings.band_photo_url}
                onSaved={url => update('band_photo_url', url)}
              />
            </Field>

            <SaveFeedback error={tabError.invitation} success={tabSuccess.invitation} />
            <div>
              <button
                type="button"
                onClick={handleSaveInvitation}
                disabled={savingTab === 'invitation'}
                className="rounded-3xl bg-admin-green px-8 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-60"
              >
                {savingTab === 'invitation' ? 'Saving…' : 'Save'}
              </button>
            </div>
          </Section>

          {/* On the Day schedule */}
          <Section label="Invitation Page" title="On the Day Schedule">
            <p className="-mt-2 text-xs text-admin-ink/50">
              These times appear in the &ldquo;On the Day&rdquo; section of the invitation. Leave empty to hide that part of the section.
            </p>
            <div className="space-y-2">
              {schedule.map((item, i) => (
                <div key={i} className="space-y-2 rounded-2xl border border-admin-sand/30 bg-admin-bone/50 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.time}
                      onChange={e => updateScheduleItem(i, 'time', e.target.value)}
                      placeholder="3:00 PM"
                      className="w-28 rounded-2xl border border-admin-sand/40 bg-white px-3 py-2 text-sm text-admin-ink placeholder-admin-ink/30 outline-none transition focus:border-admin-green"
                    />
                    <input
                      type="text"
                      value={item.label}
                      onChange={e => updateScheduleItem(i, 'label', e.target.value)}
                      placeholder="Ceremony"
                      className="flex-1 rounded-2xl border border-admin-sand/40 bg-white px-3 py-2 text-sm text-admin-ink placeholder-admin-ink/30 outline-none transition focus:border-admin-green"
                    />
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => moveScheduleItem(i, -1)}
                        disabled={i === 0}
                        className="px-1 text-xs leading-none text-admin-ink/50 transition hover:text-admin-green disabled:opacity-30"
                        aria-label="Move up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveScheduleItem(i, 1)}
                        disabled={i === schedule.length - 1}
                        className="px-1 text-xs leading-none text-admin-ink/50 transition hover:text-admin-green disabled:opacity-30"
                        aria-label="Move down"
                      >
                        ▼
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeScheduleItem(i)}
                      className="px-2 text-lg leading-none text-admin-ink/50 transition hover:text-admin-persimmon"
                      aria-label="Remove item"
                    >
                      ×
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.location ?? ''}
                    onChange={e => updateScheduleItem(i, 'location', e.target.value)}
                    placeholder="e.g. QT Melbourne"
                    className="w-full rounded-2xl border border-admin-sand/40 bg-white px-3 py-2 text-sm text-admin-ink placeholder-admin-ink/30 outline-none transition focus:border-admin-green"
                  />
                  <textarea
                    rows={2}
                    value={item.description ?? ''}
                    onChange={e => updateScheduleItem(i, 'description', e.target.value)}
                    placeholder="Optional note for guests"
                    className="w-full resize-none rounded-2xl border border-admin-sand/40 bg-white px-3 py-2 text-sm text-admin-ink placeholder-admin-ink/30 outline-none transition focus:border-admin-green"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={addScheduleItem}
                className="text-sm text-admin-green transition hover:text-admin-green/70"
              >
                + Add item
              </button>
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={scheduleSaving}
                className="rounded-3xl bg-admin-green px-6 py-2 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-60"
              >
                {scheduleSaving ? 'Saving…' : 'Save schedule'}
              </button>
            </div>
            {scheduleError && (
              <div className="rounded-2xl bg-admin-persimmon/10 px-4 py-3 text-sm text-admin-persimmon">{scheduleError}</div>
            )}
            {scheduleSuccess && (
              <div className="rounded-2xl bg-admin-green/10 px-4 py-3 text-sm text-admin-green">
                Schedule saved successfully.
              </div>
            )}
          </Section>

          {/* Section order */}
          <Section label="Invitation Page" title="Section Order">
            <p className="-mt-2 text-xs text-admin-ink/50">
              The order below controls section order on the invitation page. Tick which pages each section
              appears on — untick to hide it from that page.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-2xl border border-admin-sand/20 bg-admin-bone/50 px-4 py-3 text-sm text-admin-ink/60">
                <span>The Day (always shown)</span>
              </div>
              {sectionOrder.map((section, i) => (
                <div key={section.id} className="rounded-2xl border border-admin-sand/30 bg-admin-bone/50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-admin-ink">{section.label}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveSectionOrderItem(i, -1)}
                        disabled={i === 0}
                        className="px-1 text-xs leading-none text-admin-ink/50 transition hover:text-admin-green disabled:opacity-30"
                        aria-label="Move up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSectionOrderItem(i, 1)}
                        disabled={i === sectionOrder.length - 1}
                        className="px-1 text-xs leading-none text-admin-ink/50 transition hover:text-admin-green disabled:opacity-30"
                        aria-label="Move down"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    {PHASE_OPTIONS.map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 text-xs text-admin-ink/60">
                        <input
                          type="checkbox"
                          checked={section.visible_phases.includes(opt.value)}
                          onChange={() => toggleSectionPhase(i, opt.value)}
                          className="accent-admin-green"
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
                className="rounded-3xl bg-admin-green px-6 py-2 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-60"
              >
                {sectionOrderSaving ? 'Saving…' : 'Save section order'}
              </button>
            </div>
            {sectionOrderError && (
              <div className="rounded-2xl bg-admin-persimmon/10 px-4 py-3 text-sm text-admin-persimmon">{sectionOrderError}</div>
            )}
            {sectionOrderSuccess && (
              <div className="rounded-2xl bg-admin-green/10 px-4 py-3 text-sm text-admin-green">
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
          <div>
            <p className="mb-2 text-xs text-admin-ink/50">The photo shown on the Thank You page guests see after RSVPing.</p>
            <PhotoUpload
              value={settings.wedding_photo_url || null}
              onChange={url => update('wedding_photo_url', url ?? '')}
              aspectRatio={16 / 9}
              label="Post-wedding photo (Thank You page)"
              uploadPathPrefix="settings/wedding-photo"
            />
          </div>

          <SaveFeedback error={tabError.thank_you} success={tabSuccess.thank_you} />
          <div>
            <button
              type="button"
              onClick={handleSaveThankYou}
              disabled={savingTab === 'thank_you'}
              className="rounded-3xl bg-admin-green px-8 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-60"
            >
              {savingTab === 'thank_you' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Section>
      )}

      {/* Tab 5 — Links */}
      {activeTab === 'links' && (
        <Section label="Standalone links" title="Links">
          <p className="-mt-2 text-xs text-admin-ink/50">
            Links that aren&rsquo;t tied to a specific page section. The accommodation, registry, and guest
            photo upload links now live inside their cards on the Invitation tab — edit them there instead.
          </p>
          <Field
            label="Google Photos album link"
            helper="A shareable photo album link for guests — not shown on a specific card."
          >
            <input
              type="text"
              value={settings.google_photos_url}
              onChange={e => update('google_photos_url', e.target.value)}
              placeholder="https://photos.google.com/..."
              className={INPUT_CLASS}
            />
          </Field>

          <SaveFeedback error={tabError.links} success={tabSuccess.links} />
          <div>
            <button
              type="button"
              onClick={handleSaveLinks}
              disabled={savingTab === 'links'}
              className="rounded-3xl bg-admin-green px-8 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-60"
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
            <Field label="RSVP cutoff date" helper="RSVP forms close to guests after this date.">
              <input
                type="date"
                value={settings.rsvp_cutoff_date}
                onChange={e => update('rsvp_cutoff_date', e.target.value)}
                className={INPUT_CLASS}
                style={{ colorScheme: 'light' }}
              />
            </Field>
            <Field
              label="Default plus-one allowance"
              helper="Default extra-guest allowance for new households (can be overridden per household)."
            >
              <input
                type="number"
                min={0}
                max={5}
                value={settings.default_plus_one_allowance}
                onChange={e => update('default_plus_one_allowance', Number(e.target.value))}
                className="w-24 rounded-2xl border border-admin-sand/40 bg-white px-4 py-3 text-admin-ink outline-none transition focus:border-admin-green"
              />
            </Field>
          </div>

          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.25em] text-admin-ink/60">Dietary options</p>
            <p className="mb-4 text-xs text-admin-ink/50">Drag to reorder. &ldquo;Other&rdquo; always shows a free-text field.</p>
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
                  <div className="cursor-move select-none px-1 text-lg leading-none text-admin-ink/50">⠿</div>
                  <input
                    type="text"
                    value={opt}
                    onChange={e => updateDietaryOption(i, e.target.value)}
                    className="flex-1 rounded-2xl border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink placeholder-admin-ink/30 outline-none transition focus:border-admin-green"
                  />
                  <button
                    type="button"
                    onClick={() => removeDietaryOption(i)}
                    className="px-2 text-lg leading-none text-admin-ink/50 transition hover:text-admin-persimmon"
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
              className="text-sm text-admin-green transition hover:text-admin-green/70"
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
              className="rounded-3xl bg-admin-green px-8 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-60"
            >
              {savingTab === 'rsvp' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Section>
      )}
    </div>
  );
}
