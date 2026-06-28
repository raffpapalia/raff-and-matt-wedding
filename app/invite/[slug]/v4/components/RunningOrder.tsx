import Reveal from './Reveal';
import { formatDisplayTime } from '@/lib/date';
import { tokens } from '../tokens';

interface RunningOrderItem {
  num: string;
  name: string;
  note?: string;
  time: string;
}

interface RunningOrderProps {
  items: RunningOrderItem[];
}

// "How the night unfolds" lineup — one .mr-act row per item, read left-to-right
// as TIME · LABEL (time in persimmon, leading) rather than a separate
// right-aligned time column.
export default function RunningOrder({ items }: RunningOrderProps) {
  return (
    <div>
      {items.map((item, i) => (
        <Reveal key={i} className="mr-act">
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: tokens.display, fontWeight: 900, fontSize: 'clamp(1.8rem, 6.2vw, 3.2rem)', color: tokens.persimmon, lineHeight: 1, whiteSpace: 'nowrap' }}>
                {formatDisplayTime(item.time)}
              </span>
              <span style={{ fontFamily: tokens.display, fontWeight: 900, fontSize: 'clamp(1.8rem, 6.2vw, 3.2rem)', color: tokens.violet, lineHeight: 1 }}>
                ·
              </span>
              <span style={{ fontFamily: tokens.display, fontWeight: 600, fontSize: 'clamp(1.5rem, 5.4vw, 2.8rem)', lineHeight: 1, color: tokens.sand }}>
                {item.name}
              </span>
            </div>
            {item.note && (
              <span
                style={{
                  display: 'block',
                  fontFamily: tokens.body,
                  fontWeight: 300,
                  fontSize: '0.82rem',
                  color: tokens.sand,
                  opacity: 0.75,
                  marginTop: 6,
                  maxWidth: '34ch',
                }}
              >
                {item.note}
              </span>
            )}
          </div>
        </Reveal>
      ))}
    </div>
  );
}
