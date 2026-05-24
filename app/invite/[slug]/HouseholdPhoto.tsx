'use client';

interface HouseholdPhotoProps {
  src: string;
  maxWidth: number;
}

export default function HouseholdPhoto({ src, maxWidth }: HouseholdPhotoProps) {
  // If stored as a bare base64 string (no data URI prefix), add a default prefix
  const imgSrc =
    src.startsWith('data:') || src.startsWith('http') || src.startsWith('/')
      ? src
      : `data:image/jpeg;base64,${src}`;

  return (
    <div style={{ maxWidth, width: '100%', margin: '0 auto' }}>
      {/* 4:3 aspect ratio via padding-top trick */}
      <div style={{ position: 'relative', paddingTop: '75%', overflow: 'hidden' }}>
        <img
          src={imgSrc}
          alt="Personal photo"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            borderRadius: '0.375rem',
            border: '1px solid rgba(212,168,58,0.25)',
            display: 'block',
          }}
        />
      </div>
    </div>
  );
}
