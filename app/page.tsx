import FindInvitationForm from './FindInvitationForm';
import { Parallelogram, WaterRipple, LightBeam, Particles, FloatingPetal } from './invite/[slug]/v3/primitives';

export default function Home() {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#0A1F14',
        color: '#F2E8D0',
      }}
    >
      {/* Ambience */}
      <WaterRipple opacity={0.08} />
      <LightBeam delay={0} opacity={0.02} />
      <Particles count={14} color="rgba(212,168,58,0.5)" />
      <FloatingPetal delay={2} top="20%" duration={24} color="#D4A83A" />
      <FloatingPetal delay={11} top="68%" duration={20} color="#C4621A" flip />

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
        <Parallelogram width={16} height={8} color="#D4A83A" skew={5} />
        <span
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: '0.55rem',
            textTransform: 'uppercase',
            letterSpacing: '0.35em',
            color: '#D4A83A',
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
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '6rem 1.5rem 3rem',
        }}
      >
        {/* Wordmark */}
        <h1
          style={{
            fontFamily: 'var(--font-cinzel)',
            fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
            letterSpacing: '0.2em',
            color: '#D4A83A',
            margin: '0 0 1.5rem',
          }}
        >
          M &amp; R · 2027
        </h1>

        {/* Parallelogram divider */}
        <div style={{ marginBottom: '1.5rem' }} aria-hidden="true">
          <Parallelogram width={44} height={16} color="#D4A83A" skew={9} fillOpacity={0.85} />
        </div>

        {/* Tagline */}
        <p
          style={{
            fontFamily: 'var(--font-cinzel)',
            fontStyle: 'italic',
            fontSize: 'clamp(0.95rem, 2.2vw, 1.125rem)',
            lineHeight: 1.6,
            color: '#F2E8D0',
            opacity: 0.85,
            maxWidth: '440px',
            margin: '0 0 clamp(2.5rem, 6vw, 4rem)',
          }}
        >
          Cancel your plans. We&apos;ve made better ones.
        </p>

        {/* Find your invitation */}
        <section style={{ width: '100%', maxWidth: '420px' }}>
          <h2
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontWeight: 400,
              fontSize: '0.6rem',
              textTransform: 'uppercase',
              letterSpacing: '0.4em',
              color: '#D4A83A',
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
              color: 'rgba(242,232,208,0.6)',
              lineHeight: 1.7,
              marginBottom: '2rem',
            }}
          >
            Enter your last name and email address and, if we have you on the list, we&apos;ll
            send your personal invite link.
          </p>
          <FindInvitationForm />
        </section>
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
          <Parallelogram width={20} height={10} color="#D4A83A" skew={5} fillOpacity={0.7} />
          <Parallelogram width={20} height={10} color="#C4621A" skew={5} fillOpacity={0.5} />
        </div>
      </footer>
    </div>
  );
}
