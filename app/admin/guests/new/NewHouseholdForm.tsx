'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PhotoUpload from '../../components/PhotoUpload';

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
type SlugStatus = 'idle' | 'checking' | 'available' | 'taken';

type HouseholdMatch = { id: string; name: string; slug: string; exact: boolean };
type GuestMatch = {
  guestId: string;
  guestName: string;
  householdId: string;
  householdName: string;
  slug: string;
  matchType: 'name' | 'similar_name' | 'email' | 'mobile';
};

const fieldClass = 'w-full rounded-2xl border border-admin-sand/40 bg-white px-4 py-3 text-sm text-admin-ink placeholder-admin-ink/30 outline-none transition focus:border-admin-green';
const labelClass = 'block space-y-2 text-sm text-admin-ink/85';
const helperClass = 'text-xs text-admin-ink/45';

function SectionHeading({ title }: { title: string }) {
  return <h2 className="font-cinzel text-2xl font-semibold text-admin-green">{title}</h2>;
}

function SectionDivider() {
  return <div className="border-t border-admin-sand/20" />;
}

const matchTypeLabel: Record<Exclude<GuestMatch['matchType'], 'similar_name'>, string> = {
  name: 'name',
  email: 'email address',
  mobile: 'mobile number',
};

function HouseholdDuplicateWarning({ matches }: { matches: HouseholdMatch[] }) {
  if (!matches.length) return null;
  return (
    <div className="space-y-1 rounded-2xl bg-admin-warning/10 px-4 py-3 text-sm text-admin-warning">
      {matches.slice(0, 3).map((match) => (
        <p key={match.id}>
          ⚠{' '}
          {match.exact ? (
            <>A household named &ldquo;{match.name}&rdquo; already exists</>
          ) : (
            <>Similar household exists: &ldquo;{match.name}&rdquo;</>
          )}{' '}
          —{' '}
          <Link href={`/admin/guests/${match.id}/edit`} className="underline hover:no-underline" target="_blank">
            view household
          </Link>
        </p>
      ))}
    </div>
  );
}

function GuestDuplicateWarning({ matches }: { matches: GuestMatch[] }) {
  if (!matches.length) return null;
  return (
    <div className="space-y-1">
      {matches.map((match) => (
        <p key={`${match.guestId}-${match.matchType}`} className="text-xs text-admin-warning">
          ⚠{' '}
          {match.matchType === 'similar_name' ? (
            <>Similar name to {match.guestName} in</>
          ) : (
            <>Matches the {matchTypeLabel[match.matchType]} of {match.guestName} in</>
          )}{' '}
          <Link href={`/admin/guests/${match.householdId}/edit`} className="underline hover:no-underline" target="_blank">
            {match.householdName || 'another household'}
          </Link>
        </p>
      ))}
    </div>
  );
}

