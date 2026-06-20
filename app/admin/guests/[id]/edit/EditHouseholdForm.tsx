'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mattandraff.com';
const siteUrl = rawSiteUrl.replace(/\/$/, '');

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

const fieldClass = 'w-full rounded-2xl border border-[#F2E8D0]/15 bg-black/20 px-4 py-3 text-sm text-[#F2E8D0] placeholder-[#F2E8D0]/30 outline-none transition focus:border-accent-gold';
const labelClass = 'block space-y-2 text-sm text-[#F2E8D0]/85';
const helperClass = 'text-xs text-[#F2E8D0]/45';

function SectionHeading({ title }: { title: string }) {
  return <h2 className="font-cinzel text-2xl font-semibold text-accent-gold">{title}</h2>;
}

function SectionDivider() {
  return <div className="border-t border-[#F2E8D0]/10" />;
}

function CopyableLink({ label, value, helper }: { label: string; value: string; helper?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-2">
      <p className={labelClass}>{label}</p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={value}
          onFocus={(event) => event.target.select()}
          className={`${fieldClass} cursor-text`}
        />
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }}
          className="shrink-0 rounded-full border border-[#F2E8D0]/15 px-4 py-3 text-sm text-[#F2E8D0]/85 transition hover:border-accent-gold/40 hover:text-accent-gold"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {helper ? <p className={helperClass}>{helper}</p> : null}
    </div>
  );
}

