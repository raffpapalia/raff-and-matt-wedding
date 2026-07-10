'use client';

import { useMemo, useState } from 'react';
import type { BudgetItem, BudgetPayment, BudgetPricingMode } from '@/lib/supabase';
import { BUDGET_CATEGORIES } from '@/lib/supabase';

// ── Derived-value helpers ──────────────────────────────────────────────────

function plannedCost(item: BudgetItem): number {
  if (item.pricing_mode === 'per_head') {
    return (item.per_head_price ?? 0) * (item.expected_heads ?? 0);
  }
  return item.agreed_cost ?? item.estimated_cost ?? 0;
}

function actualCost(item: BudgetItem, attendingCount: number): number {
  if (item.pricing_mode === 'per_head') {
    return (item.per_head_price ?? 0) * attendingCount;
  }
  return plannedCost(item);
}

function paidTotal(payments: BudgetPayment[]): number {
  return payments.reduce((sum, p) => sum + (p.paid_date ? p.amount : 0), 0);
}

function isOverdue(p: BudgetPayment, today: string): boolean {
  return !p.paid_date && !!p.due_date && p.due_date < today;
}

function fmt(amount: number): string {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  return amount.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  });
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type ItemStatus = 'estimate' | 'not_started' | 'partial' | 'overdue' | 'paid';

function itemStatus(item: BudgetItem, payments: BudgetPayment[], attendingCount: number, today: string): ItemStatus {
  if (!item.is_booked) return 'estimate';
  const target = actualCost(item, attendingCount);
  const paid = paidTotal(payments);
  if (payments.some(p => isOverdue(p, today))) return 'overdue';
  if (target > 0 && paid >= target) return 'paid';
  if (paid > 0) return 'partial';
  return 'not_started';
}

const STATUS_META: Record<ItemStatus, { label: string; className: string }> = {
  estimate: { label: 'Estimate', className: 'bg-admin-ink/5 text-admin-ink/50 border-admin-ink/10' },
  not_started: { label: 'Booked', className: 'bg-admin-violet/10 text-admin-violet border-admin-violet/20' },
  partial: { label: 'Deposit paid', className: 'bg-admin-warning-bg text-admin-warning border-admin-warning/20' },
  overdue: { label: 'Payment overdue', className: 'bg-admin-persimmon/10 text-admin-persimmon border-admin-persimmon/20' },
  paid: { label: 'Paid in full', className: 'bg-admin-green/10 text-admin-green border-admin-green/20' },
};

// ── Item form state ────────────────────────────────────────────────────────

interface ItemForm {
  supplier_name: string;
  category: string;
  description: string;
  pricing_mode: BudgetPricingMode;
  estimated_cost: string;
  agreed_cost: string;
  per_head_price: string;
  expected_heads: string;
  is_booked: boolean;
  notes: string;
}

const EMPTY_ITEM_FORM: ItemForm = {
  supplier_name: '',
  category: '',
  description: '',
  pricing_mode: 'fixed',
  estimated_cost: '',
  agreed_cost: '',
  per_head_price: '',
  expected_heads: '',
  is_booked: false,
  notes: '',
};

interface PaymentForm {
  label: string;
  amount: string;
  due_date: string;
  already_paid: boolean;
}

const EMPTY_PAYMENT_FORM: PaymentForm = { label: '', amount: '', due_date: '', already_paid: false };

interface Props {
  initialItems: BudgetItem[];
  initialPayments: BudgetPayment[];
  initialTotalBudget: number;
  attendingCount: number;
  invitedCount: number;
}

