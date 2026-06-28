import { tokens } from '../tokens';

interface TreatedPhotoProps {
  src: string;
  alt: string;
  ratio: number;
  shape?: 'arch' | 'rect';
  caption?: string;
}

// Natural-colour photo in the Save the Date's sand matte frame (background: sand,
// padded, rounded, drop shadow). "arch" keeps its big top-corner silhouette — a
// shape choice independent of the (now-removed) duotone colour treatment — applied
// to both the frame and the inner photo at the same 8px/3px scale as "rect".
export default function TreatedPhoto({ src, alt, ratio, shape = 'rect', caption }: TreatedPhotoProps) {
  const frameRadius = shape === 'arch' ? '300px 300px 8px 8px' : 8;
  const photoRadius = shape === 'arch' ? '300px 300px 3px 3px' : 3;
  return (
    <div
      style={{
        background: tokens.sand,
        padding: 'clamp(8px, 1.4vw, 12px)',
        borderRadius: frameRadius,
        boxShadow: '0 30px 60px -24px rgba(0,0,0,.55)',
      }}
    >
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: photoRadius }}>
        <img
          src={src}
          alt={alt}
          style={{ display: 'block', width: '100%', aspectRatio: ratio, objectFit: 'cover', borderRadius: photoRadius }}
        />
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
    </div>
  );
}
