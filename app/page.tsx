import localFont from 'next/font/local';
import FindInvitationForm from './FindInvitationForm';
import { tokens } from './invite/[slug]/v4/tokens';
import './invite/[slug]/v4/design.css';

// Self-hosted — reuses the same font files as the v4 invitation pages (see
// app/invite/[slug]/layout.tsx). Loaded here too since the homepage sits
// outside that layout's route tree and needs its own font instances.
const fraunces = localFont({
  src: [
    { path: './invite/[slug]/fonts/fraunces-normal-variable.woff2', weight: '100 900', style: 'normal' },
    { path: './invite/[slug]/fonts/fraunces-italic-variable.woff2', weight: '100 900', style: 'italic' },
  ],
  variable: '--font-fraunces',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
});

const bricolage = localFont({
  src: './invite/[slug]/fonts/bricolage-grotesque-variable.woff2',
  weight: '200 800',
  style: 'normal',
  variable: '--font-bricolage',
  display: 'swap',
});

const dmMono = localFont({
  src: [
    { path: './invite/[slug]/fonts/dm-mono-400.woff2', weight: '400', style: 'normal' },
    { path: './invite/[slug]/fonts/dm-mono-500.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-dm-mono',
  display: 'swap',
});

export default function Home() {
  return (
    <div
      className={`${fraunces.variable} ${bricolage.variable} ${dmMono.variable} mr-v4`}
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: tokens.ink,
        color: tokens.bone,
        padding: 'clamp(2rem, 6vw, 4rem) max(1.25rem, 5vw)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
        {/* Wordmark — same Fraunces 900 / opsz 144 treatment as the sticky header logotype */}
        <h1
          style={{
            margin: '0 0 clamp(1rem, 3vw, 1.5rem)',
            fontFamily: tokens.display,
            fontWeight: 900,
            fontVariationSettings: '"opsz" 144',
            fontSize: 'clamp(2.6rem, 10vw, 5rem)',
            lineHeight: 1,
            letterSpacing: '-0.01em',
            color: tokens.sand,
          }}
        >
          Matt <em style={{ fontStyle: 'italic' }}>&amp;</em> Raff
        </h1>

        {/* Tagline */}
        <p
          style={{
            margin: '0 0 clamp(2.5rem, 6vw, 4rem)',
            fontFamily: tokens.display,
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(1rem, 2.4vw, 1.2rem)',
            lineHeight: 1.6,
            color: tokens.bone,
            opacity: 0.65,
          }}
        >
          Cancel your plans. We&apos;ve made better ones.
        </p>

        {/* Pill-kicker */}
        <div style={{ marginBottom: 'clamp(1.75rem, 4vw, 2.5rem)' }}>
          <span
            style={{
              display: 'inline-block',
              fontFamily: tokens.mono,
              fontSize: '0.66rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: tokens.onPersimmon,
              background: tokens.persimmon,
              borderRadius: 999,
              padding: '8px 18px',
            }}
          >
            Find your invitation
          </span>
        </div>

        <FindInvitationForm />
      </div>
    </div>
  );
}