export default function BudgetClient({
  initialItems,
  initialPayments,
  initialTotalBudget,
  attendingCount,
  invitedCount,
}: Props) {
  const [items, setItems] = useState<BudgetItem[]>(initialItems);
  const [payments, setPayments] = useState<BudgetPayment[]>(initialPayments);
  const [totalBudget, setTotalBudget] = useState(initialTotalBudget);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(EMPTY_ITEM_FORM);
  const [budgetFormOpen, setBudgetFormOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(EMPTY_PAYMENT_FORM);
  const [paymentFormItemId, setPaymentFormItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const today = todayIso();

  const paymentsByItem = useMemo(() => {
    const map = new Map<string, BudgetPayment[]>();
    for (const p of payments) {
      const list = map.get(p.item_id) ?? [];
      list.push(p);
      map.set(p.item_id, list);
    }
    return map;
  }, [payments]);

  // ── Totals ──
  const committed = items.reduce((sum, i) => sum + plannedCost(i), 0);
  const projected = items.reduce((sum, i) => sum + actualCost(i, attendingCount), 0);
  const paid = paidTotal(payments);
  const leftToPay = Math.max(committed - paid, 0);
  const hasPerHead = items.some(i => i.pricing_mode === 'per_head');

  const barBase = Math.max(totalBudget, committed, 1);
  const paidPct = Math.min((paid / barBase) * 100, 100);
  const committedUnpaidPct = Math.min((leftToPay / barBase) * 100, 100 - paidPct);

  const upcoming = useMemo(
    () =>
      payments
        .filter(p => !p.paid_date && p.due_date)
        .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
        .slice(0, 5),
    [payments]
  );

  const nextDue = upcoming.find(p => !isOverdue(p, today));

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.category, (map.get(item.category) ?? 0) + plannedCost(item));
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const itemName = (id: string) => items.find(i => i.id === id)?.supplier_name ?? '';

  // ── Item form handlers ──

  function setField<K extends keyof ItemForm>(key: K, value: ItemForm[K]) {
    setItemForm(prev => ({ ...prev, [key]: value }));
  }

  function openAddItem() {
    setEditingItemId(null);
    setItemForm({ ...EMPTY_ITEM_FORM, expected_heads: String(invitedCount || '') });
    setFormError(null);
    setItemFormOpen(true);
  }

  function openEditItem(item: BudgetItem) {
    setEditingItemId(item.id);
    setItemForm({
      supplier_name: item.supplier_name,
      category: item.category,
      description: item.description ?? '',
      pricing_mode: item.pricing_mode,
      estimated_cost: item.estimated_cost?.toString() ?? '',
      agreed_cost: item.agreed_cost?.toString() ?? '',
      per_head_price: item.per_head_price?.toString() ?? '',
      expected_heads: item.expected_heads?.toString() ?? '',
      is_booked: item.is_booked,
      notes: item.notes ?? '',
    });
    setFormError(null);
    setItemFormOpen(true);
  }

  async function submitItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemForm.supplier_name.trim() || !itemForm.category.trim()) {
      setFormError('Supplier name and category are required.');
      return;
    }
    if (itemForm.pricing_mode === 'per_head' && !itemForm.per_head_price) {
      setFormError('Per-head pricing needs a price per head.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const body = {
      supplier_name: itemForm.supplier_name.trim(),
      category: itemForm.category.trim(),
      description: itemForm.description.trim() || null,
      notes: itemForm.notes.trim() || null,
      pricing_mode: itemForm.pricing_mode,
      estimated_cost: itemForm.estimated_cost || null,
      agreed_cost: itemForm.agreed_cost || null,
      per_head_price: itemForm.per_head_price || null,
      expected_heads: itemForm.expected_heads || null,
      is_booked: itemForm.is_booked,
    };

    const url = editingItemId ? `/admin/api/budget/items/${editingItemId}` : '/admin/api/budget/items';
    const res = await fetch(url, {
      method: editingItemId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFormError(data.message || 'Failed to save. Please try again.');
      setSaving(false);
      return;
    }

    const saved: BudgetItem = await res.json();
    setItems(prev => (editingItemId ? prev.map(i => (i.id === editingItemId ? saved : i)) : [...prev, saved]));
    setSaving(false);
    setItemFormOpen(false);
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this supplier and its payment history? This cannot be undone.')) return;
    const res = await fetch(`/admin/api/budget/items/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== id));
      setPayments(prev => prev.filter(p => p.item_id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  }

  // ── Payment handlers ──

  function openPaymentForm(itemId: string) {
    setPaymentFormItemId(itemId);
    setPaymentForm(EMPTY_PAYMENT_FORM);
  }

  async function submitPayment(e: React.FormEvent, itemId: string) {
    e.preventDefault();
    if (!paymentForm.amount) return;

    setSaving(true);
    const res = await fetch('/admin/api/budget/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: itemId,
        label: paymentForm.label.trim(),
        amount: paymentForm.amount,
        due_date: paymentForm.due_date || null,
        paid_date: paymentForm.already_paid ? todayIso() : null,
      }),
    });
    setSaving(false);

    if (res.ok) {
      const saved: BudgetPayment = await res.json();
      setPayments(prev => [...prev, saved]);
      setPaymentFormItemId(null);
    }
  }

  async function setPaymentPaid(payment: BudgetPayment, paidDate: string | null) {
    setPayments(prev => prev.map(p => (p.id === payment.id ? { ...p, paid_date: paidDate } : p)));
    const res = await fetch(`/admin/api/budget/payments/${payment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid_date: paidDate }),
    });
    if (!res.ok) {
      setPayments(prev => prev.map(p => (p.id === payment.id ? { ...p, paid_date: payment.paid_date } : p)));
    }
  }

  async function deletePayment(id: string) {
    if (!confirm('Delete this payment?')) return;
    const res = await fetch(`/admin/api/budget/payments/${id}`, { method: 'DELETE' });
    if (res.ok) setPayments(prev => prev.filter(p => p.id !== id));
  }

  // ── Budget target ──

  function openBudgetForm() {
    setBudgetInput(totalBudget ? String(totalBudget) : '');
    setBudgetFormOpen(true);
  }

  async function submitBudget(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/admin/api/budget/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total_budget: budgetInput || 0 }),
    });
    setSaving(false);
    if (res.ok) {
      const saved = await res.json();
      setTotalBudget(Number(saved.total_budget) || 0);
      setBudgetFormOpen(false);
    }
  }

  // Live preview numbers inside the item form
  const formPerHeadPlanned = (Number(itemForm.per_head_price) || 0) * (Number(itemForm.expected_heads) || 0);
  const formPerHeadActual = (Number(itemForm.per_head_price) || 0) * attendingCount;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Money</p>
            <h1 className="mt-2 text-3xl font-semibold text-admin-ink">Budget</h1>
            <p className="mt-2 text-sm text-admin-ink/60">
              Suppliers, payment schedules, and where the money is going.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="/admin/api/budget/export"
              className="rounded-full border border-admin-sand/40 bg-white px-4 py-2.5 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green"
            >
              Export CSV
            </a>
            <button
              type="button"
              onClick={openBudgetForm}
              className="rounded-full border border-admin-sand/40 bg-white px-4 py-2.5 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green"
            >
              Set budget
            </button>
            <button
              type="button"
              onClick={openAddItem}
              className="rounded-full bg-admin-green px-5 py-2.5 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90"
            >
              + Add supplier
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-admin-sand/20 bg-white p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Total budget</p>
          <p className="mt-4 text-4xl font-semibold text-admin-ink">{totalBudget > 0 ? fmt(totalBudget) : '—'}</p>
          <p className="mt-2 text-sm text-admin-ink/70">
            {totalBudget > 0 ? (
              committed > totalBudget
                ? <span className="text-admin-persimmon">{fmt(committed - totalBudget)} over target</span>
                : `${fmt(totalBudget - committed)} unallocated`
            ) : (
              'No target set yet'
            )}
          </p>
        </div>
        <div className="rounded-3xl border border-admin-sand/20 bg-white p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Committed</p>
          <p className="mt-4 text-4xl font-semibold text-admin-ink">{fmt(committed)}</p>
          <p className="mt-2 text-sm text-admin-ink/70">
            {items.length} supplier{items.length === 1 ? '' : 's'}
            {hasPerHead && projected !== committed && (
              <> · projected {fmt(projected)} at current RSVPs</>
            )}
          </p>
        </div>
        <div className="rounded-3xl border border-admin-sand/20 bg-white p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Paid so far</p>
          <p className="mt-4 text-4xl font-semibold text-admin-ink">{fmt(paid)}</p>
          <p className="mt-2 text-sm text-admin-ink/70">
            {payments.filter(p => p.paid_date).length} payment{payments.filter(p => p.paid_date).length === 1 ? '' : 's'} logged
          </p>
        </div>
        <div className="rounded-3xl border border-admin-sand/20 bg-white p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Left to pay</p>
          <p className="mt-4 text-4xl font-semibold text-admin-ink">{fmt(leftToPay)}</p>
          <p className="mt-2 text-sm">
            {upcoming.some(p => isOverdue(p, today)) ? (
              <span className="text-admin-persimmon">Overdue payment needs attention</span>
            ) : nextDue ? (
              <span className="text-admin-warning">Next due {fmtDate(nextDue.due_date!)}</span>
            ) : (
              <span className="text-admin-ink/70">Nothing scheduled</span>
            )}
          </p>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="rounded-3xl border border-admin-sand/20 bg-white p-6">
        <div className="flex items-center justify-between text-sm text-admin-ink/70">
          <p>Budget progress</p>
          <p>
            {fmt(paid)} paid · {fmt(leftToPay)} committed &amp; unpaid
            {totalBudget > committed && <> · {fmt(totalBudget - committed)} unallocated</>}
          </p>
        </div>
        <div className="mt-3 flex h-4 overflow-hidden rounded-full bg-admin-ink/10">
          <div className="h-full bg-admin-green transition-all" style={{ width: `${paidPct}%` }} />
          <div className="h-full bg-admin-warning/75 transition-all" style={{ width: `${committedUnpaidPct}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-5 text-xs text-admin-ink/70">
          <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-admin-green align-[-1px]" />Paid</span>
          <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-admin-warning/75 align-[-1px]" />Committed, not yet paid</span>
          <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-admin-ink/10 align-[-1px]" />Unallocated</span>
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[2fr_1fr]">
        {/* ── Suppliers table ── */}
        <div className="rounded-3xl border border-admin-sand/20 bg-white overflow-hidden">
          <div className="px-6 pt-6">
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Suppliers</p>
          </div>
          {items.length === 0 ? (
            <div className="px-8 py-16 text-center">
              <p className="text-admin-ink/60">No suppliers yet.</p>
              <p className="mt-1 text-sm text-admin-ink/50">Add your venue, caterer, photographer — anyone you&apos;re paying.</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-admin-sand/25 text-left text-[11px] uppercase tracking-[0.18em] text-admin-ink/50">
                    <th className="px-6 py-3 font-medium">Supplier</th>
                    <th className="px-3 py-3 font-medium">Category</th>
                    <th className="px-3 py-3 text-right font-medium">Planned</th>
                    <th className="px-3 py-3 text-right font-medium">Actual</th>
                    <th className="px-3 py-3 text-right font-medium">Paid</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const itemPayments = paymentsByItem.get(item.id) ?? [];
                    const planned = plannedCost(item);
                    const actual = actualCost(item, attendingCount);
                    const itemPaid = paidTotal(itemPayments);
                    const status = STATUS_META[itemStatus(item, itemPayments, attendingCount, today)];
                    const expanded = expandedId === item.id;
                    const perHead = item.pricing_mode === 'per_head';

                    return (
                      <FragmentRow key={item.id}>
                        <tr
                          onClick={() => setExpandedId(expanded ? null : item.id)}
                          className="cursor-pointer border-b border-admin-sand/15 transition hover:bg-admin-bone/40"
                        >
                          <td className="px-6 py-4">
                            <p className="font-medium text-admin-ink">{item.supplier_name}</p>
                            {item.description && <p className="mt-0.5 text-xs text-admin-ink/55">{item.description}</p>}
                          </td>
                          <td className="px-3 py-4">
                            <span className="inline-block rounded-full bg-admin-ink/5 px-3 py-1 text-xs font-medium text-admin-ink/70">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-right tabular-nums">
                            <p className="text-admin-ink">{planned > 0 ? fmt(planned) : '—'}</p>
                            {perHead && (
                              <p className="mt-0.5 text-xs text-admin-ink/55">
                                {fmt(item.per_head_price ?? 0)}/head × {item.expected_heads ?? 0} expected
                              </p>
                            )}
                            {!item.is_booked && planned > 0 && <p className="mt-0.5 text-xs text-admin-ink/55">estimate</p>}
                          </td>
                          <td className="px-3 py-4 text-right tabular-nums">
                            {perHead ? (
                              <>
                                <p className="text-admin-ink">{fmt(actual)}</p>
                                <p className="mt-0.5 text-xs text-admin-ink/55">× {attendingCount} confirmed</p>
                              </>
                            ) : (
                              <p className="text-admin-ink/45">{planned > 0 ? fmt(actual) : '—'}</p>
                            )}
                          </td>
                          <td className="px-3 py-4 text-right tabular-nums text-admin-ink">{itemPaid > 0 ? fmt(itemPaid) : '—'}</td>
                          <td className="px-3 py-4">
                            <span className={`inline-block whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-right text-admin-ink/40">{expanded ? '▾' : '▸'}</td>
                        </tr>

                        {expanded && (
                          <tr className="border-b border-admin-sand/15 bg-admin-bone/40">
                            <td colSpan={7} className="px-6 py-5">
                              {/* Payment schedule */}
                              {itemPayments.length === 0 && paymentFormItemId !== item.id && (
                                <p className="text-sm text-admin-ink/55">No payments logged yet.</p>
                              )}
                              <div className="space-y-2">
                                {itemPayments.map((p, i) => {
                                  const overdue = isOverdue(p, today);
                                  return (
                                    <div key={p.id} className="flex flex-wrap items-center gap-3 text-sm">
                                      <span
                                        className={`h-2 w-2 shrink-0 rounded-full ${
                                          p.paid_date ? 'bg-admin-green' : overdue ? 'bg-admin-persimmon' : 'bg-admin-ink/25'
                                        }`}
                                      />
                                      <span className="w-24 font-medium tabular-nums text-admin-ink">{fmt(p.amount)}</span>
                                      <span className="text-admin-ink/65">
                                        {p.label || `Payment ${i + 1}`}
                                        {p.paid_date
                                          ? ` — paid ${fmtDate(p.paid_date)}`
                                          : p.due_date
                                            ? ` — due ${fmtDate(p.due_date)}`
                                            : ''}
                                        {overdue && <span className="ml-2 font-medium text-admin-persimmon">overdue</span>}
                                      </span>
                                      <span className="ml-auto flex gap-2">
                                        {p.paid_date ? (
                                          <button
                                            type="button"
                                            onClick={() => setPaymentPaid(p, null)}
                                            className="rounded-full border border-admin-ink/10 px-3 py-1 text-xs text-admin-ink/60 transition hover:bg-admin-ink/5"
                                          >
                                            Undo paid
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setPaymentPaid(p, todayIso())}
                                            className="rounded-full border border-admin-green/25 bg-admin-green/10 px-3 py-1 text-xs font-medium text-admin-green transition hover:bg-admin-green/20"
                                          >
                                            Mark paid
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => deletePayment(p.id)}
                                          className="rounded-full border border-admin-persimmon/20 px-3 py-1 text-xs text-admin-persimmon transition hover:bg-admin-persimmon/10"
                                        >
                                          Delete
                                        </button>
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Add payment */}
                              {paymentFormItemId === item.id ? (
                                <form onSubmit={e => submitPayment(e, item.id)} className="mt-4 flex flex-wrap items-end gap-3">
                                  <label className="block">
                                    <span className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-admin-ink/50">Label</span>
                                    <input
                                      value={paymentForm.label}
                                      onChange={e => setPaymentForm(prev => ({ ...prev, label: e.target.value }))}
                                      placeholder="e.g. Booking deposit"
                                      className="w-44 rounded-xl border border-admin-sand/40 bg-white px-3 py-2 text-sm text-admin-ink outline-none transition focus:border-admin-green"
                                    />
                                  </label>
                                  <label className="block">
                                    <span className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-admin-ink/50">Amount</span>
                                    <input
                                      value={paymentForm.amount}
                                      onChange={e => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      required
                                      placeholder="0.00"
                                      className="w-28 rounded-xl border border-admin-sand/40 bg-white px-3 py-2 text-sm text-admin-ink outline-none transition focus:border-admin-green"
                                    />
                                  </label>
                                  <label className="block">
                                    <span className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-admin-ink/50">Due date</span>
                                    <input
                                      value={paymentForm.due_date}
                                      onChange={e => setPaymentForm(prev => ({ ...prev, due_date: e.target.value }))}
                                      type="date"
                                      className="rounded-xl border border-admin-sand/40 bg-white px-3 py-2 text-sm text-admin-ink outline-none transition focus:border-admin-green"
                                    />
                                  </label>
                                  <label className="flex items-center gap-2 pb-2 text-sm text-admin-ink/70">
                                    <input
                                      type="checkbox"
                                      checked={paymentForm.already_paid}
                                      onChange={e => setPaymentForm(prev => ({ ...prev, already_paid: e.target.checked }))}
                                      className="h-4 w-4 accent-[#0F7A52]"
                                    />
                                    Already paid
                                  </label>
                                  <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-full bg-admin-green px-4 py-2 text-xs font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-60"
                                  >
                                    Add
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPaymentFormItemId(null)}
                                    className="rounded-full border border-admin-ink/10 px-4 py-2 text-xs text-admin-ink/60 transition hover:bg-admin-ink/5"
                                  >
                                    Cancel
                                  </button>
                                </form>
                              ) : (
                                <div className="mt-4 flex flex-wrap gap-3">
                                  <button
                                    type="button"
                                    onClick={() => openPaymentForm(item.id)}
                                    className="text-sm font-semibold text-admin-green transition hover:text-admin-green/75"
                                  >
                                    + Add payment
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEditItem(item)}
                                    className="text-sm text-admin-ink/60 transition hover:text-admin-ink"
                                  >
                                    Edit supplier
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteItem(item.id)}
                                    className="text-sm text-admin-persimmon/80 transition hover:text-admin-persimmon"
                                  >
                                    Delete supplier
                                  </button>
                                </div>
                              )}

                              {item.notes && (
                                <p className="mt-4 border-t border-admin-sand/20 pt-3 text-xs text-admin-ink/55">{item.notes}</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </FragmentRow>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Side panels ── */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-admin-sand/20 bg-white p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Upcoming payments</p>
            {upcoming.length === 0 ? (
              <p className="mt-4 text-sm text-admin-ink/55">Nothing scheduled. Add due dates to payments to see them here.</p>
            ) : (
              <div className="mt-2 divide-y divide-admin-sand/15">
                {upcoming.map(p => {
                  const overdue = isOverdue(p, today);
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-admin-ink">{itemName(p.item_id)}</p>
                        {p.label && <p className="mt-0.5 text-xs text-admin-ink/55">{p.label}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-admin-ink">{fmt(p.amount)}</p>
                        <p className={`mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${overdue ? 'text-admin-persimmon' : 'text-admin-warning'}`}>
                          {overdue ? 'Overdue' : `Due ${fmtDate(p.due_date!)}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-admin-sand/20 bg-white p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">By category</p>
            {byCategory.length === 0 ? (
              <p className="mt-4 text-sm text-admin-ink/55">Totals appear as you add suppliers.</p>
            ) : (
              <div className="mt-2 divide-y divide-admin-sand/15">
                {byCategory.map(([category, total]) => (
                  <div key={category} className="flex items-center justify-between py-3">
                    <p className="text-sm font-medium text-admin-ink">{category}</p>
                    <p className="text-sm font-semibold tabular-nums text-admin-ink">{fmt(total)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {hasPerHead && (
            <div className="rounded-3xl border border-admin-sand/20 bg-white p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Per-head basis</p>
              <p className="mt-3 text-sm leading-relaxed text-admin-ink/70">
                <span className="font-semibold text-admin-ink">{attendingCount}</span> guest{attendingCount === 1 ? '' : 's'} confirmed attending ·{' '}
                <span className="font-semibold text-admin-ink">{invitedCount}</span> invited &amp; not declined.
                Per-head “Actual” updates automatically as RSVPs come in.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Supplier modal ── */}
      {itemFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setItemFormOpen(false)} />
          <div className="relative w-full max-w-xl rounded-[2rem] border border-white/10 bg-admin-ink p-8 shadow-2xl shadow-black/60 max-h-[90vh] overflow-y-auto">
            <p className="text-sm uppercase tracking-[0.3em] text-admin-sand">
              {editingItemId ? 'Edit supplier' : 'New supplier'}
            </p>
            <h2 className="mt-2 mb-7 text-2xl font-semibold text-admin-bone">
              {editingItemId ? 'Update this supplier' : 'Add a supplier'}
            </h2>

            <form onSubmit={submitItem} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-bone/60">Supplier</span>
                  <input
                    value={itemForm.supplier_name}
                    onChange={e => setField('supplier_name', e.target.value)}
                    required
                    placeholder="e.g. QT Hotel Melbourne"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-admin-bone placeholder-admin-bone/30 outline-none transition focus:border-admin-green"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-bone/60">Category</span>
                  <input
                    value={itemForm.category}
                    onChange={e => setField('category', e.target.value)}
                    required
                    list="budget-categories"
                    placeholder="e.g. Catering"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-admin-bone placeholder-admin-bone/30 outline-none transition focus:border-admin-green"
                  />
                  <datalist id="budget-categories">
                    {BUDGET_CATEGORIES.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-bone/60">Description</span>
                <input
                  value={itemForm.description}
                  onChange={e => setField('description', e.target.value)}
                  placeholder="e.g. Venue, catering & beverage package"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-admin-bone placeholder-admin-bone/30 outline-none transition focus:border-admin-green"
                />
              </label>

              {/* Pricing mode */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex gap-2">
                  {(['fixed', 'per_head'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setField('pricing_mode', mode)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] transition ${
                        itemForm.pricing_mode === mode
                          ? 'bg-admin-green text-admin-bone'
                          : 'bg-white/5 text-admin-bone/50 hover:text-admin-bone'
                      }`}
                    >
                      {mode === 'fixed' ? 'Fixed price' : 'Per head'}
                    </button>
                  ))}
                </div>

                {itemForm.pricing_mode === 'fixed' ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-bone/60">Estimated cost</span>
                      <input
                        value={itemForm.estimated_cost}
                        onChange={e => setField('estimated_cost', e.target.value)}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="If still quoting"
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-admin-bone placeholder-admin-bone/30 outline-none transition focus:border-admin-green"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-bone/60">Agreed cost</span>
                      <input
                        value={itemForm.agreed_cost}
                        onChange={e => setField('agreed_cost', e.target.value)}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Contracted amount"
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-admin-bone placeholder-admin-bone/30 outline-none transition focus:border-admin-green"
                      />
                    </label>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-bone/60">Price per head</span>
                        <input
                          value={itemForm.per_head_price}
                          onChange={e => setField('per_head_price', e.target.value)}
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          placeholder="e.g. 135"
                          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-admin-bone placeholder-admin-bone/30 outline-none transition focus:border-admin-green"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-bone/60">Expected guests</span>
                        <input
                          value={itemForm.expected_heads}
                          onChange={e => setField('expected_heads', e.target.value)}
                          type="number"
                          min="0"
                          step="1"
                          placeholder={String(invitedCount)}
                          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-admin-bone placeholder-admin-bone/30 outline-none transition focus:border-admin-green"
                        />
                      </label>
                    </div>
                    <div className="mt-4 rounded-xl bg-black/20 px-4 py-3 text-sm text-admin-bone/70">
                      <p>
                        Planned: <span className="font-semibold text-admin-bone">{fmt(formPerHeadPlanned)}</span>
                        <span className="text-admin-bone/45"> ({itemForm.expected_heads || 0} expected)</span>
                      </p>
                      <p className="mt-1">
                        Actual today: <span className="font-semibold text-admin-bone">{fmt(formPerHeadActual)}</span>
                        <span className="text-admin-bone/45"> ({attendingCount} confirmed — updates with RSVPs)</span>
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                <div>
                  <p className="text-sm text-admin-bone">Booked</p>
                  <p className="text-xs text-admin-bone/50">Unbooked suppliers count as estimates</p>
                </div>
                <button
                  type="button"
                  onClick={() => setField('is_booked', !itemForm.is_booked)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${itemForm.is_booked ? 'bg-admin-green' : 'bg-admin-bone/20'}`}
                  aria-label="Toggle booked"
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${itemForm.is_booked ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-bone/60">Notes</span>
                <textarea
                  value={itemForm.notes}
                  onChange={e => setField('notes', e.target.value)}
                  rows={2}
                  placeholder="Contract details, contacts, reminders…"
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-admin-bone placeholder-admin-bone/30 outline-none transition focus:border-admin-green"
                />
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
                  {saving ? 'Saving…' : editingItemId ? 'Update supplier' : 'Add supplier'}
                </button>
                <button
                  type="button"
                  onClick={() => setItemFormOpen(false)}
                  className="rounded-3xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-admin-bone transition hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Set budget modal ── */}
      {budgetFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setBudgetFormOpen(false)} />
          <div className="relative w-full max-w-sm rounded-[2rem] border border-white/10 bg-admin-ink p-8 shadow-2xl shadow-black/60">
            <p className="text-sm uppercase tracking-[0.3em] text-admin-sand">Budget target</p>
            <h2 className="mt-2 mb-6 text-2xl font-semibold text-admin-bone">Set your total budget</h2>
            <form onSubmit={submitBudget} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-admin-bone/60">Total budget (AUD)</span>
                <input
                  value={budgetInput}
                  onChange={e => setBudgetInput(e.target.value)}
                  type="number"
                  min="0"
                  step="1"
                  autoFocus
                  placeholder="e.g. 60000"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-admin-bone placeholder-admin-bone/30 outline-none transition focus:border-admin-green"
                />
              </label>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-3xl bg-admin-green px-5 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetFormOpen(false)}
                  className="rounded-3xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-admin-bone transition hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// React requires a single element per map iteration; a keyed fragment wrapper
// lets each supplier render its main row plus an optional expanded row.
function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
