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

const initialGuest = {
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

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mattandraff.com';
const baseUrl = rawSiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
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

export default function NewHouseholdForm() {
  const [householdName, setHouseholdName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [tags, setTags] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [personalMessage, setPersonalMessage] = useState('');
  const [plusOneAllowance, setPlusOneAllowance] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [guests, setGuests] = useState([initialGuest]);
  const [guestErrors, setGuestErrors] = useState<GuestErrors[]>([{}]);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(householdName));
    }
  }, [householdName, slugEdited]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photoFile]);

  const inviteUrl = useMemo(() => `https://${baseUrl}/invite/${slug || 'your-household'}`, [slug]);

  const updateGuest = (index: number, key: string, value: string | boolean) => {
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
    setGuests((prev) => [...prev, { ...initialGuest }]);
    setGuestErrors((prev) => [...prev, {}]);
  };

  const removeGuest = (index: number) => {
    setGuests((prev) => prev.filter((_, idx) => idx !== index));
    setGuestErrors((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!householdName) {
      setError('Household name is required.');
      return;
    }

    const errors: GuestErrors[] = guests.map((guest) => ({
      email: validateEmail(guest.email, guest.commsEmail, guest.firstName),
      mobile: validateMobile(guest.mobile, guest.commsSms, guest.firstName),
    }));
    if (errors.some((e) => e.email || e.mobile)) {
      setGuestErrors(errors);
      return;
    }

    const formData = new FormData();
    formData.append('name', householdName);
    formData.append('slug', slugify(slug || householdName));
    formData.append('tags', JSON.stringify(tags.split(',').map((tag) => tag.trim()).filter(Boolean)));
    formData.append('personal_message', personalMessage || '');
    formData.append('plus_one_allowance', String(plusOneAllowance));
    formData.append('guests', JSON.stringify(guests.map((guest, idx) => ({
      first_name: guest.firstName,
      last_name: guest.lastName,
      is_child: guest.isChild,
      dietary_requirement: guest.dietaryRequirement,
      dietary_other: guest.dietaryOther || null,
      rsvp_status: guest.rsvpStatus,
      display_order: idx,
      email: guest.email || null,
      mobile: guest.mobile ? (guest.mobile.replace(/[\s-]/g, '') || null) : null,
      comms_email: guest.commsEmail,
      comms_sms: guest.commsSms,
    }))));

    if (photoFile) {
      formData.append('photo', photoFile);
    }

    startTransition(async () => {
      try {
        const response = await fetch('/admin/api/guests', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const result = await response.json();
          setError(result?.message || 'Failed to create household.');
          return;
        }

        router.push('/admin/guests');
      } catch (err) {
        setError('Unable to save household. Please try again.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-slate-950/20">
      <div className="grid gap-6 lg:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-100">
          Household name
          <input
            value={householdName}
            onChange={(event) => {
              setHouseholdName(event.target.value);
              if (!slugEdited) {
                setSlug(slugify(event.target.value));
              }
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
                    const existing = tags.split(',').map((t) => t.trim()).filter(Boolean);
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
          <h2 className="text-lg font-semibold text-white">Guest details</h2>
          <button type="button" onClick={addGuest} className="rounded-full border border-white/10 bg-amber-300/15 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-300/20">
            Add guest
          </button>
        </div>
        <div className="space-y-6">
          {guests.map((guest, index) => (
            <div key={index} className="rounded-3xl border border-white/10 bg-slate-950/80 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <p className="text-sm font-semibold text-white">Guest {index + 1}</p>
                {guests.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeGuest(index)}
                    className="rounded-full bg-rose-500/10 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-500/15"
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="grid gap-4 lg:grid-cols-2 mb-4">
                <label className="space-y-2 text-sm text-slate-100">
                  First name
                  <input
                    value={guest.firstName}
                    onChange={(event) => updateGuest(index, 'firstName', event.target.value)}
                    className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-100">
                  Last name
                  <input
                    value={guest.lastName}
                    onChange={(event) => updateGuest(index, 'lastName', event.target.value)}
                    className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400"
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-2 mb-4">
                <label className="space-y-2 text-sm text-slate-100">
                  Email address
                  <input
                    type="email"
                    value={guest.email}
                    onChange={(event) => updateGuest(index, 'email', event.target.value)}
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
                    onChange={(event) => updateGuest(index, 'mobile', event.target.value)}
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
                  <select
                    value={guest.rsvpStatus}
                    onChange={(event) => updateGuest(index, 'rsvpStatus', event.target.value)}
                    className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400"
                  >
                    <option value="pending">Pending</option>
                    <option value="attending">Attending</option>
                    <option value="declined">Declined</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-slate-100">
                  Dietary requirement
                  <select
                    value={guest.dietaryRequirement}
                    onChange={(event) => updateGuest(index, 'dietaryRequirement', event.target.value)}
                    className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400"
                  >
                    {dietaryOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-slate-100">
                  Child?
                  <select
                    value={guest.isChild ? 'yes' : 'no'}
                    onChange={(event) => updateGuestIsChild(index, event.target.value === 'yes')}
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
                    <input
                      value={guest.dietaryOther}
                      onChange={(event) => updateGuest(index, 'dietaryOther', event.target.value)}
                      className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400"
                      placeholder="Please describe"
                    />
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
          ))}
        </div>
      </div>

      <label className="space-y-2 text-sm text-slate-100">
        Personal message
        <textarea
          value={personalMessage}
          onChange={(event) => setPersonalMessage(event.target.value)}
          rows={4}
          className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-emerald-400"
          placeholder="Message for the household, optional."
        />
      </label>

      {error ? <div className="rounded-3xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-3xl bg-amber-300 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? 'Saving...' : 'Save household'}
      </button>
    </form>
  );
}