interface HouseholdFormData {
  id: string;
  name: string;
  slug: string;
  tags?: string[];
  personal_message?: string | null;
  thank_you_message?: string | null;
  thank_you_photo_url?: string | null;
  personal_photo_url?: string | null;
  plus_one_allowance: number;
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

interface HouseholdNavItem {
  id: string;
  name: string;
}

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

function PrevNextNav({ prev, next }: { prev: HouseholdNavItem | null; next: HouseholdNavItem | null }) {
  const linkClass = 'inline-flex max-w-[45%] items-center gap-2 truncate rounded-full border border-[#F2E8D0]/15 bg-black/20 px-4 py-2 text-sm text-[#F2E8D0]/85 transition hover:border-accent-gold/40 hover:text-accent-gold';
  const disabledClass = 'inline-flex max-w-[45%] items-center gap-2 truncate rounded-full border border-[#F2E8D0]/5 px-4 py-2 text-sm text-[#F2E8D0]/25';

  return (
    <div className="flex items-center justify-between gap-4">
      {prev ? (
        <Link href={`/admin/guests/${prev.id}/edit`} className={linkClass}>← {prev.name}</Link>
      ) : (
        <span className={disabledClass}>← Previous household</span>
      )}
      {next ? (
        <Link href={`/admin/guests/${next.id}/edit`} className={linkClass}>{next.name} →</Link>
      ) : (
        <span className={disabledClass}>Next household →</span>
      )}
    </div>
  );
}

export default function EditHouseholdForm({
  initial,
  prevHousehold,
  nextHousehold,
  shortLink,
}: {
  initial: HouseholdFormData;
  prevHousehold: HouseholdNavItem | null;
  nextHousehold: HouseholdNavItem | null;
  shortLink: string | null;
}) {
  const [householdName, setHouseholdName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [personalMessage, setPersonalMessage] = useState(initial?.personal_message ?? '');
  const [plusOneAllowance, setPlusOneAllowance] = useState(initial?.plus_one_allowance ?? 0);
  const [personalPhotoUrl, setPersonalPhotoUrl] = useState<string | null>(initial?.personal_photo_url ?? null);
  const [thankYouPhotoUrl, setThankYouPhotoUrl] = useState<string | null>(initial?.thank_you_photo_url ?? null);
  const [thankYouMessage, setThankYouMessage] = useState(initial?.thank_you_message ?? '');
  const [guests, setGuests] = useState<ReturnType<typeof makeGuestState>[]>(
    Array.isArray(initial?.guests) && initial.guests.length
      ? initial.guests.map(makeGuestState)
      : [{ ...blankGuest }]
  );
  const [guestErrors, setGuestErrors] = useState<GuestErrors[]>(initialGuestErrors(initial));
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Re-sync local state when navigating between households (prev/next), since
  // the form component itself is not remounted by Next.js client navigation.
  useEffect(() => {
    setHouseholdName(initial?.name ?? '');
    setSlug(initial?.slug ?? '');
    setSlugStatus('idle');
    setTags((initial?.tags ?? []).join(', '));
    setPersonalMessage(initial?.personal_message ?? '');
    setPlusOneAllowance(initial?.plus_one_allowance ?? 0);
    setPersonalPhotoUrl(initial?.personal_photo_url ?? null);
    setThankYouPhotoUrl(initial?.thank_you_photo_url ?? null);
    setThankYouMessage(initial?.thank_you_message ?? '');
    setGuests(
      Array.isArray(initial?.guests) && initial.guests.length
        ? initial.guests.map(makeGuestState)
        : [{ ...blankGuest }]
    );
    setGuestErrors(initialGuestErrors(initial));
    setError('');
  }, [initial]);

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
      const res = await fetch(`/admin/api/guests/check-slug?slug=${encodeURIComponent(normalized)}&exclude=${initial.id}`);
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
    setGuests((prev) => [...prev, { ...blankGuest }]);
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

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('name', householdName);
        formData.append('slug', slugify(slug || householdName));
        formData.append('tags', JSON.stringify(tags.split(',').map((tag) => tag.trim()).filter(Boolean)));
        formData.append('personal_message', personalMessage || '');
        formData.append('thank_you_message', thankYouMessage || '');
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
        formData.append('personal_photo_url', personalPhotoUrl ?? '');
        formData.append('thank_you_photo_url', thankYouPhotoUrl ?? '');

        const response = await fetch(`/admin/api/guests/${initial.id}`, { method: 'PATCH', body: formData });

        if (!response.ok) {
          const result = await response.json();
          setError(result?.message || 'Failed to update household.');
          return;
        }

        router.push('/admin/guests');
      } catch (err) {
        setError('Unable to save household. Please try again.');
      }
    });
  };

  const thankYouPhotoFilled = Boolean(thankYouPhotoUrl);
  const thankYouMessageFilled = Boolean(thankYouMessage.trim());

  return (
    <div className="space-y-6">
      <PrevNextNav prev={prevHousehold} next={nextHousehold} />

      <form onSubmit={handleSubmit} className="space-y-10 rounded-[2rem] border border-[#F2E8D0]/10 bg-dark-green p-6 font-dm-sans shadow-xl shadow-black/30 sm:p-8">
        {/* Section 1: Household */}
        <section className="space-y-6">
          <SectionHeading title="Household" />

          <label className={labelClass}>
            Household name
            <input
              value={householdName}
              onChange={(event) => setHouseholdName(event.target.value)}
              className={fieldClass}
              placeholder="Smith family"
              required
            />
          </label>

          <label className={labelClass}>
            Invite code
            <input
              value={slug}
              onChange={(event) => {
                setSlug(event.target.value);
                setSlugStatus('idle');
              }}
              onBlur={handleSlugBlur}
              className={fieldClass}
              placeholder="smith-family"
              required
            />
            {slugStatus === 'checking' ? (
              <span className="block text-xs text-[#F2E8D0]/50">Checking availability...</span>
            ) : slugStatus === 'available' ? (
              <span className="block text-xs text-emerald-400">✓ Available</span>
            ) : slugStatus === 'taken' ? (
              <span className="block text-xs text-red-400">✗ Already in use — please choose another</span>
            ) : null}
          </label>

          <CopyableLink
            label="Full invite link"
            value={`${siteUrl}/invite/${previewSlug}`}
            helper="The complete invitation page for this household."
          />

          {shortLink ? (
            <CopyableLink
              label="Short link"
              value={shortLink}
              helper="Shareable short link for SMS — redirects to the full invite link above. Auto-assigned, not editable."
            />
          ) : null}

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
            <button type="button" onClick={addGuest} className="rounded-full border border-accent-gold/30 bg-accent-gold/10 px-4 py-2 text-sm text-accent-gold transition hover:bg-accent-gold/20">
              Add guest
            </button>
          </div>
          <div className="space-y-6">
            {guests.map((guest, index) => (
              <div key={index} className="rounded-3xl border border-[#F2E8D0]/10 bg-black/20 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <p className="text-sm font-semibold text-[#F2E8D0]">Guest {index + 1}</p>
                  {guests.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeGuest(index)}
                      className="rounded-full bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/15"
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
                      className={fieldClass}
                      required
                    />
                  </label>
                  <label className={labelClass}>
                    Last name
                    <input
                      value={guest.lastName}
                      onChange={(event) => updateGuest(index, 'lastName', event.target.value)}
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
                      onBlur={() => handleEmailBlur(index)}
                      className={fieldClass}
                      placeholder="Email address"
                    />
                    {guestErrors[index]?.email ? (
                      <p className="text-xs text-[#C4621A]">{guestErrors[index].email}</p>
                    ) : null}
                  </label>
                  <label className={labelClass}>
                    Mobile number
                    <input
                      type="tel"
                      value={guest.mobile}
                      onChange={(event) => updateGuest(index, 'mobile', event.target.value)}
                      onBlur={() => handleMobileBlur(index)}
                      className={fieldClass}
                      placeholder="Mobile number"
                    />
                    {guestErrors[index]?.mobile ? (
                      <p className="text-xs text-[#C4621A]">{guestErrors[index].mobile}</p>
                    ) : null}
                  </label>
                </div>

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
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[#F2E8D0]/85">
                    <input
                      type="checkbox"
                      checked={guest.commsEmail}
                      onChange={(e) => {
                        updateGuest(index, 'commsEmail', e.target.checked);
                        if (!e.target.checked) setGuestFieldError(index, 'email', undefined);
                      }}
                      className="h-4 w-4 rounded accent-[#D4A83A]"
                    />
                    Send email
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[#F2E8D0]/85">
                    <input
                      type="checkbox"
                      checked={guest.commsSms}
                      onChange={(e) => {
                        updateGuest(index, 'commsSms', e.target.checked);
                        if (!e.target.checked) setGuestFieldError(index, 'mobile', undefined);
                      }}
                      className="h-4 w-4 rounded accent-[#D4A83A]"
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
                    className="rounded-full bg-[#F2E8D0]/5 px-3 py-1 text-sm text-[#F2E8D0]/80 transition hover:bg-[#F2E8D0]/10"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : null}
          </label>
        </section>

        <SectionDivider />

        {/* Section 5: After the Wedding */}
        <section className="space-y-6 rounded-3xl border border-accent-gold/20 bg-accent-gold/5 p-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-accent-gold/50">Filled in after the wedding</p>
            <SectionHeading title="After the wedding" />
            {thankYouPhotoFilled && thankYouMessageFilled ? (
              <p className="text-sm text-emerald-400">✓ Thank you page complete</p>
            ) : thankYouPhotoFilled || thankYouMessageFilled ? (
              <p className="text-sm text-amber-400">⚠ Thank you page partially complete</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <PhotoUpload
              value={thankYouPhotoUrl}
              onChange={setThankYouPhotoUrl}
              aspectRatio={16 / 9}
              label="Photo from the day"
            />
            <p className={helperClass}>Optional. A photo of you with this household from the wedding day, shown on their thank you page.</p>
          </div>

          <label className={labelClass}>
            Thank you message
            <textarea
              value={thankYouMessage}
              onChange={(event) => setThankYouMessage(event.target.value)}
              rows={4}
              className={fieldClass}
              placeholder="Personalised thank you message for this household, optional."
            />
            <span className={`block ${helperClass}`}>Personalised message shown on their thank you page. If left blank, a default message is used.</span>
          </label>
        </section>

        {error ? <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isPending || slugStatus === 'checking' || slugStatus === 'taken'}
            className="w-full rounded-full bg-accent-gold px-5 py-4 text-sm font-semibold text-dark-green transition hover:bg-[#E8C766] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[240px]"
          >
            {isPending ? 'Saving...' : 'Save household'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/guests')}
            className="rounded-full border border-[#F2E8D0]/15 px-5 py-4 text-sm text-[#F2E8D0]/85 transition hover:border-accent-gold/40 hover:text-accent-gold"
          >
            Cancel
          </button>
        </div>
      </form>

      <PrevNextNav prev={prevHousehold} next={nextHousehold} />
    </div>
  );
}
