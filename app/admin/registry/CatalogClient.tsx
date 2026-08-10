'use client';

import { useState } from 'react';
import { REGISTRY_CATEGORIES, type RegistryFund, type RegistryItem } from '@/lib/supabase';

// Funds and items share a single client component because they're two views of
// the same catalogue and the couple edits them together. Form conventions match
// FaqsClient: local FormState, a generic setField, a modal over a dark panel,
// optimistic list updates with rollback on failure.

type RegistrySettingsForm = {
  registry_enabled: boolean;
  registry_hero_eyebrow: string;
  registry_hero_heading: string;
  registry_hero_body: string;
  registry_closing_message: string;
  registry_payid: string;
  registry_payid_name: string;
  registry_payid_instructions: string;
};

type FundForm = {
  name: string;
  description: string;
  suggested_amounts: string;
  category: string;
  image_url: string;
  is_active: boolean;
};

type ItemForm = {
  name: string;
  description: string;
  price: string;
  category: string;
  image_url: string;
  unlimited: boolean;
  quantity_available: string;
  is_active: boolean;
};

const EMPTY_FUND: FundForm = {
  name: '',
  description: '',
  suggested_amounts: '50, 100, 250',
  category: REGISTRY_CATEGORIES[0],
  image_url: '',
  is_active: true,
};

const EMPTY_ITEM: ItemForm = {
  name: '',
  description: '',
  price: '',
  category: REGISTRY_CATEGORIES[0],
  image_url: '',
  // Unlimited by default — a cap is the exception, and NULL is the value the
  // rest of the system reads as "no cap enforced".
  unlimited: true,
  quantity_available: '',
  is_active: true,
};