export default function NewHouseholdForm() {
  const [householdName, setHouseholdName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [tags, setTags] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [personalMessage, setPersonalMessage] = useState('');
  const [plusOneAllowance, setPlusOneAllowance] = useState(0);
  const [personalPhotoUrl, setPersonalPhotoUrl] = useState<string | null>(null);
  const [guests, setGuests] = useState([initialGuest]);
  const [guestErrors, setGuestErrors] = useState<GuestErrors[]>([{}]);
  const [householdMatches, setHouseholdMatches] = useState<HouseholdMatch[]>([]);
  const [guestMatches, setGuestMatches] = useState<GuestMatch[][]>([[]]);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(householdName));
      setSlugStatus('idle');
    }
  }, [householdName, slugEdited]);

  const previewSlug = useMemo(() => slugify(slug) || 'your-household', [slug]);

  const handleSlugBlur = async () => {
    const normalized = slugify(slug);
    setSlug(normalized);

    if (!normalized) {
      setSlugStatus('idle');
      return;
    }

    setSlugStatus('checking');
    try {
      const res = await fetch(`/admin/api/guests/check-slug?slug=${encodeURIComponent(normalized)}`);
      if (!res.ok) {
        setSlugStatus('idle');
        return;
      }
      const json = await res.json();
      setSlugStatus(json?.available ? 'available' : 'taken');
    } catch {
      setSlugStatus('idle');
    }
  };

  const handleHouseholdNameBlur = async () => {
    if (!householdName.trim()) {
      setHouseholdMatches([]);
      return;
    }
    try {
      const res = await fetch(`/admin/api/guests/check-duplicates?type=household&name=${encodeURIComponent(householdName.trim())}`);
      if (!res.ok) return;
      const json = await res.json();
      setHouseholdMatches(Array.isArray(json?.matches) ? json.matches : []);
    } catch {
      // ignore — duplicate check is best-effort
    }
  };

  const checkGuestDuplicate = async (index: number) => {
    const guest = guests[index];
    if (!guest) return;
    const params = new URLSearchParams({ type: 'guest' });
    if (guest.firstName.trim() && guest.lastName.trim()) {
      params.set('firstName', guest.firstName.trim());
      params.set('lastName', guest.lastName.trim());
    }
    if (guest.email.trim()) params.set('email', guest.email.trim());
    if (guest.mobile.trim()) params.set('mobile', guest.mobile.trim());

    if (!params.has('firstName') && !params.has('email') && !params.has('mobile')) {
      setGuestMatches((prev) => {
        const next = [...prev];
        next[index] = [];
        return next;
      });
      return;
    }

    try {
      const res = await fetch(`/admin/api/guests/check-duplicates?${params.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      setGuestMatches((prev) => {
        const next = [...prev];
        next[index] = Array.isArray(json?.matches) ? json.matches : [];
        return next;
      });
    } catch {
      // ignore — duplicate check is best-effort
    }
  };

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
    setGuestMatches((prev) => [...prev, []]);
  };

  const removeGuest = (index: number) => {
    setGuests((prev) => prev.filter((_, idx) => idx !== index));
    setGuestErrors((prev) => prev.filter((_, idx) => idx !== index));
    setGuestMatches((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!householdName) {
      setError('Household name is required.');
      return;
    }

    if (slugStatus === 'checking' || slugStatus === 'taken') {
      setError('Please choose an available invite code before saving.');
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

    if (personalPhotoUrl) {
      formData.append('personal_photo_url', personalPhotoUrl);
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
    <form onSubmit={handleSubmit} className="space-y-10 rounded-[2rem] border border-admin-sand/20 bg-white p-6 font-dm-sans sm:p-8">
      {/* Section 1: Household */}
      <section className="space-y-6">
        <SectionHeading title="Household" />

        <label className={labelClass}>
          Household name
          <input
            value={householdName}
            onChange={(event) => setHouseholdName(event.target.value)}
            onBlur={handleHouseholdNameBlur}
            className={fieldClass}
            placeholder="Smith family"
            required
          />
        </label>
        <HouseholdDuplicateWarning matches={householdMatches} />

        <div className="space-y-2">
          <label className={labelClass}>
            Invite code
            <input
              value={slug}
              onChange={(event) => {
                setSlug(event.target.value);
                setSlugEdited(true);
                setSlugStatus('idle');
              }}
              onBlur={handleSlugBlur}
              className={fieldClass}
              placeholder="smith-family"
              required
            />
          </label>
          <p className={helperClass}>Used in their unique link: yourdomain.com/invite/[code]</p>
          <p className="text-xs text-admin-ink/70">{baseUrl}/invite/{previewSlug}</p>
          {slugStatus === 'checking' ? (
            <p className="text-xs text-admin-ink/50">Checking availability...</p>
          ) : slugStatus === 'available' ? (
            <p className="text-xs text-admin-green">✓ Available</p>
          ) : slugStatus === 'taken' ? (
            <p className="text-xs text-admin-persimmon">✗ Already in use — please choose another</p>
          ) : null}
        </div>

        <label className={labelClass}>
          Plus one allowance
          <select
            value={plusOneAllowance}
            onChange={(event) => setPlusOneAllowance(Number(event.target.value))}
            className={fieldClass}
          >
            <option value={0}>0 additional guests</option>
            <option value={1}>1 additional guest</option>
            <option value={2}>2 additional guests</option>
          </select>
        </label>

        <label className={labelClass}>
          Personal message
          <textarea
            value={personalMessage}
            onChange={(event) => setPersonalMessage(event.target.value)}
            rows={4}
            className={fieldClass}
            placeholder="Message for the household, optional."
          />
          <span className={`block ${helperClass}`}>Shown on their invitation page</span>
        </label>
      </section>

      <SectionDivider />

      {/* Section 2: Guests */}
      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <SectionHeading title="Guests" />
          <button type="button" onClick={addGuest} className="rounded-full border border-admin-green/30 bg-admin-green/10 px-4 py-2 text-sm text-admin-green transition hover:bg-admin-green/20">
            Add guest
          </button>
        </div>
        <div className="space-y-6">
          {guests.map((guest, index) => (
            <div key={index} className="rounded-3xl border border-admin-sand/20 bg-admin-bone/50 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <p className="text-sm font-semibold text-admin-ink">Guest {index + 1}</p>
                {guests.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeGuest(index)}
                    className="rounded-full bg-admin-persimmon/10 px-4 py-2 text-sm text-admin-persimmon transition hover:bg-admin-persimmon/15"
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="grid gap-4 lg:grid-cols-2 mb-4">
                <label className={labelClass}>
                  First name
                  <input
                    value={guest.firstName}
                    onChange={(event) => updateGuest(index, 'firstName', event.target.value)}
                    onBlur={() => checkGuestDuplicate(index)}
                    className={fieldClass}
                    required
                  />
                </label>
                <label className={labelClass}>
                  Last name
                  <input
                    value={guest.lastName}
                    onChange={(event) => updateGuest(index, 'lastName', event.target.value)}
                    onBlur={() => checkGuestDuplicate(index)}
                    className={fieldClass}
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-2 mb-4">
                <label className={labelClass}>
                  Email address
                  <input
                    type="email"
                    value={guest.email}
                    onChange={(event) => updateGuest(index, 'email', event.target.value)}
                    onBlur={() => {
                      handleEmailBlur(index);
                      checkGuestDuplicate(index);
                    }}
                    className={fieldClass}
                    placeholder="Email address"
                  />
                  {guestErrors[index]?.email ? (
                    <p className="text-xs text-admin-persimmon">{guestErrors[index].email}</p>
                  ) : null}
                </label>
                <label className={labelClass}>
                  Mobile number
                  <input
                    type="tel"
                    value={guest.mobile}
                    onChange={(event) => updateGuest(index, 'mobile', event.target.value)}
                    onBlur={() => {
                      handleMobileBlur(index);
                      checkGuestDuplicate(index);
                    }}
                    className={fieldClass}
                    placeholder="Mobile number"
                  />
                  {guestErrors[index]?.mobile ? (
                    <p className="text-xs text-admin-persimmon">{guestErrors[index].mobile}</p>
                  ) : null}
                </label>
              </div>
              <GuestDuplicateWarning matches={guestMatches[index] ?? []} />

              <div className="grid gap-4 lg:grid-cols-3 mb-4">
                <label className={labelClass}>
                  RSVP status
                  <select
                    value={guest.rsvpStatus}
                    onChange={(event) => updateGuest(index, 'rsvpStatus', event.target.value)}
                    className={fieldClass}
                  >
                    <option value="pending">Pending</option>
                    <option value="attending">Attending</option>
                    <option value="declined">Declined</option>
                  </select>
                </label>
                <label className={labelClass}>
                  Dietary requirement
                  <select
                    value={guest.dietaryRequirement}
                    onChange={(event) => updateGuest(index, 'dietaryRequirement', event.target.value)}
                    className={fieldClass}
                  >
                    {dietaryOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  Child?
                  <select
                    value={guest.isChild ? 'yes' : 'no'}
                    onChange={(event) => updateGuestIsChild(index, event.target.value === 'yes')}
                    className={fieldClass}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>
              </div>

              {guest.dietaryRequirement === 'other' ? (
                <div className="mb-4">
                  <label className={labelClass}>
                    Dietary details
                    <input
                      value={guest.dietaryOther}
                      onChange={(event) => updateGuest(index, 'dietaryOther', event.target.value)}
                      className={fieldClass}
                      placeholder="Please describe"
                    />
                  </label>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-5 pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-admin-ink/85">
                  <input
                    type="checkbox"
                    checked={guest.commsEmail}
                    onChange={(e) => {
                      updateGuest(index, 'commsEmail', e.target.checked);
                      if (!e.target.checked) setGuestFieldError(index, 'email', undefined);
                    }}
                    className="h-4 w-4 rounded accent-admin-green"
                  />
                  Send email
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-admin-ink/85">
                  <input
                    type="checkbox"
                    checked={guest.commsSms}
                    onChange={(e) => {
                      updateGuest(index, 'commsSms', e.target.checked);
                      if (!e.target.checked) setGuestFieldError(index, 'mobile', undefined);
                    }}
                    className="h-4 w-4 rounded accent-admin-green"
                  />
                  Send SMS
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <SectionDivider />

      {/* Section 3: Invitation photo */}
      <section className="space-y-4">
        <SectionHeading title="Invitation photo" />
        <PhotoUpload
          value={personalPhotoUrl}
          onChange={setPersonalPhotoUrl}
          aspectRatio={3 / 4}
          label="Personal photo"
        />
        <p className={helperClass}>Optional. Shown on their save the date and invitation pages.</p>
      </section>

      <SectionDivider />

      {/* Section 4: Contact & Tags */}
      <section className="space-y-6">
        <SectionHeading title="Contact & tags" />

        <label className={labelClass}>
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
            className={fieldClass}
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
                  className="rounded-full bg-admin-ink/5 px-3 py-1 text-sm text-admin-ink/80 transition hover:bg-admin-ink/10"
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : null}
        </label>
      </section>

      {error ? <div className="rounded-2xl bg-admin-persimmon/10 px-4 py-3 text-sm text-admin-persimmon">{error}</div> : null}

      <button
        type="submit"
        disabled={isPending || slugStatus === 'checking' || slugStatus === 'taken'}
        className="w-full rounded-full bg-admin-green px-5 py-4 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[240px]"
      >
        {isPending ? 'Saving...' : 'Save household'}
      </button>
    </form>
  );
}
