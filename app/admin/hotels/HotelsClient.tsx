'use client';

import { useState } from 'react';
import type { NearbyHotel } from '@/lib/supabase';

// Numbers are kept as strings while editing so the inputs can be cleared and retyped.
interface FormState {
  name: string;
  street: string;
  walk_minutes: string;
  price_tier: string;
  blurb: string;
  website_url: string;
  map_x: string;
  map_y: string;
  display_order: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  street: '',
  walk_minutes: '',
  price_tier: '2',
  blurb: '',
  website_url: '',
  map_x: '',
  map_y: '',
  display_order: '0',
  is_active: true,
};

const TIER_OPTIONS = [
  { value: '1', label: '$  (under $250 a night)' },
  { value: '2', label: '$$  ($250 to $350 a night)' },
  { value: '3', label: '$$$  ($350 to $500 a night)' },
  { value: '4', label: '$$$$  (over $500 a night)' },
];

const INPUT_CLASS =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-admin-bone placeholder-admin-bone/30 outline-none transition focus:border-admin-green';
const LABEL_CLASS = 'text-xs uppercase tracking-[0.25em] text-admin-bone/60 block mb-2';

export default function HotelsClient({ hotels: initial }: { hotels: NearbyHotel[] }) {
  const [hotels, setHotels] = useState<NearbyHotel[]>(initial);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, display_order: String(hotels.length) });
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(h: NearbyHotel) {
    setEditingId(h.id);
    setForm({
      name: h.name,
      street: h.street,
      walk_minutes: String(h.walk_minutes),
      price_tier: String(h.price_tier),
      blurb: h.blurb,
      website_url: h.website_url ?? '',
      map_x: String(h.map_x),
      map_y: String(h.map_y),
      display_order: String(h.display_order),
      is_active: h.is_active,
    });
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setFormError(null);
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  async function applyOrder(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= hotels.length) return;

    const reordered = Array.from(hotels);
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const withOrder = reordered.map((h, i) => ({ ...h, display_order: i }));
    setHotels(withOrder);

    await Promise.all(
      withOrder.map(h =>
        fetch(`/admin/api/hotels/${h.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_order: h.display_order }),
        })
      )
    );
  }

  async function handleDrop(e: React.DragEvent, toIndex: number) {
    e.preventDefault();
    await applyOrder(Number(e.dataTransfer.getData('text/plain')), toIndex);
  }

  async function handleToggleActive(id: string, currentlyActive: boolean) {
    const next = !currentlyActive;
    setHotels(prev => prev.map(h => (h.id === id ? { ...h, is_active: next } : h)));

    const res = await fetch(`/admin/api/hotels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: next }),
    });

    if (!res.ok) {
      setHotels(prev => prev.map(h => (h.id === id ? { ...h, is_active: currentlyActive } : h)));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this hotel? This cannot be undone.')) return;
    setDeleting(id);

    const res = await fetch(`/admin/api/hotels/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setHotels(prev => prev.filter(h => h.id !== id));
    }

    setDeleting(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.street.trim() || !form.blurb.trim()) {
      setFormError('Name, street and blurb are required.');
      return;
    }
    if (form.walk_minutes.trim() === '' || form.map_x.trim() === '' || form.map_y.trim() === '') {
      setFormError('Walk minutes, map x and map y are required.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const body = {
      name: form.name.trim(),
      street: form.street.trim(),
      walk_minutes: Number(form.walk_minutes),
      price_tier: Number(form.price_tier),
      blurb: form.blurb.trim(),
      website_url: form.website_url.trim(),
      map_x: Number(form.map_x),
      map_y: Number(form.map_y),
      display_order: Number(form.display_order || 0),
      is_active: form.is_active,
    };

    const url = editingId ? `/admin/api/hotels/${editingId}` : '/admin/api/hotels';
    const method = editingId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFormError(data.message || 'Failed to save. Please try again.');
      setSaving(false);
      return;
    }

    const saved: NearbyHotel = await res.json();
    setHotels(prev => {
      const next = editingId ? prev.map(h => (h.id === editingId ? saved : h)) : [...prev, saved];
      return next.sort((a, b) => a.display_order - b.display_order);
    });
    setSaving(false);
    closeForm();
  }

  return (
    <>
      <div className="rounded-3xl border border-admin-sand/20 bg-white overflow-hidden">
        {hotels.length === 0 ? (
          <div className="px-8 py-16 text-center">
            <p className="text-admin-ink/60">No hotels yet.</p>
            <p className="mt-1 text-sm text-admin-ink/50">Add your first hotel below.</p>
          </div>
        ) : (
          <ul>
            {hotels.map((hotel, index) => (
              <li
                key={hotel.id}
                draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, index)}
                className="flex items-start gap-4 border-b border-admin-sand/10 px-6 py-5 last:border-b-0 transition hover:bg-admin-bone/40 cursor-default"
              >
                <div className="hidden cursor-move select-none pt-0.5 text-admin-ink/50 text-lg leading-none shrink-0 lg:block">
                  ⠿
                </div>
                {/* Touch fallback: HTML5 drag doesn't fire on touchscreens */}
                <div className="flex shrink-0 flex-col lg:hidden">
                  <button
                    type="button"
                    onClick={() => applyOrder(index, index - 1)}
                    className="px-1 text-xs leading-4 text-admin-ink/40 active:text-admin-ink"
                    aria-label="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => applyOrder(index, index + 1)}
                    className="px-1 text-xs leading-4 text-admin-ink/40 active:text-admin-ink"
                    aria-label="Move down"
                  >
                    ▼
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-admin-ink leading-snug font-medium">
                    <span className="mr-2 text-admin-ink/40">{index + 1}</span>
                    {hotel.name}
                    <span className="ml-2 text-sm text-admin-ink/50">{'$'.repeat(hotel.price_tier)}</span>
                  </p>
                  <p className="mt-1 text-sm text-admin-ink/60 leading-relaxed">
                    {hotel.walk_minutes} min walk · {hotel.street} · map {hotel.map_x}, {hotel.map_y}
                  </p>
                  <p className="mt-1 text-sm text-admin-ink/60 leading-relaxed line-clamp-2">{hotel.blurb}</p>
                  {!hotel.website_url && (
                    <p className="mt-1 text-xs text-admin-ink/40">No website link yet</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(hotel.id, hotel.is_active)}
                    className={`text-xs uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border transition ${
                      hotel.is_active
                        ? 'bg-admin-green/10 text-admin-green border-admin-green/20 hover:bg-admin-green/20'
                        : 'bg-admin-ink/5 text-admin-ink/40 border-admin-ink/10 hover:text-admin-ink/60 hover:bg-admin-ink/10'
                    }`}
                  >
                    {hotel.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(hotel)}
                    className="text-sm text-admin-ink/70 hover:text-admin-ink transition px-3 py-1.5 rounded-2xl border border-admin-ink/10 hover:border-admin-ink/20 hover:bg-admin-ink/5"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(hotel.id)}
                    disabled={deleting === hotel.id}
                    className="text-sm text-admin-persimmon hover:text-admin-persimmon/70 transition px-3 py-1.5 rounded-2xl border border-admin-persimmon/20 hover:border-admin-persimmon/40 hover:bg-admin-persimmon/10 disabled:opacity-40"
                  >
                    {deleting === hotel.id ? '…' : 'Delete'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={openAdd}
          className="rounded-full bg-admin-green px-5 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90"
        >
          + Add hotel
        </button>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative w-full max-w-lg rounded-[2rem] border border-white/10 bg-admin-ink p-8 shadow-2xl shadow-black/60 max-h-[90vh] overflow-y-auto">
            <p className="text-sm uppercase tracking-[0.3em] text-admin-sand">
              {editingId ? 'Edit hotel' : 'New hotel'}
            </p>
            <h2 className="mt-2 mb-7 text-2xl font-semibold text-admin-bone">
              {editingId ? 'Update this hotel' : 'Add a hotel'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <label className="block">
                <span className={LABEL_CLASS}>Name</span>
                <input
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  required
                  placeholder="e.g. Quincy Hotel"
                  className={INPUT_CLASS}
                />
              </label>

              <label className="block">
                <span className={LABEL_CLASS}>Street</span>
                <input
                  value={form.street}
                  onChange={e => setField('street', e.target.value)}
                  required
                  placeholder="e.g. Little Collins St"
                  className={INPUT_CLASS}
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className={LABEL_CLASS}>Walk (minutes)</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.walk_minutes}
                    onChange={e => setField('walk_minutes', e.target.value)}
                    required
                    className={INPUT_CLASS}
                  />
                </label>
                <label className="block">
                  <span className={LABEL_CLASS}>Price</span>
                  <select
                    value={form.price_tier}
                    onChange={e => setField('price_tier', e.target.value)}
                    className={INPUT_CLASS}
                  >
                    {TIER_OPTIONS.map(o => (
                      <option key={o.value} value={o.value} className="text-black">
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className={LABEL_CLASS}>Blurb</span>
                <textarea
                  value={form.blurb}
                  onChange={e => setField('blurb', e.target.value)}
                  rows={2}
                  required
                  placeholder="e.g. Rooftop pool and bar."
                  className={`${INPUT_CLASS} resize-none`}
                />
              </label>

              <label className="block">
                <span className={LABEL_CLASS}>Website link</span>
                <input
                  type="url"
                  value={form.website_url}
                  onChange={e => setField('website_url', e.target.value)}
                  placeholder="https://..."
                  className={INPUT_CLASS}
                />
                <span className="mt-2 block text-xs text-admin-bone/50">
                  Optional. When set, the hotel name links to it.
                </span>
              </label>

              <div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className={LABEL_CLASS}>Map x</span>
                    <input
                      type="number"
                      step="any"
                      value={form.map_x}
                      onChange={e => setField('map_x', e.target.value)}
                      required
                      className={INPUT_CLASS}
                    />
                  </label>
                  <label className="block">
                    <span className={LABEL_CLASS}>Map y</span>
                    <input
                      type="number"
                      step="any"
                      value={form.map_y}
                      onChange={e => setField('map_y', e.target.value)}
                      required
                      className={INPUT_CLASS}
                    />
                  </label>
                </div>
                <p className="mt-2 text-xs text-admin-bone/50">
                  Map units (2.5 m each): QT sits at 600, 258. Russell St is x 608 and Collins St is y 330; the blocks are about 92 units apart.
                </p>
              </div>

              <label className="block">
                <span className={LABEL_CLASS}>Display order</span>
                <input
                  type="number"
                  step={1}
                  value={form.display_order}
                  onChange={e => setField('display_order', e.target.value)}
                  className={INPUT_CLASS}
                />
                <span className="mt-2 block text-xs text-admin-bone/50">
                  Lowest first. The number on the map pin and card follows this order.
                </span>
              </label>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                <div>
                  <p className="text-sm text-admin-bone">Active</p>
                  <p className="text-xs text-admin-bone/50">Inactive hotels are hidden from guests</p>
                </div>
                <button
                  type="button"
                  onClick={() => setField('is_active', !form.is_active)}
                  className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${
                    form.is_active ? 'bg-admin-green' : 'bg-admin-bone/20'
                  }`}
                  aria-label="Toggle active"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      form.is_active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {formError && (
                <div className="rounded-2xl bg-admin-persimmon/10 px-4 py-3 text-sm text-admin-persimmon">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-3xl bg-admin-green px-5 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : editingId ? 'Update hotel' : 'Add hotel'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-3xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-admin-bone transition hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
