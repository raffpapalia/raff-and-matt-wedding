import { tokens } from '../tokens';

interface BandQuoteProps {
  src: string;
  alt: string;
  children: React.ReactNode;
}

// Full-bleed treated photo with a centred italic quote — the mockup's ".band" moment.
export default function BandQuote({ src, alt, children }: BandQuoteProps) {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '64svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      <img
        src={src}
        alt={alt}
        className="mr-duotone-img"
        style={{ position: 'absolute', inset: 0 }}
      />
      <div className="mr-duotone-glow" aria-hidden="true" />
      <div
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: `linear-gradient(rgba(11,46,34,.35), rgba(11,46,34,.55))` }}
      />
      <q
        style={{
          position: 'relative',
          zIndex: 1,
          fontFamily: tokens.display,
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: 'clamp(1.8rem, 6vw, 4rem)',
          lineHeight: 1.1,
          maxWidth: '16ch',
          color: tokens.bone,
          quotes: 'none',
          padding: '0 1.5rem',
        }}
      >
        {children}
      </q>
    </div>
  );
}
