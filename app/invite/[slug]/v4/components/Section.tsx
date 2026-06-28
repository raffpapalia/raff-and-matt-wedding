import { sectionVariantStyles, type SectionVariant } from '../tokens';

interface SectionProps {
  variant: SectionVariant;
  id?: string;
  // Optional full-bleed natural-colour background photo, e.g. the hero. Rendered
  // behind the content with a dark gradient toward the variant's background
  // colour, so text laid over it stays readable.
  backgroundImage?: string;
  minHeight?: string;
  // How content sits within minHeight: 'end' (default, the invitation hero's
  // bottom-aligned copy) or 'center' (the save-the-date hero's centred poster layout).
  contentAlign?: 'end' | 'center';
  children: React.ReactNode;
}

// Colour-blocked section wrapper. Sets background + text colour from the variant
// and the mockup's vertical padding rhythm: clamp(72px,12vw,150px) top and bottom.
export default function Section({ variant, id, backgroundImage, minHeight, contentAlign = 'end', children }: SectionProps) {
  const { background, color } = sectionVariantStyles[variant];
  return (
    <section
      id={id}
      style={{
        background,
        color,
        position: 'relative',
        overflow: backgroundImage ? 'hidden' : undefined,
        minHeight,
        display: minHeight ? 'flex' : undefined,
        flexDirection: minHeight ? 'column' : undefined,
        justifyContent: minHeight ? (contentAlign === 'center' ? 'center' : 'flex-end') : undefined,
        paddingTop: 'clamp(72px, 12vw, 150px)',
        paddingBottom: 'clamp(72px, 12vw, 150px)',
      }}
    >
      {backgroundImage && (
        <>
          <img
            src={backgroundImage}
            alt=""
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(rgba(11,46,34,.15), rgba(11,46,34,.55) 70%, ${background})`,
            }}
          />
        </>
      )}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          paddingLeft: 'clamp(20px, 5.5vw, 90px)',
          paddingRight: 'clamp(20px, 5.5vw, 90px)',
        }}
      >
        {children}
      </div>
    </section>
  );
}
