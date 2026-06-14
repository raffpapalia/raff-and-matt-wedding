import FindInvitationForm from './FindInvitationForm';
import { Parallelogram, EmeraldJewel, WaterRipple, LightBeam, FloatingPetal } from './invite/[slug]/v3/primitives';
import { palette } from './invite/[slug]/v3/tokens';

export default function Home() {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: palette.bgPrimary,
        color: palette.cream,
      }}
    >
      {/* Ambience — restrained: one quiet ripple, one hero beam, one petal */}
      <WaterRipple opacity={0.06} />
      <LightBeam delay={0} opacity={0.05} />
      <FloatingPetal delay={3} top="22%" duration={26} color={palette.goldChampagne} />

      {/* Corner mark */}
      <div
        style={{
          position: 'absolute',
          top: '1.75rem',
          left: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          pointerEvents: 'none',
        }}
      >
        <Parallelogram width={16} height={8} color={palette.goldBase} />
        <span
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: '0.55rem',
            textTransform: 'uppercase',
            letterSpacing: '0.35em',
            color: palette.goldBase,
            opacity: 0.8,
          }}
        >
          M &amp; R · 2027
        </span>
      </div>

      {/* Main */}
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 'clamp(5.5rem, 14vh, 7.5rem) max(1.5rem, 5vw) 3rem',
        }}
      >
        <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto' }}>
          {/* Hero — staggered couple names, contained within margins */}
          <h1 aria-label="Matt & Raff" style={{ margin: '0 0 clamp(3rem, 8vw, 5rem)' }}>
            <span
              aria-hidden="true"
              style={{
                display: 'block',
                fontFamily: 'var(--font-cinzel)',
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(2.5rem, 12vw, 6.5rem)',
                lineHeight: 1,
              }}
            >
              Matt
            </span>

            {/* Hairline + ampersand jewel — the only bright emerald on the page */}
            <span
              aria-hidden="true"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                margin: 'clamp(0.75rem, 3vw, 1.5rem) 0',
              }}
            >
              <span style={{ flex: 1, height: '1px', backgroundColor: palette.cream, opacity: 0.18 }} />
              <EmeraldJewel />
              <span style={{ flex: 1, height: '1px', backgroundColor: palette.cream, opacity: 0.18 }} />
            </span>

            <span
              aria-hidden="true"
              style={{
                display: 'block',
                textAlign: 'right',
                fontFamily: 'var(--font-cinzel)',
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(2.5rem, 12vw, 6.5rem)',
                lineHeight: 1,
              }}
            >
              Raff
            </span>
          </h1>

          {/* Tagline */}
          <p
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: 'clamp(0.95rem, 2.2vw, 1.125rem)',
              lineHeight: 1.6,
              color: palette.cream,
              opacity: 0.8,
              textAlign: 'center',
              maxWidth: '440px',
              margin: '0 auto clamp(2.5rem, 6vw, 4rem)',
            }}
          >
            Cancel your plans. We&apos;ve made better ones.
          </p>

          {/* Find your invitation */}
          <section style={{ width: '100%', maxWidth: '420px', margin: '0 auto', textAlign: 'center' }}>
            <h2
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontWeight: 400,
                fontSize: '0.6rem',
                textTransform: 'uppercase',
                letterSpacing: '0.4em',
                color: palette.goldBase,
                opacity: 0.85,
                margin: '0 0 0.75rem',
              }}
            >
              Find Your Invitation
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: '0.85rem',
                color: palette.cream,
                opacity: 0.6,
                lineHeight: 1.7,
                marginBottom: '2rem',
              }}
            >
              Enter your last name and email address and, if we have you on the list, we&apos;ll
              send your personal invite link.
            </p>
            <FindInvitationForm />
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          padding: '0 1.5rem 2.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }} aria-hidden="true">
          <Parallelogram width={20} height={10} color={palette.goldBase} fillOpacity={0.7} />
          <Parallelogram width={20} height={10} color={palette.forestAccent} fillOpacity={0.7} />
        </div>
      </footer>
    </div>
  );
}
