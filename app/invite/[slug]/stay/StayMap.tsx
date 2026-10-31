import type { NearbyHotel } from '@/lib/supabase';
import { tokens } from '../v4/tokens';
import { MAP_VIEWBOX, QT_MAP_POINT, WALK_RING_MINUTES, WALK_RING_RADIUS } from './stayData';

const { x: VX, y: VY, w: VW, h: VH } = MAP_VIEWBOX;

// The CBD street grid, in map units (see stayData.ts). Positions are the real
// street centrelines from OpenStreetMap, straightened to the grid, so blocks are
// about 92 units (230 m) apart. Spring St is the eastern edge; the gardens sit
// beyond it.
const MAJOR_VERTICAL = [423.5, 514, 608, 699, 794];
const MAJOR_HORIZONTAL: { y: number; x2: number }[] = [
  { y: 47, x2: 940 }, // La Trobe
  { y: 144, x2: 940 }, // Lonsdale
  { y: 235, x2: 800 }, // Bourke
  { y: 330, x2: 800 }, // Collins
  { y: 418.5, x2: 800 }, // Flinders
];
// Little Lonsdale, Little Bourke, Little Collins, Flinders Lane.
const MINOR_HORIZONTAL = [96, 189, 282, 374.5];

const VERTICAL_STREETS = [
  { x: 423.5, name: 'ELIZABETH' },
  { x: 514, name: 'SWANSTON' },
  { x: 608, name: 'RUSSELL' },
  { x: 699, name: 'EXHIBITION' },
  { x: 794, name: 'SPRING' },
];
const HORIZONTAL_STREETS = [
  { y: 47, name: 'LA TROBE' },
  { y: 144, name: 'LONSDALE' },
  { y: 235, name: 'BOURKE' },
  { y: 330, name: 'COLLINS' },
  { y: 418.5, name: 'FLINDERS' },
];

// Real park outlines east of Spring St, simplified: Parliament Gardens, Parliament
// House Gardens, Gordon Reserve, Treasury Gardens and Fitzroy Gardens.
const PARKS = [
  '865,176 841,164 824,155 816,172 806,192 803,200 842,185',
  '802,205 842,185 862,196 885,214 874,235 851,257 839,243 806,212',
  '822,286 798,296 798,275 833,275',
  '797,344 926,345 870,450 831,432 810,421 798,411',
  '992,244 1145,326 1076,456 1034,536 999,523 957,500 882,459 880,456 915,391',
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
        {PARKS.map(points => (
          <polygon key={points} points={points} fill={tokens.bone} fillOpacity={0.06} />
        ))}
        <text x={862} y={400} textAnchor="middle" className="stay-map__lbl">GARDENS</text>

        {MAJOR_VERTICAL.map(x => (
          <line key={`v${x}`} x1={x} y1={VY} x2={x} y2={VY + VH} {...line} />
        ))}
        {MAJOR_HORIZONTAL.map(({ y, x2 }) => (
          <line key={`h${y}`} x1={VX} y1={y} x2={x2} y2={y} {...line} />
        ))}
        {MINOR_HORIZONTAL.map(y => (
          <line key={`m${y}`} x1={VX} y1={y} x2={794} y2={y} stroke={tokens.bone} strokeOpacity={0.07} strokeWidth={3} />
        ))}

        {/* Walk ring around QT: see WALK_RING_MINUTES for how long its edge takes */}
        <circle
          cx={QT_MAP_POINT.x}
          cy={QT_MAP_POINT.y}
          r={WALK_RING_RADIUS}
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
            x={x - 8}
            y={392}
            transform={`rotate(-90 ${x - 8} 392)`}
            className="stay-map__lbl stay-map__lbl--wide"
          >
            {name}
          </text>
        ))}
        <text x={600} y={92} transform="rotate(-90 600 92)" className="stay-map__lbl stay-map__lbl--narrow">
          RUSSELL
        </text>
        {HORIZONTAL_STREETS.map(({ y, name }) => (
          <text key={name} x={430} y={y - 8} className="stay-map__lbl">{name}</text>
        ))}
        <text x={614} y={62} className="stay-map__lbl stay-map__lbl--ring">{WALK_RING_MINUTES} MIN WALK</text>
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
