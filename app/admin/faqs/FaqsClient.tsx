'use client';

import { useState } from 'react';
import type { Faq } from '@/lib/supabase';

interface FormState {
  question: string;
  answer: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  question: '',
  answer: '',
  is_active: true,
};

export default function FaqsClient({ faqs: initial }: { faqs: Faq[] }) {
  const [faqs, setFaqs] = useState<Faq[]>(initial);
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
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(faq: Faq) {
    setEditingId(faq.id);
    setForm({ question: faq.question, answer: faq.answer, is_active: faq.is_active });
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

  async function handleDrop(e: React.DragEvent, toIndex: number) {
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData('text/plain'));
    if (fromIndex === toIndex) return;

    const reordered = Array.from(faqs);
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const withOrder = reordered.map((f, i) => ({ ...f, display_order: i }));
    setFaqs(withOrder);

    await Promise.all(
      withOrder.map(f =>
        fetch(`/admin/api/faqs/${f.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_order: f.display_order }),
        })
      )
    );
  }

  async function handleToggleActive(id: string, currentlyActive: boolean) {
    const next = !currentlyActive;
    setFaqs(prev => prev.map(f => f.id === id ? { ...f, is_active: next } : f));

    const res = await fetch(`/admin/api/faqs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: next }),
    });

    if (!res.ok) {
      setFaqs(prev => prev.map(f => f.id === id ? { ...f, is_active: currentlyActive } : f));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this FAQ? This cannot be undone.')) return;
    setDeleting(id);

    const res = await fetch(`/admin/api/faqs/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setFaqs(prev => prev.filter(f => f.id !== id));
    }

    setDeleting(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) {
      setFormError('Question and answer are required.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const body = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      is_active: form.is_active,
      ...(editingId ? {} : { display_order: faqs.length }),
    };

    const url = editingId ? `/admin/api/faqs/${editingId}` : '/admin/api/faqs';
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

    const saved: Faq = await res.json();
    setFaqs(prev =>
      editingId ? prev.map(f => f.id === editingId ? saved : f) : [...prev, saved]
    );
    setSaving(false);
    closeForm();
  }

  return (
    <>
      <div className="rounded-3xl border border-white/10 bg-white/5 shadow-lg shadow-slate-950/20 backdrop-blur-xl overflow-hidden">
        {faqs.length === 0 ? (
          <div className="px-8 py-16 text-center">
            <p className="text-slate-400">No FAQs yet.</p>
            <p className="mt-1 text-sm text-slate-500">Add your first FAQ below.</p>
          </div>
        ) : (
          <ul>
            {faqs.map((faq, index) => (
              <li
                key={faq.id}
                draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, index)}
                className="flex items-start gap-4 border-b border-white/5 px-6 py-5 last:border-b-0 transition hover:bg-white/[0.03] cursor-default"
              >
                <div className="cursor-move select-none pt-0.5 text-slate-500 text-lg leading-none shrink-0">
                  ⠿
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white leading-snug font-medium">{faq.question}</p>
                  <p className="mt-1 text-sm text-slate-400 leading-relaxed line-clamp-2">{faq.answer}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(faq.id, faq.is_active)}
                    className={`text-xs uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border transition ${
                      faq.is_active
                        ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20 hover:bg-emerald-400/20'
                        : 'bg-white/5 text-slate-500 border-white/10 hover:text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {faq.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(faq)}
                    className="text-sm text-slate-300 hover:text-white transition px-3 py-1.5 rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/5"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(faq.id)}
                    disabled={deleting === faq.id}
                    className="text-sm text-rose-400 hover:text-rose-200 transition px-3 py-1.5 rounded-2xl border border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/10 disabled:opacity-40"
                  >
                    {deleting === faq.id ? '…' : 'Delete'}
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
          className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
        >
          + Add FAQ
        </button>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#06120B] p-8 shadow-2xl shadow-slate-950/60 max-h-[90vh] overflow-y-auto">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">
              {editingId ? 'Edit FAQ' : 'New FAQ'}
            </p>
            <h2 className="mt-2 mb-7 text-2xl font-semibold text-white">
              {editingId ? 'Update this FAQ' : 'Add a FAQ'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.25em] text-slate-400 block mb-2">Question</span>
                <input
                  value={form.question}
                  onChange={e => setField('question', e.target.value)}
                  required
                  placeholder="e.g. Is there parking at the venue?"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white placeholder-slate-600 outline-none transition focus:border-emerald-400"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.25em] text-slate-400 block mb-2">Answer</span>
                <textarea
                  value={form.answer}
                  onChange={e => setField('answer', e.target.value)}
                  rows={4}
                  required
                  placeholder="e.g. Yes, there is free parking available on site."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white placeholder-slate-600 outline-none transition focus:border-emerald-400 resize-none"
                />
              </label>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                <div>
                  <p className="text-sm text-white">Active</p>
                  <p className="text-xs text-slate-500">Inactive FAQs are hidden from guests</p>
                </div>
                <button
                  type="button"
                  onClick={() => setField('is_active', !form.is_active)}
                  className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${
                    form.is_active ? 'bg-emerald-500' : 'bg-slate-700'
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
                <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-3xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : editingId ? 'Update FAQ' : 'Add FAQ'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-3xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white transition hover:bg-white/10"
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
