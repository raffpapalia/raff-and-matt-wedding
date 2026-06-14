'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import PhotoUpload from '../../../components/PhotoUpload';

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

interface HouseholdFormData {
  id: string;
  name: string;
  slug: string;
  tags?: string[];
  personal_message?: string;
  thank_you_message?: string;
  plus_one_allowance: number;
  personal_photo_url?: string;
  guests?: Array<{
    first_name: string;
    last_name: string;
    is_child: boolean;
    dietary_requirement: string;
    dietary_other?: string | null;
    rsvp_status: string;
    email?: string | null;
    mobile?: string | null;
    comms_email?: boolean;
    comms_sms?: boolean;
  }>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^(\+?61|0)4\d{8}$/;

function validateEmail(email: string, commsEmail: boolean, firstName: string): string | undefined {
  if (commsEmail && !email) return `Email address is required to send email to ${firstName || 'this guest'}`;
  if (email && !EMAIL_REGEX.test(email)) return 'Invalid email address';
}

function validateMobile(mobile: string, commsSms: boolean, firstName: string): string | undefined {
  if (commsSms && !mobile) return `Mobile number is required to send SMS to ${firstName || 'this guest'}`;
  const stripped = mobile.replace(/[\s-]/g, '');
  if (stripped && !MOBILE_REGEX.test(stripped)) return 'Invalid Australian mobile number (e.g. 0412 345 678)';
}

type GuestErrors = { email?: string; mobile?: string };

function makeGuestState(g: NonNullable<HouseholdFormData['guests']>[number]) {
  return {
    firstName: g.first_name,
    lastName: g.last_name,
    isChild: Boolean(g.is_child),
    dietaryRequirement: g.dietary_requirement || 'none',
    dietaryOther: g.dietary_other || '',
    rsvpStatus: g.rsvp_status || 'pending',
    email: g.email || '',
    mobile: g.mobile || '',
    commsEmail: g.comms_email !== false,
    commsSms: g.comms_sms !== false,
  };
}

const blankGuest = {
  firstName: '',
  lastName: '',
  isChild: false,
  dietaryRequirement: 'none',
  dietaryOther: '',
  rsvpStatus: 'pending',
  email: '',
  mobile: '',
  commsEmail: true,
  commsSms: true,
};

function initialGuestErrors(initial: HouseholdFormData): GuestErrors[] {
  const count = Array.isArray(initial?.guests) && initial.guests.length ? initial.guests.length : 1;
  return Array.from({ length: count }, () => ({}));
}

export default function EditHouseholdForm({ initial }: { initial: HouseholdFormData }) {
  const [householdName, setHouseholdName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(false);
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [personalMessage, setPersonalMessage] = useState(initial?.personal_message ?? '');
  const [thankYouMessage, setThankYouMessage] = useState(initial?.thank_you_message ?? '');
  const [plusOneAllowance, setPlusOneAllowance] = useState(initial?.plus_one_allowance ?? 0);
  const [personalPhotoUrl, setPersonalPhotoUrl] = useState<string | null>(initial?.personal_photo_url ?? null);
  const [guests, setGuests] = useState<ReturnType<typeof makeGuestState>[]>(
    Array.isArray(initial?.guests) && initial.guests.length
      ? initial.guests.map(makeGuestState)
      : [{ ...blankGuest }]
  );
  const [guestErrors, setGuestErrors] = useState<GuestErrors[]>(initialGuestErrors(initial));
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setHouseholdName(initial?.name ?? '');
    setSlug(initial?.slug ?? '');
    setTags((initial?.tags ?? []).join(', '));
    setPersonalMessage(initial?.personal_message ?? '');
    setThankYouMessage(initial?.thank_you_message ?? '');
    setPlusOneAllowance(initial?.plus_one_allowance ?? 0);
    setPersonalPhotoUrl(initial?.personal_photo_url ?? null);
    setGuests(
      Array.isArray(initial?.guests) && initial.guests.length
        ? initial.guests.map(makeGuestState)
        : [{ ...blankGuest }]
    );
    setGuestErrors(initialGuestErrors(initial));
  }, [initial]);

