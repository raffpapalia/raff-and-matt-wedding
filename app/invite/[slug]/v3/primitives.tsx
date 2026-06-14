// v3 design primitives — inline SVG only, pointer-events: none on all decorative elements

import { palette, houseSkew } from './tokens';

export function Parallelogram({
  width,
  height,
  color,
  fillOpacity = 1,
  skew,
  stroke = false,
}: {
  width: number;
  height: number;
  color: string;
  fillOpacity?: number;
  skew?: number;
  stroke?: boolean;
}) {
  const resolvedSkew = skew ?? houseSkew(height);
  const pts = `${resolvedSkew},0 ${width},0 ${width - resolvedSkew},${height} 0,${height}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'inline-block', flexShrink: 0 }}
      aria-hidden="true"
    >
      <polygon
        points={pts}
        fill={stroke ? 'none' : color}
        fillOpacity={stroke ? 0 : fillOpacity}
        stroke={stroke ? color : 'none'}
        strokeWidth={stroke ? 1.5 : 0}
      />
    </svg>
  );
}

export function EmeraldJewel({ width = 26, height = 16 }: { width?: number; height?: number }) {
  const skew = houseSkew(height);
  return (
    <div
      style={{ position: 'relative', display: 'inline-block', flexShrink: 0, width, height, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <Parallelogram width={width} height={height} color={palette.emeraldJewel} />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: skew,
          width: width - skew,
          height: 1,
          backgroundColor: palette.emeraldHighlight,
        }}
      />
    </div>
  );
}

export function WaterRipple({ opacity = 0.1 }: { opacity?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        opacity,
      }}
      aria-hidden="true"
    >
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <filter id="v3-water-ripple" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.008"
              numOctaves="3"
              seed="42"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                values="0.012 0.008;0.016 0.010;0.012 0.008"
                dur="10s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="8"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
        <rect
          width="100%"
          height="100%"
          filter="url(#v3-water-ripple)"
          fill={`${palette.forestAccent}26`}
        />
      </svg>
    </div>
  );
}

export function Particles({ count, color }: { count: number; color: string }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    left: (i * 13 + 7) % 97,
    top: (i * 17 + 23) % 90,
    size: ((i * 7 + 3) % 3) + 0.8,
    delay: -((i * 11) % 15),
    duration: 15 + ((i * 5) % 10),
  }));

  return (
    <div
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
      aria-hidden="true"
    >
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: color,
            animation: `particleFloat ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function Noise({ opacity = 0.05 }: { opacity?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
        opacity,
      }}
      aria-hidden="true"
    >
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <filter id="v3-noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.75"
              numOctaves="4"
              seed="2"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#v3-noise)" fill="white" />
      </svg>
    </div>
  );
}

export function Vignette() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background:
          'radial-gradient(ellipse at 50% 40%, transparent 0%, transparent 45%, rgba(0,0,0,0.65) 100%)',
      }}
      aria-hidden="true"
    />
  );
}

export function LightBeam({ delay = 0, opacity = 0.06 }: { delay?: number; opacity?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '-10%',
        left: '50%',
        width: '100px',
        height: '140%',
        background: `linear-gradient(180deg, ${palette.goldChampagne}E6 0%, ${palette.goldDeep}66 40%, transparent 100%)`,
        pointerEvents: 'none',
        opacity,
        animation: `beam 6s ease-in-out ${delay}s infinite`,
      }}
      aria-hidden="true"
    />
  );
}

export function FloatingPetal({
  delay,
  top,
  duration,
  scale = 1,
  flip = false,
  color = palette.goldChampagne,
}: {
  delay: number;
  top: string | number;
  duration: number;
  scale?: number;
  flip?: boolean;
  color?: string;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        pointerEvents: 'none',
        animation: `petal ${duration}s linear ${delay}s infinite`,
      }}
      aria-hidden="true"
    >
      <div
        style={{
          transform: `scale(${scale}) ${flip ? 'scaleY(-1)' : ''}`,
          animation: `petalSpin ${duration * 2.5}s linear ${delay}s infinite`,
        }}
      >
        <svg width="28" height="18" viewBox="0 0 28 18" fill="none">
          <ellipse
            cx="14"
            cy="9"
            rx="12"
            ry="7"
            fill={color}
            fillOpacity="0.42"
            transform="rotate(-12 14 9)"
          />
          <path
            d="M3 11 Q14 4 25 11"
            stroke={color}
            strokeWidth="0.5"
            fill="none"
            opacity="0.55"
          />
        </svg>
      </div>
    </div>
  );
}

export function SectionNumber({
  n,
  label,
  color = palette.goldChampagne,
}: {
  n: string;
  label: string;
  color?: string;
}) {
  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.25rem', marginBottom: '0.5rem' }}>
        <span
          style={{
            fontFamily: 'var(--font-cinzel)',
            fontSize: 'clamp(2.5rem, 7vw, 4.5rem)',
            fontStyle: 'italic',
            color,
            opacity: 0.22,
            lineHeight: 1,
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          {n}
        </span>
        <div
          style={{
            flex: 1,
            height: '1px',
            backgroundColor: color,
            opacity: 0.18,
            marginBottom: '0.55rem',
          }}
        />
      </div>
      <p
        style={{
          fontFamily: 'var(--font-dm-sans)',
          fontSize: '0.6rem',
          textTransform: 'uppercase',
          letterSpacing: '0.4em',
          color,
          opacity: 0.75,
          margin: 0,
        }}
      >
        {label}
      </p>
    </div>
  );
}
