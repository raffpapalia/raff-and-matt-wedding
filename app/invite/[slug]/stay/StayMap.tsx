import type { NearbyHotel } from '@/lib/supabase';
import { tokens } from '../v4/tokens';
import { MAP_VIEWBOX, QT_MAP_POINT } from './stayData';

const { x: VX, y: VY, w: VW, h: VH } = MAP_VIEWBOX;

// Stylised CBD grid: streets are 100 units apart, with lane-width minor streets
// between the east-west ones. Positions are in map units (see stayData.ts).
const MAJOR_VERTICAL = [400, 500, 600, 700, 800];
const MAJOR_HORIZONTAL: { y: number; x2: number }[] = [
  { y: 0, x2: 940 },
  { y: 100, x2: 940 },
  { y: 200, x2: 806 },
  { y: 300, x2: 806 },
  { y: 400, x2: 806 },
];
const MINOR_HORIZONTAL = [50, 150, 250, 350];

const VERTICAL_STREETS = [
  { x: 392, name: 'ELIZABETH' },
  { x: 492, name: 'SWANSTON' },
  { x: 592, name: 'RUSSELL' },
  { x: 692, name: 'EXHIBITION' },
  { x: 792, name: 'SPRING' },
];
const HORIZONTAL_STREETS = [
  { y: -8, name: 'LA TROBE' },
  { y: 92, name: 'LONSDALE' },
  { y: 192, name: 'BOURKE' },
  { y: 292, name: 'COLLINS' },
  { y: 392, name: 'FLINDERS' },
];

const pct = (v: number, origin: number, span: number) => `${((v - origin) / span) * 100}%`;

// Server-rendered map. Purely decorative (aria-hidden): the hotel list beside it
// carries the same information. On narrow screens only RUSSELL stays labelled,
// rotated up from the top of the grid; the rest appear once the map is wide enough.
export default function StayMap({ hotels }: { hotels: NearbyHotel[] }) {
  const line = { stroke: tokens.bone, strokeOpacity: 0.16, strokeWidth: 7 };
  return (
    <div className="stay-map" aria-hidden="true">
      <svg className="stay-map__svg" viewBox={`${VX} ${VY} ${VW} ${VH}`} aria-hidden="true">
        <rect x={VX} y={VY} width={VW} height={VH} fill={tokens.ink} fillOpacity={0.22} />
        <rect x={818} y={190} width={122} height={250} rx={8} fill={tokens.bone} fillOpacity={0.06} />
        <text x={879} y={320} textAnchor="middle" className="stay-map__lbl">GARDENS</text>

        {MAJOR_VERTICAL.map(x => (
          <line key={`v${x}`} x1={x} y1={VY} x2={x} y2={VY + VH} {...line} />
        ))}
        {MAJOR_HORIZONTAL.map(({ y, x2 }) => (
          <line key={`h${y}`} x1={VX} y1={y} x2={x2} y2={y} {...line} />
        ))}
        {MINOR_HORIZONTAL.map(y => (
          <line key={`m${y}`} x1={VX} y1={y} x2={800} y2={y} stroke={tokens.bone} strokeOpacity={0.07} strokeWidth={3} />
        ))}

        {/* 5-minute walk ring around QT */}
        <circle
          cx={QT_MAP_POINT.x}
          cy={QT_MAP_POINT.y}
          r={190}
          fill={tokens.bone}
          fillOpacity={0.04}
          stroke={tokens.bone}
          strokeOpacity={0.45}
          strokeWidth={1.5}
          strokeDasharray="6 6"
        />

        {VERTICAL_STREETS.map(({ x, name }) => (
          <text
            key={name}
            x={x}
            y={392}
            transform={`rotate(-90 ${x} 392)`}
            className="stay-map__lbl stay-map__lbl--wide"
          >
            {name}
          </text>
        ))}
        <text x={592} y={92} transform="rotate(-90 592 92)" className="stay-map__lbl stay-map__lbl--narrow">
          RUSSELL
        </text>
        {HORIZONTAL_STREETS.map(({ y, name }) => (
          <text key={name} x={410} y={y} className="stay-map__lbl">{name}</text>
        ))}
        <text x={606} y={62} className="stay-map__lbl stay-map__lbl--ring">5 MIN WALK</text>
      </svg>

      <span
        className="stay-map__qt"
        style={{ left: pct(QT_MAP_POINT.x, VX, VW), top: pct(QT_MAP_POINT.y, VY, VH) }}
      >
        QT
      </span>
      {hotels.map((h, i) => (
        <span
          key={h.id}
          className="stay-map__pin"
          style={{ left: pct(Number(h.map_x), VX, VW), top: pct(Number(h.map_y), VY, VH) }}
        >
          {i + 1}
        </span>
      ))}
    </div>
  );
}
