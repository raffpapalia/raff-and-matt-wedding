import { tokens } from '../tokens';

interface TreatedPhotoProps {
  src: string;
  alt: string;
  ratio: number;
  shape?: 'arch' | 'rect';
  caption?: string;
}

// Real photo run through the shared emerald->bone duotone filter (#mr-duotone, defined
// once in app/invite/[slug]/layout.tsx) plus a low-opacity persimmon glow, so photos
// match the v4 palette instead of clashing with it.
export default function TreatedPhoto({ src, alt, ratio, shape = 'rect', caption }: TreatedPhotoProps) {
  return (
    <div className={`mr-treated-photo mr-shape-${shape}`} style={{ aspectRatio: ratio }}>
      <img className="mr-duotone-img" src={src} alt={alt} />
      <div className="mr-duotone-glow" aria-hidden="true" />
      {caption && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 14,
            fontFamily: tokens.mono,
            fontSize: '0.58rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'rgba(246,238,221,.7)',
            background: 'linear-gradient(transparent, rgba(11,46,34,.55))',
          }}
        >
          {caption}
        </span>
      )}
    </div>
  );
}
