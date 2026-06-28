import { tokens } from '../tokens';

interface BandQuoteProps {
  src: string;
  alt: string;
  children: React.ReactNode;
}

// Full-bleed natural-colour photo with a centred italic quote — the mockup's ".band" moment.
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
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div
        aria-hidden="true"
        // rgba(15,67,49,...) is tokens.greenDeep (#0F4331) decomposed for alpha compositing.
        style={{ position: 'absolute', inset: 0, background: `linear-gradient(rgba(15,67,49,.35), rgba(15,67,49,.55))` }}
      />
      {/* Top/bottom bleed fades — the sections immediately above/below are both
          variant "deep" (tokens.greenDeep), so the band photo dissolves into
          them rather than cutting hard at the edges. */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '25%', pointerEvents: 'none', background: `linear-gradient(to bottom, ${tokens.greenDeep} 0%, transparent 35%)` }}
      />
      <div
        aria-hidden="true"
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '25%', pointerEvents: 'none', background: `linear-gradient(to bottom, transparent 65%, ${tokens.greenDeep} 100%)` }}
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