const fieldClass =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-admin-bone placeholder-admin-bone/30 outline-none transition focus:border-admin-green';
const labelClass = 'text-xs uppercase tracking-[0.25em] text-admin-bone/60 block mb-2';

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-admin-green' : 'bg-admin-bone/20'}`}
      aria-label={label}
      aria-pressed={on}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function CatalogClient({
  funds: initialFunds,
  items: initialItems,
  settings: initialSettings,
}: {
  funds: RegistryFund[];
  items: RegistryItem[];
  settings: RegistrySettingsForm;
}) {
  const [funds, setFunds] = useState(initialFunds);
  const [items, setItems] = useState(initialItems);
  const [settings, setSettings] = useState(initialSettings);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [fundOpen, setFundOpen] = useState(false);
  const [fundEditingId, setFundEditingId] = useState<string | null>(null);
  const [fundForm, setFundForm] = useState<FundForm>(EMPTY_FUND);

  const [itemOpen, setItemOpen] = useState(false);
  const [itemEditingId, setItemEditingId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(EMPTY_ITEM);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function setFundField<K extends keyof FundForm>(key: K, value: FundForm[K]) {
    setFundForm(prev => ({ ...prev, [key]: value }));
  }
  function setItemField<K extends keyof ItemForm>(key: K, value: ItemForm[K]) {
    setItemForm(prev => ({ ...prev, [key]: value }));
  }

  // ── Settings (generic PATCH /admin/api/settings — no registry-specific endpoint) ──
  async function saveSettings() {
    setSettingsSaving(true);
    setSettingsSaved(false);
    const res = await fetch('/admin/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSettingsSaving(false);
    if (res.ok) {
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    }
  }

  // ── Funds ──
  function openFundAdd() {
    setFundEditingId(null);
    setFundForm(EMPTY_FUND);
    setFormError(null);
    setFundOpen(true);
  }

  function openFundEdit(fund: RegistryFund) {
    setFundEditingId(fund.id);
    setFundForm({
      name: fund.name,
      description: fund.description ?? '',
      suggested_amounts: (fund.suggested_amounts ?? []).join(', '),
      category: fund.category,
      image_url: fund.image_url ?? '',
      is_active: fund.is_active,
    });
    setFormError(null);
    setFundOpen(true);
  }

  async function submitFund(e: React.FormEvent) {
    e.preventDefault();
    if (!fundForm.name.trim()) {
      setFormError('Give the fund a name.');
      return;
    }
    const amounts = fundForm.suggested_amounts
      .split(',')
      .map(s => Number(s.trim()))
      .filter(n => Number.isFinite(n) && n > 0);
    if (amounts.length === 0) {
      setFormError('Give at least one suggested amount, e.g. 50, 100, 250.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const body = {
      name: fundForm.name.trim(),
      description: fundForm.description.trim(),
      suggested_amounts: amounts,
      category: fundForm.category,
      image_url: fundForm.image_url.trim(),
      is_active: fundForm.is_active,
      ...(fundEditingId ? {} : { sort_order: funds.length }),
    };

    const res = await fetch(
      fundEditingId ? `/admin/api/registry/funds/${fundEditingId}` : '/admin/api/registry/funds',
      {
        method: fundEditingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFormError(data.message || 'Failed to save. Please try again.');
      setSaving(false);
      return;
    }

    const saved: RegistryFund = await res.json();
    setFunds(prev => (fundEditingId ? prev.map(f => (f.id === fundEditingId ? saved : f)) : [...prev, saved]));
    setSaving(false);
    setFundOpen(false);
  }

  async function deleteFund(id: string) {
    if (!confirm('Delete this fund? Past orders keep their amounts but lose the link to it.')) return;
    const previous = funds;
    setFunds(prev => prev.filter(f => f.id !== id));
    const res = await fetch(`/admin/api/registry/funds/${id}`, { method: 'DELETE' });
    if (!res.ok) setFunds(previous);
  }

  async function toggleFundActive(fund: RegistryFund) {
    const next = !fund.is_active;
    setFunds(prev => prev.map(f => (f.id === fund.id ? { ...f, is_active: next } : f)));
    const res = await fetch(`/admin/api/registry/funds/${fund.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: next }),
    });
    if (!res.ok) setFunds(prev => prev.map(f => (f.id === fund.id ? { ...f, is_active: !next } : f)));
  }

  // ── Items ──
  function openItemAdd() {
    setItemEditingId(null);
    setItemForm(EMPTY_ITEM);
    setFormError(null);
    setItemOpen(true);
  }

  function openItemEdit(item: RegistryItem) {
    setItemEditingId(item.id);
    setItemForm({
      name: item.name,
      description: item.description ?? '',
      price: String(item.price),
      category: item.category,
      image_url: item.image_url ?? '',
      unlimited: item.quantity_available === null,
      quantity_available: item.quantity_available === null ? '' : String(item.quantity_available),
      is_active: item.is_active,
    });
    setFormError(null);
    setItemOpen(true);
  }

  async function submitItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemForm.name.trim()) {
      setFormError('Give the gift a name.');
      return;
    }
    const price = Number(itemForm.price);
    if (!Number.isFinite(price) || price <= 0) {
      setFormError('Give the gift a price.');
      return;
    }
    if (!itemForm.unlimited) {
      const qty = Number(itemForm.quantity_available);
      if (!Number.isFinite(qty) || qty < 1) {
        setFormError('Give a quantity of at least 1, or tick Unlimited.');
        return;
      }
    }

    setSaving(true);
    setFormError(null);

    const body = {
      name: itemForm.name.trim(),
      description: itemForm.description.trim(),
      price,
      category: itemForm.category,
      image_url: itemForm.image_url.trim(),
      // null is what makes an item unlimited — see migration 021.
      quantity_available: itemForm.unlimited ? null : Number(itemForm.quantity_available),
      is_active: itemForm.is_active,
      ...(itemEditingId ? {} : { sort_order: items.length }),
    };

    const res = await fetch(
      itemEditingId ? `/admin/api/registry/items/${itemEditingId}` : '/admin/api/registry/items',
      {
        method: itemEditingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFormError(data.message || 'Failed to save. Please try again.');
      setSaving(false);
      return;
    }

    const saved: RegistryItem = await res.json();
    setItems(prev => (itemEditingId ? prev.map(i => (i.id === itemEditingId ? saved : i)) : [...prev, saved]));
    setSaving(false);
    setItemOpen(false);
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this gift? Past orders keep their amounts but lose the link to it.')) return;
    const previous = items;
    setItems(prev => prev.filter(i => i.id !== id));
    const res = await fetch(`/admin/api/registry/items/${id}`, { method: 'DELETE' });
    if (!res.ok) setItems(previous);
  }

  async function toggleItemActive(item: RegistryItem) {
    const next = !item.is_active;
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, is_active: next } : i)));
    const res = await fetch(`/admin/api/registry/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: next }),
    });
    if (!res.ok) setItems(prev => prev.map(i => (i.id === item.id ? { ...i, is_active: !next } : i)));
  }

  return (
    <>
      {/* ── Page copy + PayID ── */}
      <div className="space-y-6 rounded-[2rem] border border-admin-sand/20 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-admin-ink">Page copy &amp; payment details</h2>
            <p className="mt-1 text-sm text-admin-ink/60">
              Shown on the guest registry page. Saved through the shared settings route.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-admin-sand/30 bg-admin-bone/40 px-4 py-2">
            <div>
              <p className="text-sm text-admin-ink">Registry live</p>
              <p className="text-xs text-admin-ink/50">Off = admins only</p>
            </div>
            <Toggle
              on={settings.registry_enabled}
              label="Toggle registry live"
              onClick={() => setSettings(s => ({ ...s, registry_enabled: !s.registry_enabled }))}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-ink/50">Hero eyebrow</span>
            <input
              value={settings.registry_hero_eyebrow}
              onChange={e => setSettings(s => ({ ...s, registry_hero_eyebrow: e.target.value }))}
              className="w-full rounded-2xl border border-admin-sand/40 bg-white px-4 py-3 text-sm text-admin-ink outline-none focus:border-admin-green"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-ink/50">Hero heading</span>
            <input
              value={settings.registry_hero_heading}
              onChange={e => setSettings(s => ({ ...s, registry_hero_heading: e.target.value }))}
              className="w-full rounded-2xl border border-admin-sand/40 bg-white px-4 py-3 text-sm text-admin-ink outline-none focus:border-admin-green"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-ink/50">Hero body</span>
          <textarea
            rows={3}
            value={settings.registry_hero_body}
            onChange={e => setSettings(s => ({ ...s, registry_hero_body: e.target.value }))}
            className="w-full resize-y rounded-2xl border border-admin-sand/40 bg-white px-4 py-3 text-sm text-admin-ink outline-none focus:border-admin-green"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-ink/50">Closing message</span>
          <textarea
            rows={2}
            value={settings.registry_closing_message}
            onChange={e => setSettings(s => ({ ...s, registry_closing_message: e.target.value }))}
            className="w-full resize-y rounded-2xl border border-admin-sand/40 bg-white px-4 py-3 text-sm text-admin-ink outline-none focus:border-admin-green"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-ink/50">
              PayID (leave blank to hide the bank-transfer option)
            </span>
            <input
              value={settings.registry_payid}
              onChange={e => setSettings(s => ({ ...s, registry_payid: e.target.value }))}
              placeholder="email@example.com or 04xx xxx xxx"
              className="w-full rounded-2xl border border-admin-sand/40 bg-white px-4 py-3 text-sm text-admin-ink outline-none focus:border-admin-green"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-ink/50">
              PayID account name
            </span>
            <input
              value={settings.registry_payid_name}
              onChange={e => setSettings(s => ({ ...s, registry_payid_name: e.target.value }))}
              className="w-full rounded-2xl border border-admin-sand/40 bg-white px-4 py-3 text-sm text-admin-ink outline-none focus:border-admin-green"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-ink/50">
            Transfer instructions
          </span>
          <textarea
            rows={2}
            value={settings.registry_payid_instructions}
            onChange={e => setSettings(s => ({ ...s, registry_payid_instructions: e.target.value }))}
            className="w-full resize-y rounded-2xl border border-admin-sand/40 bg-white px-4 py-3 text-sm text-admin-ink outline-none focus:border-admin-green"
          />
        </label>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={saveSettings}
            disabled={settingsSaving}
            className="rounded-full bg-admin-green px-5 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-60"
          >
            {settingsSaving ? 'Saving…' : 'Save copy'}
          </button>
          {settingsSaved && <span className="text-sm text-admin-green">Saved</span>}
        </div>
      </div>

      {/* ── Funds ── */}
      <div className="rounded-[2rem] border border-admin-sand/20 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-admin-ink">Funds</h2>
            <p className="mt-1 text-sm text-admin-ink/60">Guests contribute any amount toward these.</p>
          </div>
          <button
            type="button"
            onClick={openFundAdd}
            className="rounded-full bg-admin-green px-5 py-2.5 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90"
          >
            + Add fund
          </button>
        </div>

        {funds.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-admin-ink/60">No funds yet.</p>
        ) : (
          <ul>
            {funds.map(fund => (
              <li
                key={fund.id}
                className="flex flex-wrap items-start gap-4 border-b border-admin-sand/10 px-2 py-4 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-admin-ink">{fund.name}</p>
                  <p className="mt-0.5 text-xs uppercase tracking-[0.2em] text-admin-ink/40">{fund.category}</p>
                  {fund.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-admin-ink/60">{fund.description}</p>
                  )}
                  <p className="mt-1 text-xs text-admin-ink/50">
                    Suggested: {(fund.suggested_amounts ?? []).map(a => `$${a}`).join(' · ')}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => toggleFundActive(fund)}
                    className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.2em] transition ${
                      fund.is_active
                        ? 'border-admin-green/20 bg-admin-green/10 text-admin-green hover:bg-admin-green/20'
                        : 'border-admin-ink/10 bg-admin-ink/5 text-admin-ink/40 hover:bg-admin-ink/10'
                    }`}
                  >
                    {fund.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openFundEdit(fund)}
                    className="rounded-2xl border border-admin-ink/10 px-3 py-1.5 text-sm text-admin-ink/70 transition hover:border-admin-ink/20 hover:bg-admin-ink/5 hover:text-admin-ink"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteFund(fund.id)}
                    className="rounded-2xl border border-admin-persimmon/20 px-3 py-1.5 text-sm text-admin-persimmon transition hover:border-admin-persimmon/40 hover:bg-admin-persimmon/10"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Items ── */}
      <div className="rounded-[2rem] border border-admin-sand/20 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-admin-ink">Gifts</h2>
            <p className="mt-1 text-sm text-admin-ink/60">Fixed-price, claimed outright.</p>
          </div>
          <button
            type="button"
            onClick={openItemAdd}
            className="rounded-full bg-admin-green px-5 py-2.5 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90"
          >
            + Add gift
          </button>
        </div>

        {items.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-admin-ink/60">No gifts yet.</p>
        ) : (
          <ul>
            {items.map(item => {
              const capped = item.quantity_available !== null;
              const soldOut = capped && item.quantity_claimed >= (item.quantity_available as number);
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start gap-4 border-b border-admin-sand/10 px-2 py-4 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-admin-ink">{item.name}</p>
                    <p className="mt-0.5 text-xs uppercase tracking-[0.2em] text-admin-ink/40">{item.category}</p>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-admin-ink/60">{item.description}</p>
                    )}
                    <p className="mt-1 text-xs text-admin-ink/50">
                      ${Number(item.price).toFixed(2)} ·{' '}
                      {capped ? (
                        <span className={soldOut ? 'text-admin-warning' : ''}>
                          {item.quantity_claimed} of {item.quantity_available} claimed
                        </span>
                      ) : (
                        <>Unlimited · {item.quantity_claimed} claimed</>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => toggleItemActive(item)}
                      className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.2em] transition ${
                        item.is_active
                          ? 'border-admin-green/20 bg-admin-green/10 text-admin-green hover:bg-admin-green/20'
                          : 'border-admin-ink/10 bg-admin-ink/5 text-admin-ink/40 hover:bg-admin-ink/10'
                      }`}
                    >
                      {item.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openItemEdit(item)}
                      className="rounded-2xl border border-admin-ink/10 px-3 py-1.5 text-sm text-admin-ink/70 transition hover:border-admin-ink/20 hover:bg-admin-ink/5 hover:text-admin-ink"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteItem(item.id)}
                      className="rounded-2xl border border-admin-persimmon/20 px-3 py-1.5 text-sm text-admin-persimmon transition hover:border-admin-persimmon/40 hover:bg-admin-persimmon/10"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Fund modal ── */}
      {fundOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setFundOpen(false)} />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-white/10 bg-admin-ink p-8 shadow-2xl shadow-black/60">
            <p className="text-sm uppercase tracking-[0.3em] text-admin-sand">
              {fundEditingId ? 'Edit fund' : 'New fund'}
            </p>
            <h2 className="mt-2 mb-7 text-2xl font-semibold text-admin-bone">
              {fundEditingId ? 'Update this fund' : 'Add a fund'}
            </h2>

            <form onSubmit={submitFund} className="space-y-6">
              <label className="block">
                <span className={labelClass}>Name</span>
                <input
                  value={fundForm.name}
                  onChange={e => setFundField('name', e.target.value)}
                  required
                  placeholder="e.g. A Night at the Villa"
                  className={fieldClass}
                />
              </label>

              <label className="block">
                <span className={labelClass}>Description</span>
                <textarea
                  value={fundForm.description}
                  onChange={e => setFundField('description', e.target.value)}
                  rows={3}
                  placeholder="One extra night at the good hotel."
                  className={`${fieldClass} resize-none`}
                />
              </label>

              <label className="block">
                <span className={labelClass}>Suggested amounts (comma separated)</span>
                <input
                  value={fundForm.suggested_amounts}
                  onChange={e => setFundField('suggested_amounts', e.target.value)}
                  placeholder="50, 100, 250"
                  className={fieldClass}
                />
              </label>

              <label className="block">
                <span className={labelClass}>Category</span>
                <select
                  value={fundForm.category}
                  onChange={e => setFundField('category', e.target.value)}
                  className={fieldClass}
                >
                  {REGISTRY_CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={labelClass}>Image URL</span>
                <input
                  value={fundForm.image_url}
                  onChange={e => setFundField('image_url', e.target.value)}
                  placeholder="https://…"
                  className={fieldClass}
                />
              </label>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                <div>
                  <p className="text-sm text-admin-bone">Active</p>
                  <p className="text-xs text-admin-bone/50">Inactive funds are hidden from guests</p>
                </div>
                <Toggle
                  on={fundForm.is_active}
                  label="Toggle active"
                  onClick={() => setFundField('is_active', !fundForm.is_active)}
                />
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
                  {saving ? 'Saving…' : fundEditingId ? 'Update fund' : 'Add fund'}
                </button>
                <button
                  type="button"
                  onClick={() => setFundOpen(false)}
                  className="rounded-3xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-admin-bone transition hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Item modal ── */}
      {itemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setItemOpen(false)} />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-white/10 bg-admin-ink p-8 shadow-2xl shadow-black/60">
            <p className="text-sm uppercase tracking-[0.3em] text-admin-sand">
              {itemEditingId ? 'Edit gift' : 'New gift'}
            </p>
            <h2 className="mt-2 mb-7 text-2xl font-semibold text-admin-bone">
              {itemEditingId ? 'Update this gift' : 'Add a gift'}
            </h2>

            <form onSubmit={submitItem} className="space-y-6">
              <label className="block">
                <span className={labelClass}>Name</span>
                <input
                  value={itemForm.name}
                  onChange={e => setItemField('name', e.target.value)}
                  required
                  placeholder="e.g. Sunset Dinner for Two"
                  className={fieldClass}
                />
              </label>

              <label className="block">
                <span className={labelClass}>Description</span>
                <textarea
                  value={itemForm.description}
                  onChange={e => setItemField('description', e.target.value)}
                  rows={3}
                  placeholder="A private table on the sand, timed for the last light."
                  className={`${fieldClass} resize-none`}
                />
              </label>

              <label className="block">
                <span className={labelClass}>Price (AUD)</span>
                <input
                  value={itemForm.price}
                  onChange={e => setItemField('price', e.target.value)}
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  placeholder="250"
                  className={fieldClass}
                />
              </label>

              <label className="block">
                <span className={labelClass}>Category</span>
                <select
                  value={itemForm.category}
                  onChange={e => setItemField('category', e.target.value)}
                  className={fieldClass}
                >
                  {REGISTRY_CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={labelClass}>Image URL</span>
                <input
                  value={itemForm.image_url}
                  onChange={e => setItemField('image_url', e.target.value)}
                  placeholder="https://…"
                  className={fieldClass}
                />
              </label>

              {/* Quantity: unlimited by default; the numeric field only appears
                  once the couple actually wants a cap. */}
              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={itemForm.unlimited}
                    onChange={e => setItemField('unlimited', e.target.checked)}
                    className="h-4 w-4 accent-admin-green"
                  />
                  <span>
                    <span className="block text-sm text-admin-bone">Unlimited</span>
                    <span className="block text-xs text-admin-bone/50">
                      Any number of guests can give this
                    </span>
                  </span>
                </label>

                {!itemForm.unlimited && (
                  <label className="block">
                    <span className={labelClass}>How many available</span>
                    <input
                      value={itemForm.quantity_available}
                      onChange={e => setItemField('quantity_available', e.target.value)}
                      type="number"
                      min="1"
                      step="1"
                      placeholder="3"
                      className={fieldClass}
                    />
                    {itemEditingId && (
                      <span className="mt-2 block text-xs text-admin-bone/50">
                        Already claimed:{' '}
                        {items.find(i => i.id === itemEditingId)?.quantity_claimed ?? 0}
                      </span>
                    )}
                  </label>
                )}
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                <div>
                  <p className="text-sm text-admin-bone">Active</p>
                  <p className="text-xs text-admin-bone/50">Inactive gifts are hidden from guests</p>
                </div>
                <Toggle
                  on={itemForm.is_active}
                  label="Toggle active"
                  onClick={() => setItemField('is_active', !itemForm.is_active)}
                />
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
                  {saving ? 'Saving…' : itemEditingId ? 'Update gift' : 'Add gift'}
                </button>
                <button
                  type="button"
                  onClick={() => setItemOpen(false)}
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
