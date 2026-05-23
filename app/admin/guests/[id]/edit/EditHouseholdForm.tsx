'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const dietaryOptions = [
  { value: 'none', label: 'No preference' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten_free', label: 'Gluten Free' },
  { value: 'dairy_free', label: 'Dairy Free' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
  { value: 'shellfish_allergy', label: 'Shellfish Allergy' },
  { value: 'nut_allergy', label: 'Nut Allergy' },
  { value: 'other', label: 'Other' },
];

const initialGuestShape = { first_name: '', last_name: '', is_child: false, dietary_requirement: 'none', dietary_other: null, rsvp_status: 'pending' };

interface HouseholdFormData {
  id: string;
  name: string;
  slug: string;
  primary_email: string;
  secondary_email?: string;
  mobile_numbers?: Array<{ number: string; label: string }>;
  tags?: string[];
  personal_message?: string;
  plus_one_allowance: number;
  personal_photo_url?: string;
  guests?: Array<{
    first_name: string;
    last_name: string;
    is_child: boolean;
    dietary_requirement: string;
    dietary_other?: string;
    rsvp_status: string;
  }>;
}

export default function EditHouseholdForm({ initial }: { initial: HouseholdFormData }) {
  const [householdName, setHouseholdName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(false);
  const [primaryEmail, setPrimaryEmail] = useState(initial?.primary_email ?? '');
  const [secondaryEmail, setSecondaryEmail] = useState(initial?.secondary_email ?? '');
    const [mobileNumbers, setMobileNumbers] = useState<Array<{ number: string; label: string }>>(Array.isArray(initial?.mobile_numbers) && initial.mobile_numbers.length ? initial.mobile_numbers : [{ number: '', label: '' }]);
  const [mobileErrors, setMobileErrors] = useState<string[]>([]);
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [personalMessage, setPersonalMessage] = useState(initial?.personal_message ?? '');
  const [plusOneAllowance, setPlusOneAllowance] = useState(initial?.plus_one_allowance ?? 0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initial?.personal_photo_url ?? null);
  const [guests, setGuests] = useState<any[]>(Array.isArray(initial?.guests) && initial.guests.length ? initial.guests.map((g: any) => ({
    firstName: g.first_name,
    lastName: g.last_name,
    isChild: Boolean(g.is_child),
    dietaryRequirement: g.dietary_requirement || 'none',
    dietaryOther: g.dietary_other || '',
    rsvpStatus: g.rsvp_status || 'pending',
  })) : [{ ...initialGuestShape, firstName: '', lastName: '' }] );
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setHouseholdName(initial?.name ?? '');
    setSlug(initial?.slug ?? '');
    setPrimaryEmail(initial?.primary_email ?? '');
    setSecondaryEmail(initial?.secondary_email ?? '');
      setMobileNumbers(Array.isArray(initial?.mobile_numbers) && initial.mobile_numbers.length ? initial.mobile_numbers : [{ number: '', label: '' }]);
    setTags((initial?.tags ?? []).join(', '));
    setPersonalMessage(initial?.personal_message ?? '');
    setPlusOneAllowance(initial?.plus_one_allowance ?? 0);
    setPhotoPreview(initial?.personal_photo_url ?? null);
    setGuests(Array.isArray(initial?.guests) && initial.guests.length ? initial.guests.map((g: any) => ({
      firstName: g.first_name,
      lastName: g.last_name,
      isChild: Boolean(g.is_child),
      dietaryRequirement: g.dietary_requirement || 'none',
      dietaryOther: g.dietary_other || '',
      rsvpStatus: g.rsvp_status || 'pending',
    })) : [{ ...initialGuestShape, firstName: '', lastName: '' }] );
  }, [initial]);

  useEffect(() => {
    if (!slugEdited) setSlug(householdName ? householdName.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-') : '');
  }, [householdName, slugEdited]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(initial?.personal_photo_url ?? null);
      return;
    }
    const objectUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photoFile, initial]);

  function normalizeAustralianMobile(value: string) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    if (raw.startsWith('+')) {
      const digits = raw.replace(/[^0-9]/g, '');
      if (digits.startsWith('61') && digits.length === 11) {
        return `+${digits}`;
      }
      return null;
    }
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('04')) {
      return '+61' + digits.slice(1);
    }
    if (digits.length === 9 && digits.startsWith('4')) {
      return '+61' + digits;
    }
    if (digits.length === 11 && digits.startsWith('61')) {
      return '+' + digits;
    }
    return null;
  }

  const updateGuest = (index: number, key: string, value: any) => {
    setGuests((prev) => prev.map((guest, idx) => (idx === index ? { ...guest, [key]: value } : guest)));
  };

  const addGuest = () => setGuests((prev) => [...prev, { firstName: '', lastName: '', isChild: false, dietaryRequirement: 'none', dietaryOther: '', rsvpStatus: 'pending' }]);
  const removeGuest = (index: number) => setGuests((prev) => prev.filter((_, idx) => idx !== index));

  const reorderGuests = (fromIndex: number, toIndex: number) => {
    const newGuests = Array.from(guests);
    const [movedGuest] = newGuests.splice(fromIndex, 1);
    newGuests.splice(toIndex, 0, movedGuest);
    setGuests(newGuests);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData('text/plain'));
    if (fromIndex !== toIndex) {
      reorderGuests(fromIndex, toIndex);
    }
  };


  const updateMobileNumber = (index: number, field: 'number' | 'label', value: string) => {
    setMobileNumbers((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  };
  const addMobile = () => setMobileNumbers((prev) => [...prev, { number: '', label: '' }]);
  const removeMobile = (index: number) => setMobileNumbers((prev) => prev.filter((_, idx) => idx !== index));

  const handleMobileBlur = (index: number) => {
    const value = mobileNumbers[index]?.number ?? '';
    const normalized = normalizeAustralianMobile(value);
    setMobileErrors((prev) => {
      const copy = [...prev];
      while (copy.length < mobileNumbers.length) copy.push('');
      if (!normalized) {
        copy[index] = 'Invalid Australian mobile (start with 04 or +614)';
      } else {
        copy[index] = '';
      }
      return copy;
    });
    if (normalized) {
      updateMobileNumber(index, 'number', normalized);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      try {
        const body = new FormData();
        body.append('name', householdName);
        body.append('slug', slug);
        body.append('primary_email', primaryEmail);
        body.append('secondary_email', secondaryEmail || '');
          body.append('mobile_numbers', JSON.stringify(mobileNumbers.filter((m) => m.number)));
        body.append('tags', JSON.stringify(tags.split(',').map((t: string) => t.trim()).filter(Boolean)));
        body.append('personal_message', personalMessage || '');
        body.append('plus_one_allowance', String(plusOneAllowance));
        body.append('guests', JSON.stringify(guests.map((g, idx) => ({ first_name: g.firstName, last_name: g.lastName, is_child: Boolean(g.isChild), dietary_requirement: g.dietaryRequirement, dietary_other: g.dietaryOther || null, rsvp_status: g.rsvpStatus, display_order: idx }))));
        if (photoFile) body.append('photo', photoFile);

        const res = await fetch(`/admin/api/guests/${initial.id}`, { method: 'PATCH', body });
        if (!res.ok) {
          const j = await res.json();
          setError(j?.message || 'Failed to update');
          return;
        }
        router.push('/admin/guests');
      } catch (err) {
        setError('Unexpected error');
      }
    });
  };

  const inviteUrl = useMemo(() => `${process.env.NEXT_PUBLIC_SITE_URL ? `https://${process.env.NEXT_PUBLIC_SITE_URL.replace(/https?:\/\//, '')}` : (typeof window !== 'undefined' ? window.location.origin : '')}/invite/${slug || 'your-household'}`, [slug]);

  return (
    <form onSubmit={handleSubmit} className="space-y-8 rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-slate-950/20">
      <div className="grid gap-6 lg:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-100">
          Household name
          <input
            value={householdName}
            onChange={(event) => {
              setHouseholdName(event.target.value);
              if (!slugEdited) setSlug(event.target.value ? event.target.value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-') : '');
            }}
            className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400"
            placeholder="Smith family"
            required
          />
        </label>
        <label className="space-y-2 text-sm text-slate-100">
          Invite code
          <input
            value={slug}
            onChange={(event) => {
              setSlug(event.target.value);
              setSlugEdited(true);
            }}
            className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400"
            placeholder="james-and-sarah"
            required
          />
          <p className="text-xs text-slate-500">Invite URL preview: <span className="text-emerald-200">{inviteUrl}</span></p>
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-100">
          Primary email
          <input
            type="email"
            value={primaryEmail}
            onChange={(event) => setPrimaryEmail(event.target.value)}
            className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400"
            placeholder="smith@example.com"
            required
          />
        </label>
        <label className="space-y-2 text-sm text-slate-100">
          Additional guest allowance
          <select
            value={plusOneAllowance}
            onChange={(event) => setPlusOneAllowance(Number(event.target.value))}
            className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400"
          >
            <option value={0}>0 additional guests</option>
            <option value={1}>1 additional guest</option>
            <option value={2}>2 additional guests</option>
          </select>
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-100">
          Secondary email
          <input
            type="email"
            value={secondaryEmail}
            onChange={(event) => setSecondaryEmail(event.target.value)}
            className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400"
            placeholder="optional@example.com"
          />
        </label>
        <label className="space-y-2 text-sm text-slate-100">
          Tags (comma-separated)
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            onFocus={async () => {
              setShowTagSuggestions(true);
              try {
                const res = await fetch('/admin/api/tags');
                if (res.ok) {
                  const json = await res.json();
                  setTagSuggestions(Array.isArray(json) ? json : []);
                }
              } catch (e) {
                // ignore
              }
            }}
            onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
            className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400"
            placeholder="family, close friends"
          />
          {showTagSuggestions && tagSuggestions.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {tagSuggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const existing = tags.split(',').map((t: string) => t.trim()).filter(Boolean);
                    if (!existing.includes(tag)) {
                      const next = existing.concat(tag).join(', ');
                      setTags(next);
                    }
                  }}
                  className="rounded-full bg-white/5 px-3 py-1 text-sm text-slate-200"
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : null}
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-100">
          Personal photo (optional)
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setPhotoFile(file);
            }}
            className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none file:border-0 file:bg-white/5 file:px-3 file:py-2 file:text-sm file:text-slate-200"
          />
          {photoPreview ? (
            <div className="mt-3 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90">
              <img src={photoPreview} alt="Preview" className="h-40 w-full object-cover" />
            </div>
          ) : null}
        </label>
        <label className="space-y-2 text-sm text-slate-100">
          Invite URL preview
          <div className="rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-slate-300">
            <p className="text-sm text-slate-300">{inviteUrl}</p>
          </div>
        </label>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Phone numbers</h2>
          <button type="button" onClick={addMobile} className="rounded-full border border-white/10 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/15">Add number</button>
        </div>
        <div className="space-y-4">
          {mobileNumbers.map((number, index) => (
            <div key={index} className="flex gap-4">
              <input
                value={number.number}
                onChange={(event) => updateMobileNumber(index, 'number', event.target.value)}
                onBlur={() => handleMobileBlur(index)}
                className="flex-1 rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400"
                placeholder="Mobile number"
              />
              <input
                value={number.label}
                onChange={(event) => updateMobileNumber(index, 'label', event.target.value)}
                className="w-32 rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400"
                placeholder="Label (e.g., mobile)"
              />
              {mobileNumbers.length > 1 ? (
                <button type="button" onClick={() => removeMobile(index)} className="rounded-3xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200 transition hover:bg-rose-500/15">Remove</button>
              ) : null}
            </div>
          ))}
          {mobileErrors.map((err, i) => err ? <div key={i} className="text-rose-300 text-xs">{err}</div> : null)}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Guest details</h2>
          <button type="button" onClick={addGuest} className="rounded-full border border-white/10 bg-amber-300/15 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-300/20">Add guest</button>
        </div>
        <div className="space-y-6">
          {guests.map((guest, index) => (
            <div
              key={index}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className="flex gap-4 rounded-3xl border border-white/10 bg-slate-950/80 p-6 cursor-move transition hover:border-emerald-400/40"
            >
              <div className="select-none pt-1 text-slate-400 font-bold text-lg">⠿</div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <p className="text-sm font-semibold text-white">Guest {index + 1}</p>
                  {guests.length > 1 ? (
                    <button type="button" onClick={() => removeGuest(index)} className="rounded-full bg-rose-500/10 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-500/15">Remove</button>
                  ) : null}
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-100">
                    First name
                    <input value={guest.firstName} onChange={(e) => updateGuest(index, 'firstName', e.target.value)} className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400" required />
                  </label>
                  <label className="space-y-2 text-sm text-slate-100">
                    Last name
                    <input value={guest.lastName} onChange={(e) => updateGuest(index, 'lastName', e.target.value)} className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400" required />
                  </label>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  <label className="space-y-2 text-sm text-slate-100">
                    RSVP status
                    <select value={guest.rsvpStatus} onChange={(e) => updateGuest(index, 'rsvpStatus', e.target.value)} className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400">
                      <option value="pending">Pending</option>
                      <option value="attending">Attending</option>
                      <option value="declined">Declined</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm text-slate-100">
                    Dietary requirement
                    <select value={guest.dietaryRequirement} onChange={(e) => updateGuest(index, 'dietaryRequirement', e.target.value)} className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400">
                      {dietaryOptions.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm text-slate-100">
                    Child?
                    <select value={guest.isChild ? 'yes' : 'no'} onChange={(e) => updateGuest(index, 'isChild', e.target.value === 'yes')} className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400">
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </label>
                </div>
                {guest.dietaryRequirement === 'other' ? (
                  <label className="space-y-2 text-sm text-slate-100">
                    Dietary details
                    <input value={guest.dietaryOther} onChange={(e) => updateGuest(index, 'dietaryOther', e.target.value)} className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Please describe" />
                  </label>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="space-y-2 text-sm text-slate-100">
        Personal message
        <textarea value={personalMessage} onChange={(e) => setPersonalMessage(e.target.value)} rows={4} className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Message for the household, optional." />
      </label>
      {error ? <div className="rounded-3xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="w-full rounded-3xl bg-amber-300 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70">{isPending ? 'Saving...' : 'Save household'}</button>
        <button type="button" onClick={() => router.push('/admin/guests')} className="rounded-3xl border border-white/10 px-4 py-3">Cancel</button>
      </div>
    </form>
  );
}
