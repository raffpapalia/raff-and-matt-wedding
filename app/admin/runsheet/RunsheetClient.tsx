'use client';

import { useMemo, useState } from 'react';
import type { RunsheetItem, RunsheetSection, ScheduleItem } from '@/lib/supabase';
import type { RunsheetVendor } from '@/lib/runsheetData';
import { fmtDay, fmtDuration, fmtTimeRange, gapMinutes, groupByDay, sortItems } from '@/lib/runsheet';

// Section accent colours cycle through admin-token-adjacent hues.
const SECTION_COLORS = ['#0F7A52', '#8E7CC3', '#A88C60', '#F2603C', '#0B6E8F'];

function fmtVersion(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// '3:00 PM' (guest schedule) → 'HH:MM', or '' when unparseable.
function parseGuestTime(time: string): string {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(time.trim());
  if (!m) return '';
  let h = Number(m[1]);
  const min = m[2] ?? '00';
  const suffix = m[3]?.toLowerCase();
  if (suffix === 'pm' && h < 12) h += 12;
  if (suffix === 'am' && h === 12) h = 0;
  if (h > 23) return '';
  return `${String(h).padStart(2, '0')}:${min}`;
}

interface SectionForm {
  title: string;
  day_date: string;
}

const EMPTY_SECTION_FORM: SectionForm = { title: '', day_date: '' };

interface ItemForm {
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  owner: string;
  description: string;
  vendor_ids: string[];
}

const EMPTY_ITEM_FORM: ItemForm = {
  title: '',
  start_time: '',
  end_time: '',
  location: '',
  owner: '',
  description: '',
  vendor_ids: [],
};

interface Props {
  initialSections: RunsheetSection[];
  initialItems: RunsheetItem[];
  vendors: RunsheetVendor[];
  initialShare: { enabled: boolean; token: string | null };
  weddingDate: string;
  guestSchedule: ScheduleItem[];
}

export default function RunsheetClient({
  initialSections,
  initialItems,
  vendors,
  initialShare,
  weddingDate,
  guestSchedule,
}: Props) {
  const [sections, setSections] = useState<RunsheetSection[]>(initialSections);
  const [items, setItems] = useState<RunsheetItem[]>(initialItems);
  const [share, setShare] = useState(initialShare);

  const [sectionFormOpen, setSectionFormOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionForm>(EMPTY_SECTION_FORM);
  const [itemFormSectionId, setItemFormSectionId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(EMPTY_ITEM_FORM);
  const [shareOpen, setShareOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [dragSectionId, setDragSectionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const days = useMemo(() => groupByDay(sections), [sections]);

  const itemsBySection = useMemo(() => {
    const map = new Map<string, RunsheetItem[]>();
    for (const item of items) {
      const list = map.get(item.section_id) ?? [];
      list.push(item);
      map.set(item.section_id, list);
    }
    for (const [key, list] of map) map.set(key, sortItems(list));
    return map;
  }, [items]);

  const vendorById = useMemo(() => new Map(vendors.map(v => [v.id, v])), [vendors]);

  const keyContacts = useMemo(() => {
    const used = new Set(items.flatMap(i => i.vendor_ids));
    return vendors.filter(v => used.has(v.id));
  }, [items, vendors]);

  const versionDate = useMemo(
    () => items.reduce<string | null>((max, i) => (max === null || i.updated_at > max ? i.updated_at : max), null),
    [items]
  );

  const sectionColor = (sectionId: string) => {
    const ordered = days.flatMap(d => d.sections);
    const idx = ordered.findIndex(s => s.id === sectionId);
    return SECTION_COLORS[Math.max(idx, 0) % SECTION_COLORS.length];
  };

  // ── Section handlers ──

  function openAddSection() {
    setEditingSectionId(null);
    setSectionForm({ title: '', day_date: sections.length === 0 ? weddingDate : '' });
    setFormError(null);
    setSectionFormOpen(true);
  }

  function openEditSection(section: RunsheetSection) {
    setEditingSectionId(section.id);
    setSectionForm({ title: section.title, day_date: section.day_date ?? '' });
    setFormError(null);
    setSectionFormOpen(true);
  }

  async function submitSection(e: React.FormEvent) {
    e.preventDefault();
    if (!sectionForm.title.trim()) {
      setFormError('Section needs a title.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const body = {
      title: sectionForm.title.trim(),
      day_date: sectionForm.day_date || null,
      ...(editingSectionId ? {} : { display_order: sections.length }),
    };

    const url = editingSectionId ? `/admin/api/runsheet/sections/${editingSectionId}` : '/admin/api/runsheet/sections';
    const res = await fetch(url, {
      method: editingSectionId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFormError(data.message || 'Failed to save section.');
      return;
    }

    const saved: RunsheetSection = await res.json();
    setSections(prev => (editingSectionId ? prev.map(s => (s.id === editingSectionId ? saved : s)) : [...prev, saved]));
    setSectionFormOpen(false);
  }

  async function deleteSection(id: string) {
    if (!confirm('Delete this section and everything in it? This cannot be undone.')) return;
    const res = await fetch(`/admin/api/runsheet/sections/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setSections(prev => prev.filter(s => s.id !== id));
      setItems(prev => prev.filter(i => i.section_id !== id));
    }
  }

  // Persist a new within-day ordering: reassign display_order, optimistic
  // setState, one PATCH per section (same pattern as FaqsClient).
  function persistSectionOrder(reordered: RunsheetSection[]) {
    const updates = reordered.map((s, i) => ({ ...s, display_order: i }));
    setSections(prev => prev.map(s => updates.find(u => u.id === s.id) ?? s));
    void Promise.all(
      updates.map(s =>
        fetch(`/admin/api/runsheet/sections/${s.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_order: s.display_order }),
        })
      )
    );
  }

  // Desktop drag-reorder within a day.
  function handleSectionDrop(day: string | null, targetId: string) {
    if (!dragSectionId || dragSectionId === targetId) return;
    const dayGroup = days.find(d => d.day === day);
    if (!dayGroup) return;
    const ids = dayGroup.sections.map(s => s.id);
    if (!ids.includes(dragSectionId) || !ids.includes(targetId)) return;

    const reordered = [...dayGroup.sections];
    const from = reordered.findIndex(s => s.id === dragSectionId);
    const to = reordered.findIndex(s => s.id === targetId);
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    persistSectionOrder(reordered);
    setDragSectionId(null);
  }

  // Touch fallback — HTML5 drag doesn't fire on touchscreens.
  function moveSection(day: string | null, sectionId: string, dir: -1 | 1) {
    const dayGroup = days.find(d => d.day === day);
    if (!dayGroup) return;
    const from = dayGroup.sections.findIndex(s => s.id === sectionId);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= dayGroup.sections.length) return;
    const reordered = [...dayGroup.sections];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    persistSectionOrder(reordered);
  }

  // ── Item handlers ──

  function openAddItem(sectionId: string) {
    setEditingItemId(null);
    setItemForm(EMPTY_ITEM_FORM);
    setItemFormSectionId(sectionId);
    setFormError(null);
  }

  function openEditItem(item: RunsheetItem) {
    setEditingItemId(item.id);
    setItemForm({
      title: item.title,
      start_time: item.start_time?.slice(0, 5) ?? '',
      end_time: item.end_time?.slice(0, 5) ?? '',
      location: item.location ?? '',
      owner: item.owner ?? '',
      description: item.description ?? '',
      vendor_ids: item.vendor_ids,
    });
    setItemFormSectionId(item.section_id);
    setFormError(null);
  }

  function closeItemForm() {
    setItemFormSectionId(null);
    setEditingItemId(null);
    setFormError(null);
  }

  async function submitItem(e: React.FormEvent, sectionId: string) {
    e.preventDefault();
    if (!itemForm.title.trim()) {
      setFormError('Item needs a title.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const body = {
      section_id: sectionId,
      title: itemForm.title.trim(),
      start_time: itemForm.start_time || null,
      end_time: itemForm.end_time || null,
      location: itemForm.location.trim() || null,
      owner: itemForm.owner.trim() || null,
      description: itemForm.description.trim() || null,
      vendor_ids: itemForm.vendor_ids,
      ...(editingItemId ? {} : { display_order: (itemsBySection.get(sectionId)?.length ?? 0) }),
    };

    const url = editingItemId ? `/admin/api/runsheet/items/${editingItemId}` : '/admin/api/runsheet/items';
    const res = await fetch(url, {
      method: editingItemId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFormError(data.message || 'Failed to save item.');
      return;
    }

    const saved: RunsheetItem = await res.json();
    setItems(prev => (editingItemId ? prev.map(i => (i.id === editingItemId ? saved : i)) : [...prev, saved]));
    closeItemForm();
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this item?')) return;
    const res = await fetch(`/admin/api/runsheet/items/${id}`, { method: 'DELETE' });
    if (res.ok) setItems(prev => prev.filter(i => i.id !== id));
  }

  function toggleVendor(id: string) {
    setItemForm(prev => ({
      ...prev,
      vendor_ids: prev.vendor_ids.includes(id)
        ? prev.vendor_ids.filter(v => v !== id)
        : [...prev.vendor_ids, id],
    }));
  }

  // ── Share handlers ──

  async function updateShare(body: Record<string, unknown>) {
    setSaving(true);
    const res = await fetch('/admin/api/runsheet/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      const saved = await res.json();
      setShare({ enabled: saved.share_enabled, token: saved.share_token });
    }
  }

  const shareUrl = share.token && typeof window !== 'undefined'
    ? `${window.location.origin}/runsheet/${share.token}`
    : null;

  async function copyShareLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Seed from guest schedule ──

  async function importGuestSchedule() {
    setSeeding(true);
    const sectionRes = await fetch('/admin/api/runsheet/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Wedding day', day_date: weddingDate, display_order: 0 }),
    });
    if (!sectionRes.ok) {
      setSeeding(false);
      return;
    }
    const section: RunsheetSection = await sectionRes.json();
    const created: RunsheetItem[] = [];
    for (const [i, entry] of guestSchedule.entries()) {
      const res = await fetch('/admin/api/runsheet/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: section.id,
          title: entry.label,
          start_time: parseGuestTime(entry.time) || null,
          location: entry.location || null,
          description: entry.description || null,
          display_order: i,
        }),
      });
      if (res.ok) created.push(await res.json());
    }
    setSections(prev => [...prev, section]);
    setItems(prev => [...prev, ...created]);
    setSeeding(false);
  }

  // ── Render ──

  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-admin-bone placeholder-admin-bone/30 outline-none transition focus:border-admin-green';
  const labelClass = 'mb-2 block text-xs uppercase tracking-[0.25em] text-admin-bone/60';

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Day of</p>
            <h1 className="mt-2 text-3xl font-semibold text-admin-ink">Run sheet</h1>
            <p className="mt-2 text-sm text-admin-ink/60">
              The minute-by-minute plan — who, where, and which vendors.
              {versionDate && <> · Version {fmtVersion(versionDate)}</>}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="/admin/api/runsheet/export/pdf"
              className="rounded-full border border-admin-sand/40 bg-white px-4 py-2.5 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green"
            >
              Download PDF
            </a>
            <a
              href="/admin/api/runsheet/export/xlsx"
              className="rounded-full border border-admin-sand/40 bg-white px-4 py-2.5 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green"
            >
              Download Excel
            </a>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="rounded-full border border-admin-sand/40 bg-white px-4 py-2.5 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green"
            >
              Share{share.enabled && <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-admin-green align-middle" />}
            </button>
            <button
              type="button"
              onClick={openAddSection}
              className="rounded-full bg-admin-green px-5 py-2.5 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90"
            >
              + Add section
            </button>
          </div>
        </div>
      </div>

      {/* ── Key contacts ── */}
      {keyContacts.length > 0 && (
        <div className="rounded-3xl border border-admin-sand/20 bg-white p-6">
          <button
            type="button"
            onClick={() => setContactsOpen(o => !o)}
            className="flex w-full items-center justify-between text-left"
          >
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Key contacts</p>
            <span className="text-admin-ink/40">{contactsOpen ? '▾' : '▸'}</span>
          </button>
          {contactsOpen && (
            <div className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
              {keyContacts.map(v => (
                <div key={v.id} className="flex items-baseline justify-between gap-3 border-b border-admin-sand/15 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-admin-ink">{v.supplier_name}</p>
                    <p className="text-xs text-admin-ink/55">
                      {v.category}
                      {v.contact_name && <> · {v.contact_name}</>}
                    </p>
                  </div>
                  {v.contact_phone ? (
                    <a href={`tel:${v.contact_phone}`} className="shrink-0 tabular-nums text-admin-green">
                      {v.contact_phone}
                    </a>
                  ) : (
                    <span className="shrink-0 text-xs text-admin-ink/40">no phone</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {contactsOpen && (
            <p className="mt-3 text-xs text-admin-ink/50">
              Contact details come from the supplier&apos;s entry in the Budget tracker.
            </p>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {sections.length === 0 && (
        <div className="rounded-3xl border border-admin-sand/20 bg-white px-8 py-16 text-center">
          <p className="text-admin-ink/60">Nothing planned yet.</p>
          <p className="mt-1 text-sm text-admin-ink/50">
            Add a section for each phase of the day — Getting ready, Ceremony, Reception…
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={openAddSection}
              className="rounded-full bg-admin-green px-5 py-2.5 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90"
            >
              + Add section
            </button>
            {guestSchedule.length > 0 && (
              <button
                type="button"
                onClick={importGuestSchedule}
                disabled={seeding}
                className="rounded-full border border-admin-sand/40 bg-white px-5 py-2.5 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green disabled:opacity-60"
              >
                {seeding ? 'Importing…' : `Import ${guestSchedule.length} items from guest schedule`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Days ── */}
      {days.map(day => {
        // Tracks the last timed item across the day, so gaps show across
        // section boundaries too (e.g. ceremony end → reception start).
        let prevTimed: RunsheetItem | null = null;

        return (
          <div key={day.day ?? 'unscheduled'} className="space-y-4">
            <div className="flex items-center gap-3 px-2">
              <h2 className="text-lg font-semibold text-admin-ink">{fmtDay(day.day)}</h2>
              <div className="h-px flex-1 bg-admin-sand/25" />
            </div>

            {day.sections.map(section => {
              const sectionItems = itemsBySection.get(section.id) ?? [];
              const color = sectionColor(section.id);

              return (
                <div
                  key={section.id}
                  draggable={itemFormSectionId === null}
                  onDragStart={() => setDragSectionId(section.id)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleSectionDrop(day.day, section.id)}
                  className="overflow-hidden rounded-3xl border border-admin-sand/20 bg-white"
                  style={{ borderLeftWidth: 4, borderLeftColor: color }}
                >
                  <div className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6">
                    <span className="hidden cursor-move text-admin-ink/30 lg:inline" title="Drag to reorder">⠿</span>
                    {/* Touch fallback for reordering — drag doesn't work on touchscreens */}
                    <span className="flex flex-col lg:hidden">
                      <button
                        type="button"
                        onClick={() => moveSection(day.day, section.id, -1)}
                        className="px-1 text-xs leading-4 text-admin-ink/40 active:text-admin-ink"
                        aria-label="Move section up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(day.day, section.id, 1)}
                        className="px-1 text-xs leading-4 text-admin-ink/40 active:text-admin-ink"
                        aria-label="Move section down"
                      >
                        ▼
                      </button>
                    </span>
                    <h3 className="text-base font-semibold text-admin-ink">{section.title}</h3>
                    <span className="text-xs text-admin-ink/45">
                      {sectionItems.length} item{sectionItems.length === 1 ? '' : 's'}
                    </span>
                    <span className="ml-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => openAddItem(section.id)}
                        className="rounded-full border border-admin-green/25 bg-admin-green/10 px-3 py-1 text-xs font-medium text-admin-green transition hover:bg-admin-green/20"
                      >
                        + Item
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditSection(section)}
                        className="rounded-full border border-admin-ink/10 px-3 py-1 text-xs text-admin-ink/60 transition hover:bg-admin-ink/5"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSection(section.id)}
                        className="rounded-full border border-admin-persimmon/20 px-3 py-1 text-xs text-admin-persimmon transition hover:bg-admin-persimmon/10"
                      >
                        Delete
                      </button>
                    </span>
                  </div>

                  <div className="px-5 pb-5 sm:px-6">
                    {sectionItems.length === 0 && itemFormSectionId !== section.id && (
                      <p className="pb-1 text-sm text-admin-ink/50">No items yet.</p>
                    )}

                    <div className="space-y-0">
                      {sectionItems.map(item => {
                        const gap = item.start_time && prevTimed ? gapMinutes(prevTimed, item) : null;
                        if (item.start_time) prevTimed = item;
                        const itemVendors = item.vendor_ids
                          .map(id => vendorById.get(id))
                          .filter((v): v is RunsheetVendor => !!v);

                        return (
                          <div key={item.id}>
                            {gap !== null && gap !== 0 && (
                              <div className="flex items-center gap-2 py-1 pl-0 text-[11px] sm:pl-48">
                                {gap > 0 ? (
                                  <span className="text-admin-ink/40">· {fmtDuration(gap)} gap</span>
                                ) : (
                                  <span className="font-medium text-admin-warning">⚠ overlaps previous by {fmtDuration(gap)}</span>
                                )}
                              </div>
                            )}

                            {editingItemId === item.id && itemFormSectionId === section.id ? (
                              <ItemFormRow
                                form={itemForm}
                                setForm={setItemForm}
                                vendors={vendors}
                                toggleVendor={toggleVendor}
                                onSubmit={e => submitItem(e, section.id)}
                                onCancel={closeItemForm}
                                saving={saving}
                                error={formError}
                                editing
                              />
                            ) : (
                              <div className="group flex flex-col gap-1 border-b border-admin-sand/15 py-3 sm:flex-row sm:items-start sm:gap-4">
                                <div className="shrink-0 sm:w-44">
                                  <p className="whitespace-nowrap text-sm font-semibold tabular-nums" style={{ color }}>
                                    {fmtTimeRange(item.start_time, item.end_time) || '—'}
                                  </p>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-admin-ink">{item.title}</p>
                                  {item.description && (
                                    <p className="mt-0.5 text-sm text-admin-ink/60">{item.description}</p>
                                  )}
                                  {/* Compact inline meta — replaced by the right-hand column at lg+ */}
                                  {(item.location || item.owner || itemVendors.length > 0) && (
                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-admin-ink/55 lg:hidden">
                                      {item.location && <span>📍 {item.location}</span>}
                                      {item.owner && <span>👤 {item.owner}</span>}
                                      {itemVendors.map(v => (
                                        <span
                                          key={v.id}
                                          className="rounded-full bg-admin-ink/5 px-2.5 py-0.5 font-medium text-admin-ink/70"
                                        >
                                          {v.supplier_name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {/* Desktop meta column — puts the empty right side to work */}
                                <div className="hidden w-72 shrink-0 space-y-1 text-xs lg:block">
                                  {item.location && (
                                    <p className="text-admin-ink/60">
                                      <span className="mr-1.5 font-semibold uppercase tracking-[0.08em] text-admin-ink/40">Where</span>
                                      {item.location}
                                    </p>
                                  )}
                                  {item.owner && (
                                    <p className="text-admin-ink/60">
                                      <span className="mr-1.5 font-semibold uppercase tracking-[0.08em] text-admin-ink/40">Who</span>
                                      {item.owner}
                                    </p>
                                  )}
                                  {itemVendors.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                      {itemVendors.map(v => (
                                        <span
                                          key={v.id}
                                          className="rounded-full bg-admin-ink/5 px-2.5 py-0.5 font-medium text-admin-ink/70"
                                        >
                                          {v.supplier_name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex shrink-0 gap-2 lg:opacity-0 lg:transition lg:group-hover:opacity-100">
                                  <button
                                    type="button"
                                    onClick={() => openEditItem(item)}
                                    className="rounded-full border border-admin-ink/10 px-3 py-1 text-xs text-admin-ink/60 transition hover:bg-admin-ink/5"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteItem(item.id)}
                                    className="rounded-full border border-admin-persimmon/20 px-3 py-1 text-xs text-admin-persimmon transition hover:bg-admin-persimmon/10"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {itemFormSectionId === section.id && editingItemId === null && (
                      <ItemFormRow
                        form={itemForm}
                        setForm={setItemForm}
                        vendors={vendors}
                        toggleVendor={toggleVendor}
                        onSubmit={e => submitItem(e, section.id)}
                        onCancel={closeItemForm}
                        saving={saving}
                        error={formError}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* ── Section modal ── */}
      {sectionFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSectionFormOpen(false)} />
          <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-admin-ink p-8 shadow-2xl shadow-black/60">
            <p className="text-sm uppercase tracking-[0.3em] text-admin-sand">
              {editingSectionId ? 'Edit section' : 'New section'}
            </p>
            <h2 className="mt-2 mb-6 text-2xl font-semibold text-admin-bone">
              {editingSectionId ? 'Update this section' : 'Add a section'}
            </h2>
            <form onSubmit={submitSection} className="space-y-5">
              <label className="block">
                <span className={labelClass}>Title</span>
                <input
                  value={sectionForm.title}
                  onChange={e => setSectionForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                  autoFocus
                  placeholder="e.g. Ceremony"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Date (optional)</span>
                <input
                  value={sectionForm.day_date}
                  onChange={e => setSectionForm(prev => ({ ...prev, day_date: e.target.value }))}
                  type="date"
                  className={inputClass}
                />
                <span className="mt-1.5 block text-xs text-admin-bone/45">
                  Sections with the same date group under one day heading.
                </span>
              </label>
              {formError && (
                <div className="rounded-2xl bg-admin-persimmon/10 px-4 py-3 text-sm text-admin-persimmon">{formError}</div>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-3xl bg-admin-green px-5 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : editingSectionId ? 'Update section' : 'Add section'}
                </button>
                <button
                  type="button"
                  onClick={() => setSectionFormOpen(false)}
                  className="rounded-3xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-admin-bone transition hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Share modal ── */}
      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShareOpen(false)} />
          <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-admin-ink p-8 shadow-2xl shadow-black/60">
            <p className="text-sm uppercase tracking-[0.3em] text-admin-sand">Vendor link</p>
            <h2 className="mt-2 mb-6 text-2xl font-semibold text-admin-bone">Share the run sheet</h2>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <div>
                <p className="text-sm text-admin-bone">Share link active</p>
                <p className="text-xs text-admin-bone/50">Anyone with the link can view (read-only)</p>
              </div>
              <button
                type="button"
                onClick={() => updateShare({ share_enabled: !share.enabled })}
                disabled={saving}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${share.enabled ? 'bg-admin-green' : 'bg-admin-bone/20'}`}
                aria-label="Toggle share link"
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${share.enabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {share.enabled && shareUrl && (
              <div className="mt-5 space-y-3">
                <div className="break-all rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-admin-bone/80">
                  {shareUrl}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={copyShareLink}
                    className="flex-1 rounded-3xl bg-admin-green px-5 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90"
                  >
                    {copied ? 'Copied ✓' : 'Copy link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Regenerate the link? The old link will stop working for anyone who has it.')) {
                        void updateShare({ regenerate_token: true });
                      }
                    }}
                    disabled={saving}
                    className="rounded-3xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-admin-bone transition hover:bg-white/10 disabled:opacity-60"
                  >
                    Regenerate
                  </button>
                </div>
                <p className="text-xs text-admin-bone/45">
                  Vendors always see the latest version — no need to re-send after changes.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShareOpen(false)}
              className="mt-6 w-full rounded-3xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-admin-bone transition hover:bg-white/10"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inline item add/edit form ────────────────────────────────────────────────

function ItemFormRow({
  form,
  setForm,
  vendors,
  toggleVendor,
  onSubmit,
  onCancel,
  saving,
  error,
  editing = false,
}: {
  form: ItemForm;
  setForm: React.Dispatch<React.SetStateAction<ItemForm>>;
  vendors: RunsheetVendor[];
  toggleVendor: (id: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  editing?: boolean;
}) {
  const field =
    'w-full rounded-xl border border-admin-sand/40 bg-white px-3 py-2 text-sm text-admin-ink outline-none transition focus:border-admin-green';
  const label = 'mb-1 block text-[11px] uppercase tracking-[0.18em] text-admin-ink/50';

  return (
    <form
      onSubmit={onSubmit}
      className="my-3 space-y-3 rounded-2xl border border-admin-sand/30 bg-admin-bone/40 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="block">
          <span className={label}>{editing ? 'Edit item' : 'New item'}</span>
          <input
            value={form.title}
            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
            required
            autoFocus
            placeholder="e.g. First look photos"
            className={field}
          />
        </label>
        <label className="block">
          <span className={label}>Start</span>
          <input
            value={form.start_time}
            onChange={e => setForm(prev => ({ ...prev, start_time: e.target.value }))}
            type="time"
            className={field}
          />
        </label>
        <label className="block">
          <span className={label}>End</span>
          <input
            value={form.end_time}
            onChange={e => setForm(prev => ({ ...prev, end_time: e.target.value }))}
            type="time"
            className={field}
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Location</span>
          <input
            value={form.location}
            onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
            placeholder="e.g. QT Rooftop"
            className={field}
          />
        </label>
        <label className="block">
          <span className={label}>Who&apos;s responsible</span>
          <input
            value={form.owner}
            onChange={e => setForm(prev => ({ ...prev, owner: e.target.value }))}
            placeholder="e.g. Best man"
            className={field}
          />
        </label>
      </div>
      <label className="block">
        <span className={label}>Description</span>
        <textarea
          value={form.description}
          onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          rows={2}
          placeholder="Details, cues, reminders…"
          className={`${field} resize-none`}
        />
      </label>
      {vendors.length > 0 && (
        <div>
          <span className={label}>Vendors required</span>
          <div className="flex flex-wrap gap-2">
            {vendors.map(v => {
              const selected = form.vendor_ids.includes(v.id);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => toggleVendor(v.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    selected
                      ? 'border-admin-green bg-admin-green text-admin-bone'
                      : 'border-admin-sand/40 bg-white text-admin-ink/60 hover:border-admin-green/40 hover:text-admin-green'
                  }`}
                >
                  {v.supplier_name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {error && <div className="rounded-xl bg-admin-persimmon/10 px-3 py-2 text-sm text-admin-persimmon">{error}</div>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-admin-green px-4 py-2 text-xs font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-60"
        >
          {saving ? 'Saving…' : editing ? 'Save item' : 'Add item'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-admin-ink/10 px-4 py-2 text-xs text-admin-ink/60 transition hover:bg-admin-ink/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
