'use client';

import { useState, type FormEvent } from 'react';
import { tokens } from './invite/[slug]/v4/tokens';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = { lastName?: string; email?: string };

const fieldStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  display: 'block',
  fontFamily: tokens.grotesque,
  fontWeight: 300,
  fontSize: '0.92rem',
  padding: '12px 16px',
  borderRadius: 10,
  border: '1px solid rgba(11, 33, 24, 0.2)',
  background: 'var(--bone-2)',
  color: tokens.ink,
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: tokens.grotesque,
  fontSize: '0.6rem',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: tokens.mutedDeep,
  marginBottom: 10,
};

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
      <div className="mr-ticket" style={{ padding: 'clamp(28px, 5vw, 40px)', textAlign: 'center' }}>
        <p style={{ margin: 0, fontFamily: tokens.grotesque, fontSize: '0.95rem', color: tokens.ink, opacity: 0.78 }}>
          If we find your details, we&apos;ll send your invite link shortly.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Focus state for the fields below — the only thing an inline style can't express */}
      <style>{`
        .mr-lookup-field:focus {
          border-color: var(--gold) !important;
          box-shadow: 0 0 0 3px rgba(142, 124, 195, 0.25);
        }
      `}</style>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="mr-ticket"
        // The perforation notches (.mr-perf) paint in --green-deep by default, so they
        // blend into the green "Pass" section behind the RSVP ticket. This card sits
        // directly on the homepage's ink background instead, so re-point that variable
        // locally rather than fighting the design.css selector's specificity.
        style={{ textAlign: 'left', ['--green-deep' as string]: tokens.ink } as React.CSSProperties}
      >
        <div style={{ padding: 'clamp(28px, 5vw, 40px)', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label htmlFor="lastName" style={labelStyle}>
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mr-lookup-field"
              style={fieldStyle}
              placeholder="Smith"
            />
            {errors.lastName && (
              <p style={{ margin: '8px 0 0', fontFamily: tokens.grotesque, fontSize: '0.8rem', color: tokens.persimmon }}>
                {errors.lastName}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" style={labelStyle}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mr-lookup-field"
              style={fieldStyle}
              placeholder="you@example.com"
            />
            {errors.email && (
              <p style={{ margin: '8px 0 0', fontFamily: tokens.grotesque, fontSize: '0.8rem', color: tokens.persimmon }}>
                {errors.email}
              </p>
            )}
          </div>
        </div>
        <div className="mr-perf" aria-hidden="true" />
        <div style={{ padding: 'clamp(20px, 4vw, 28px)' }}>
          <button
            type="submit"
            disabled={submitting}
            className="mr-btn mr-btn-solid"
            style={{ display: 'block', width: '100%', textAlign: 'center', boxSizing: 'border-box', cursor: 'pointer' }}
          >
            {submitting ? 'Searching…' : 'Submit'}
          </button>
        </div>
      </form>
    </>
  );
}