  useEffect(() => {
    if (!slugEdited) setSlug(householdName ? householdName.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-') : '');
  }, [householdName, slugEdited]);

  const updateGuest = (index: number, key: string, value: any) => {
    setGuests((prev) => prev.map((guest, idx) => (idx === index ? { ...guest, [key]: value } : guest)));
  };

  const updateGuestIsChild = (index: number, isChild: boolean) => {
    setGuests((prev) =>
      prev.map((guest, idx) => {
        if (idx !== index) return guest;
        return {
          ...guest,
          isChild,
          commsEmail: isChild ? false : guest.commsEmail,
          commsSms: isChild ? false : guest.commsSms,
        };
      })
    );
    if (isChild) {
      setGuestErrors((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], email: undefined, mobile: undefined };
        return next;
      });
    }
  };

  const setGuestFieldError = (index: number, field: keyof GuestErrors, message: string | undefined) => {
    setGuestErrors((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: message };
      return next;
    });
  };

  const handleEmailBlur = (index: number) => {
    const g = guests[index];
    setGuestFieldError(index, 'email', validateEmail(g.email, g.commsEmail, g.firstName));
  };

  const handleMobileBlur = (index: number) => {
    const g = guests[index];
    setGuestFieldError(index, 'mobile', validateMobile(g.mobile, g.commsSms, g.firstName));
  };

  const addGuest = () => {
    setGuests((prev) => [...prev, { ...blankGuest }]);
    setGuestErrors((prev) => [...prev, {}]);
  };

  const removeGuest = (index: number) => {
    setGuests((prev) => prev.filter((_, idx) => idx !== index));
    setGuestErrors((prev) => prev.filter((_, idx) => idx !== index));
  };

  const reorderGuests = (fromIndex: number, toIndex: number) => {
    setGuests((prev) => {
      const next = Array.from(prev);
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setGuestErrors((prev) => {
      const next = Array.from(prev);
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
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
    if (fromIndex !== toIndex) reorderGuests(fromIndex, toIndex);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const errors: GuestErrors[] = guests.map((guest) => ({
      email: validateEmail(guest.email, guest.commsEmail, guest.firstName),
      mobile: validateMobile(guest.mobile, guest.commsSms, guest.firstName),
    }));
    if (errors.some((err) => err.email || err.mobile)) {
      setGuestErrors(errors);
      return;
    }

    startTransition(async () => {
      try {
        const body = new FormData();
        body.append('name', householdName);
        body.append('slug', slug);
        body.append('tags', JSON.stringify(tags.split(',').map((t: string) => t.trim()).filter(Boolean)));
        body.append('personal_message', personalMessage || '');
        body.append('thank_you_message', thankYouMessage || '');
        body.append('plus_one_allowance', String(plusOneAllowance));
        body.append('guests', JSON.stringify(guests.map((g, idx) => ({
          first_name: g.firstName,
          last_name: g.lastName,
          is_child: Boolean(g.isChild),
          dietary_requirement: g.dietaryRequirement,
          dietary_other: g.dietaryOther || null,
          rsvp_status: g.rsvpStatus,
          display_order: idx,
          email: g.email || null,
          mobile: g.mobile ? (g.mobile.replace(/[\s-]/g, '') || null) : null,
          comms_email: g.commsEmail,
          comms_sms: g.commsSms,
        }))));
        body.append('personal_photo_url', personalPhotoUrl ?? '');

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

  const inviteUrl = useMemo(
    () => `${process.env.NEXT_PUBLIC_SITE_URL ? `https://${process.env.NEXT_PUBLIC_SITE_URL.replace(/https?:\/\//, '')}` : (typeof window !== 'undefined' ? window.location.origin : '')}/invite/${slug || 'your-household'}`,
    [slug]
  );

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
        <PhotoUpload
          value={personalPhotoUrl}
          onChange={setPersonalPhotoUrl}
          aspectRatio={3 / 4}
          label="Personal photo (optional)"
        />
        <label className="space-y-2 text-sm text-slate-100">
          Invite URL preview
          <div className="rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-slate-300">
            <p className="text-sm text-slate-300">{inviteUrl}</p>
          </div>
        </label>
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

                <div className="grid gap-4 lg:grid-cols-2 mb-4">
                  <label className="space-y-2 text-sm text-slate-100">
                    First name
                    <input value={guest.firstName} onChange={(e) => updateGuest(index, 'firstName', e.target.value)} className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400" required />
                  </label>
                  <label className="space-y-2 text-sm text-slate-100">
                    Last name
                    <input value={guest.lastName} onChange={(e) => updateGuest(index, 'lastName', e.target.value)} className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400" required />
                  </label>
                </div>

                <div className="grid gap-4 lg:grid-cols-2 mb-4">
                  <label className="space-y-2 text-sm text-slate-100">
                    Email address
                    <input
                      type="email"
                      value={guest.email}
                      onChange={(e) => updateGuest(index, 'email', e.target.value)}
                      onBlur={() => handleEmailBlur(index)}
                      className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400"
                      placeholder="Email address"
                    />
                    {guestErrors[index]?.email ? (
                      <p className="text-xs" style={{ color: '#C4621A' }}>{guestErrors[index].email}</p>
                    ) : null}
                  </label>
                  <label className="space-y-2 text-sm text-slate-100">
                    Mobile number
                    <input
                      type="tel"
                      value={guest.mobile}
                      onChange={(e) => updateGuest(index, 'mobile', e.target.value)}
                      onBlur={() => handleMobileBlur(index)}
                      className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400"
                      placeholder="Mobile number"
                    />
                    {guestErrors[index]?.mobile ? (
                      <p className="text-xs" style={{ color: '#C4621A' }}>{guestErrors[index].mobile}</p>
                    ) : null}
                  </label>
                </div>

                <div className="grid gap-4 lg:grid-cols-3 mb-4">
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
                    <select
                      value={guest.isChild ? 'yes' : 'no'}
                      onChange={(e) => updateGuestIsChild(index, e.target.value === 'yes')}
                      className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </label>
                </div>

                {guest.dietaryRequirement === 'other' ? (
                  <div className="mb-4">
                    <label className="space-y-2 text-sm text-slate-100">
                      Dietary details
                      <input value={guest.dietaryOther} onChange={(e) => updateGuest(index, 'dietaryOther', e.target.value)} className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Please describe" />
                    </label>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-5 pt-1">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-100">
                    <input
                      type="checkbox"
                      checked={guest.commsEmail}
                      onChange={(e) => {
                        updateGuest(index, 'commsEmail', e.target.checked);
                        if (!e.target.checked) setGuestFieldError(index, 'email', undefined);
                      }}
                      className="h-4 w-4 rounded accent-emerald-400"
                    />
                    Send email
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-100">
                    <input
                      type="checkbox"
                      checked={guest.commsSms}
                      onChange={(e) => {
                        updateGuest(index, 'commsSms', e.target.checked);
                        if (!e.target.checked) setGuestFieldError(index, 'mobile', undefined);
                      }}
                      className="h-4 w-4 rounded accent-emerald-400"
                    />
                    Send SMS
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="space-y-2 text-sm text-slate-100">
        Personal message
        <textarea value={personalMessage} onChange={(e) => setPersonalMessage(e.target.value)} rows={4} className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Message for the household, optional." />
      </label>

      <div className="space-y-2 text-sm text-slate-100">
        <p>Thank you message <span className="text-slate-500">(optional)</span></p>
        <textarea
          value={thankYouMessage}
          onChange={(e) => setThankYouMessage(e.target.value)}
          rows={4}
          className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400"
          placeholder="Shown on the thank you page after the wedding"
        />
        <p className="text-xs text-slate-500">Shown on the thank you page after the wedding</p>
      </div>

      {error ? <div className="rounded-3xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="w-full rounded-3xl bg-amber-300 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70">{isPending ? 'Saving...' : 'Save household'}</button>
        <button type="button" onClick={() => router.push('/admin/guests')} className="rounded-3xl border border-white/10 px-4 py-3">Cancel</button>
      </div>
    </form>
  );
}
