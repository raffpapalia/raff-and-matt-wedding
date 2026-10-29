import { sectionVariantStyles, type SectionVariant } from '../tokens';
import { BLOOM_FOOTER, BLOOM_GRAIN_URL, BLOOM_HERO } from '../bloom';

interface SectionProps {
  variant: SectionVariant;
  id?: string;
  // Extra class merged onto the outer <section> — e.g. the scoped section-transition
  // glow classes (.mr-inv-green-glow / .mr-inv-sand-glow) defined in InvitationPhaseV4.
  className?: string;
  // Optional full-bleed natural-colour background photo, e.g. the hero. Rendered
  // behind the content with a dark gradient toward the variant's background
  // colour, so text laid over it stays readable.
  backgroundImage?: string;
  // CSS object-position for the background photo. Defaults to 'center' (prior
  // behaviour) — set e.g. 'center 20%' to keep faces in frame on a portrait crop.
  backgroundPosition?: string;
  minHeight?: string;
  // How content sits within minHeight: 'end' (default, the invitation hero's
  // bottom-aligned copy) or 'center' (the save-the-date hero's centred poster layout).
  contentAlign?: 'end' | 'center';
  // Canonical bloom field + grain (BRAND §3), for heroes and footers on a 'deep'
  // surface. Replaces the variant background.
  bloom?: 'hero' | 'footer';
  // Overrides for pages with their own rhythm (the stay page). Omit all three and
  // the section behaves exactly as before: clamp(72px,12vw,150px) vertical padding,
  // 1200px content box with clamp(20px,5.5vw,90px) side padding.
  padding?: { top: string; bottom: string };
  // Side gutter applied to the section itself; the content box then has no padding
  // of its own and is capped at contentMaxWidth.
  gutter?: string;
  contentMaxWidth?: string;
  children: React.ReactNode;
}

// Colour-blocked section wrapper. Sets background + text colour from the variant
// and the mockup's vertical padding rhythm: clamp(72px,12vw,150px) top and bottom.
export default function Section({
  variant,
  id,
  className,
  backgroundImage,
  backgroundPosition = 'center',
  minHeight,
  contentAlign = 'end',
  bloom,
  padding,
  gutter,
  contentMaxWidth = '1200px',
  children,
}: SectionProps) {
  const { background, color } = sectionVariantStyles[variant];
  const surface = bloom ? (bloom === 'hero' ? BLOOM_HERO : BLOOM_FOOTER) : background;
  return (
    <section
      id={id}
      className={className}
      style={{
        background: surface,
        color,
        position: 'relative',
        overflow: backgroundImage || bloom ? 'hidden' : undefined,
        minHeight,
        display: minHeight ? 'flex' : undefined,
        flexDirection: minHeight ? 'column' : undefined,
        justifyContent: minHeight ? (contentAlign === 'center' ? 'center' : 'flex-end') : undefined,
        paddingTop: padding?.top ?? 'clamp(72px, 12vw, 150px)',
        paddingBottom: padding?.bottom ?? 'clamp(72px, 12vw, 150px)',
        paddingLeft: gutter,
        paddingRight: gutter,
      }}
    >
      {backgroundImage && (
        <>
          <img
            src={backgroundImage}
            alt=""
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: backgroundPosition }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              // rgba(15,67,49,...) is tokens.greenDeep (#0F4331) decomposed for alpha compositing.
              background: `linear-gradient(rgba(15,67,49,.15), rgba(15,67,49,.55) 70%, ${background})`,
            }}
          />
        </>
      )}
      {bloom && (
        // Grain sits above the bloom and below the content (zIndex 2 below).
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.08,
            mixBlendMode: 'overlay',
            backgroundImage: BLOOM_GRAIN_URL,
            backgroundRepeat: 'repeat',
            backgroundSize: '180px 180px',
          }}
        />
      )}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: contentMaxWidth,
          margin: '0 auto',
          paddingLeft: gutter ? 0 : 'clamp(20px, 5.5vw, 90px)',
          paddingRight: gutter ? 0 : 'clamp(20px, 5.5vw, 90px)',
        }}
      >
        {children}
      </div>
    </section>
  );
}
