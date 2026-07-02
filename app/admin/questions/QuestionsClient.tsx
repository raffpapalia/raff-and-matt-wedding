'use client';

import { useState } from 'react';
import type { CustomQuestion, QuestionType } from '@/lib/supabase';

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_META: Record<QuestionType, { label: string; colorClass: string }> = {
  text:     { label: 'Short text',    colorClass: 'bg-admin-ink/10 text-admin-ink/70 border-admin-ink/20' },
  textarea: { label: 'Long text',     colorClass: 'bg-admin-green/10 text-admin-green border-admin-green/20' },
  yes_no:   { label: 'Yes / No',      colorClass: 'bg-admin-sand/25 text-admin-ink/80 border-admin-sand/40' },
  dropdown: { label: 'Dropdown',      colorClass: 'bg-admin-warning-bg text-admin-warning border-admin-warning/30' },
  song:     { label: 'Song request',  colorClass: 'bg-admin-violet/25 text-admin-ink/80 border-admin-violet/40' },
};

interface FormState {
  question_text: string;
  question_type: QuestionType;
  options: string[];
  target_tags: string[];
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  question_text: '',
  question_type: 'text',
  options: [],
  target_tags: [],
  is_active: true,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: QuestionType }) {
  const meta = TYPE_META[type] ?? { label: type, colorClass: 'bg-admin-ink/10 text-admin-ink/70 border-admin-ink/20' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.colorClass}`}>
      {meta.label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  questions: CustomQuestion[];
  availableTags: string[];
}

export default function QuestionsClient({ questions: initial, availableTags }: Props) {
  const [questions, setQuestions] = useState<CustomQuestion[]>(initial);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Form helpers ────────────────────────────────────────────────────────────

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(q: CustomQuestion) {
    setEditingId(q.id);
    setForm({
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options ?? [],
      target_tags: q.target_tags ?? [],
      is_active: q.is_active,
    });
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setFormError(null);
  }

  function addOption() {
    setField('options', [...form.options, '']);
  }

  function updateOption(i: number, val: string) {
    setField('options', form.options.map((o, idx) => (idx === i ? val : o)));
  }

  function removeOption(i: number) {
    setField('options', form.options.filter((_, idx) => idx !== i));
  }

  function toggleTag(tag: string) {
    const has = form.target_tags.includes(tag);
    setField('target_tags', has ? form.target_tags.filter(t => t !== tag) : [...form.target_tags, tag]);
  }

  // ── Drag-to-reorder (native HTML5 — same pattern as EditHouseholdForm) ──────

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

    const reordered = Array.from(questions);
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const withOrder = reordered.map((q, i) => ({ ...q, display_order: i }));
    setQuestions(withOrder);

    // Persist all new display_order values
    await Promise.all(
      withOrder.map(q =>
        fetch(`/admin/api/questions/${q.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_order: q.display_order }),
        })
      )
    );
  }

  // ── Active toggle (optimistic) ───────────────────────────────────────────────

  async function handleToggleActive(id: string, currentlyActive: boolean) {
    const next = !currentlyActive;
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, is_active: next } : q));

    const res = await fetch(`/admin/api/questions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: next }),
    });

    if (!res.ok) {
      // Revert on failure
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, is_active: currentlyActive } : q));
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Delete this question? This cannot be undone.')) return;
    setDeleting(id);

    const res = await fetch(`/admin/api/questions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setQuestions(prev => prev.filter(q => q.id !== id));
    }

    setDeleting(null);
  }

  // ── Submit (add / edit) ──────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.question_text.trim()) {
      setFormError('Question text is required.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const body = {
      question_text: form.question_text.trim(),
      question_type: form.question_type,
      options: form.question_type === 'dropdown' ? form.options.filter(o => o.trim()) : null,
      target_tags: form.target_tags,
      is_active: form.is_active,
      ...(editingId ? {} : { display_order: questions.length }),
    };

    const url = editingId ? `/admin/api/questions/${editingId}` : '/admin/api/questions';
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

    const saved: CustomQuestion = await res.json();
    setQuestions(prev =>
      editingId ? prev.map(q => q.id === editingId ? saved : q) : [...prev, saved]
    );
    setSaving(false);
    closeForm();
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Question list */}
      <div className="rounded-3xl border border-admin-sand/20 bg-white overflow-hidden">
        {questions.length === 0 ? (
          <div className="px-8 py-16 text-center">
            <p className="text-admin-ink/60">No questions yet.</p>
            <p className="mt-1 text-sm text-admin-ink/50">Add your first question below to get started.</p>
          </div>
        ) : (
          <ul>
            {questions.map((q, index) => (
              <li
                key={q.id}
                draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, index)}
                className="flex items-start gap-4 border-b border-admin-sand/10 px-6 py-5 last:border-b-0 transition hover:bg-admin-bone/40 cursor-default"
              >
                {/* Drag handle */}
                <div className="cursor-move select-none pt-0.5 text-admin-ink/50 text-lg leading-none shrink-0">
                  ⠿
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-admin-ink leading-snug">{q.question_text}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <TypeBadge type={q.question_type} />
                    {q.target_tags && q.target_tags.length > 0 ? (
                      <span className="text-xs text-admin-ink/60">
                        {q.target_tags.join(', ')}
                      </span>
                    ) : (
                      <span className="text-xs text-admin-ink/40">All households</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(q.id, q.is_active)}
                    className={`text-xs uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border transition ${
                      q.is_active
                        ? 'bg-admin-green/10 text-admin-green border-admin-green/20 hover:bg-admin-green/20'
                        : 'bg-admin-ink/5 text-admin-ink/40 border-admin-ink/10 hover:text-admin-ink/60 hover:bg-admin-ink/10'
                    }`}
                  >
                    {q.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(q)}
                    className="text-sm text-admin-ink/70 hover:text-admin-ink transition px-3 py-1.5 rounded-2xl border border-admin-ink/10 hover:border-admin-ink/20 hover:bg-admin-ink/5"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(q.id)}
                    disabled={deleting === q.id}
                    className="text-sm text-admin-persimmon hover:text-admin-persimmon/70 transition px-3 py-1.5 rounded-2xl border border-admin-persimmon/20 hover:border-admin-persimmon/40 hover:bg-admin-persimmon/10 disabled:opacity-40"
                  >
                    {deleting === q.id ? '…' : 'Delete'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add question button */}
      <div>
        <button
          type="button"
          onClick={openAdd}
          className="rounded-full bg-admin-green px-5 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90"
        >
          + Add question
        </button>
      </div>

      {/* Add / Edit modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeForm}
          />

          {/* Panel */}
          <div className="relative w-full max-w-lg rounded-[2rem] border border-white/10 bg-admin-ink p-8 shadow-2xl shadow-black/60 max-h-[90vh] overflow-y-auto">
            <p className="text-sm uppercase tracking-[0.3em] text-admin-sand">
              {editingId ? 'Edit question' : 'New question'}
            </p>
            <h2 className="mt-2 mb-7 text-2xl font-semibold text-admin-bone">
              {editingId ? 'Update this question' : 'Add a custom question'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Question text */}
              <label className="block">
                <span className="text-xs uppercase tracking-[0.25em] text-admin-bone/60 block mb-2">
                  Question text
                </span>
                <textarea
                  value={form.question_text}
                  onChange={e => setField('question_text', e.target.value)}
                  rows={3}
                  required
                  placeholder="e.g. Any songs you'd love to hear on the night?"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-admin-bone placeholder-admin-bone/30 outline-none transition focus:border-admin-green resize-none"
                />
              </label>

              {/* Question type */}
              <div>
                <span className="text-xs uppercase tracking-[0.25em] text-admin-bone/60 block mb-3">
                  Question type
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(Object.keys(TYPE_META) as QuestionType[]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setField('question_type', type)}
                      className={`px-4 py-3 rounded-2xl text-sm text-left transition border ${
                        form.question_type === type
                          ? 'border-admin-green bg-admin-green/15 text-admin-bone'
                          : 'border-white/10 bg-white/5 text-admin-bone/70 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      {TYPE_META[type].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dropdown options */}
              {form.question_type === 'dropdown' && (
                <div>
                  <span className="text-xs uppercase tracking-[0.25em] text-admin-bone/60 block mb-3">
                    Options
                  </span>
                  <div className="space-y-2">
                    {form.options.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          value={opt}
                          onChange={e => updateOption(i, e.target.value)}
                          placeholder={`Option ${i + 1}`}
                          className="flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-admin-bone text-sm placeholder-admin-bone/30 outline-none transition focus:border-admin-green"
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          className="px-3 text-admin-bone/50 hover:text-admin-persimmon transition text-lg leading-none"
                          aria-label="Remove option"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-3 text-sm text-admin-green hover:text-admin-green/70 transition"
                  >
                    + Add option
                  </button>
                </div>
              )}

              {/* Target tags */}
              <div>
                <span className="text-xs uppercase tracking-[0.25em] text-admin-bone/60 block mb-1">
                  Target households
                </span>
                <p className="text-xs text-admin-bone/40 mb-3">
                  Leave all unchecked to show to every household.
                </p>
                {availableTags.length === 0 ? (
                  <p className="text-sm text-admin-bone/50">No tags found. Add tags to households first.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => {
                      const checked = form.target_tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-4 py-2 rounded-full text-sm border transition ${
                            checked
                              ? 'bg-admin-green/15 text-admin-bone border-admin-green/50 hover:bg-admin-green/25'
                              : 'bg-white/5 text-admin-bone/60 border-white/10 hover:border-white/20 hover:text-admin-bone/80'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                <div>
                  <p className="text-sm text-admin-bone">Active</p>
                  <p className="text-xs text-admin-bone/50">Inactive questions are hidden from guests</p>
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

              {/* Error */}
              {formError && (
                <div className="rounded-2xl bg-admin-persimmon/10 px-4 py-3 text-sm text-admin-persimmon">
                  {formError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-3xl bg-admin-green px-5 py-3 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : editingId ? 'Update question' : 'Add question'}
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
