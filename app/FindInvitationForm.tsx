'use client';

import { useState, type FormEvent } from 'react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = { lastName?: string; email?: string };

export default function FindInvitationForm() {
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const nextErrors: Errors = {};
    if (!lastName.trim()) nextErrors.lastName = 'Please enter your last name';
    if (!email.trim()) nextErrors.email = 'Please enter your email address';
    else if (!EMAIL_REGEX.test(email.trim())) nextErrors.email = 'Please enter a valid email address';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastName: lastName.trim(), email: email.trim() }),
      });
    } catch {
      // Same message regardless of outcome — never reveal whether a match was found
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <p
        className="text-sm leading-relaxed text-[#F2E8D0]/70"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        If we find your details, we&apos;ll send your invite link shortly.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 text-left">
      <div>
        <label
          htmlFor="lastName"
          className="mb-2 block text-xs uppercase tracking-widest text-[#D4A83A]/80"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Last Name
        </label>
        <input
          id="lastName"
          type="text"
          autoComplete="family-name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="min-h-[44px] w-full border border-[#D4A83A]/50 bg-[#0A1F14] px-4 py-3 text-sm text-[#F2E8D0] outline-none transition-colors placeholder-[#F2E8D0]/30 focus:border-[#D4A83A]"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
          placeholder="Smith"
        />
        {errors.lastName && (
          <p className="mt-2 text-xs text-[#C4621A]" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {errors.lastName}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-xs uppercase tracking-widest text-[#D4A83A]/80"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Email Address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-[44px] w-full border border-[#D4A83A]/50 bg-[#0A1F14] px-4 py-3 text-sm text-[#F2E8D0] outline-none transition-colors placeholder-[#F2E8D0]/30 focus:border-[#D4A83A]"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="mt-2 text-xs text-[#C4621A]" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {errors.email}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 min-h-[44px] w-full bg-[#D4A83A] py-3 text-sm font-light uppercase tracking-widest text-[#0A1F14] transition-all hover:bg-[#E8B854] disabled:opacity-50"
        style={{ fontFamily: 'var(--font-dm-sans)', touchAction: 'manipulation' }}
      >
        {submitting ? 'Searching…' : 'Submit'}
      </button>
    </form>
  );
}
