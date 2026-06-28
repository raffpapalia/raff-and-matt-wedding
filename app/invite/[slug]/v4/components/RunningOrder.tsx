import Reveal from './Reveal';
import { tokens } from '../tokens';

interface RunningOrderItem {
  num: string;
  name: string;
  note?: string;
  time: string;
  period: string;
}

interface RunningOrderProps {
  items: RunningOrderItem[];
}

// "How the night unfolds" lineup — one .mr-act row per item.
export default function RunningOrder({ items }: RunningOrderProps) {
  return (
    <div>
      {items.map((item, i) => (
        <Reveal key={i} className="mr-act">
          <div style={{ fontFamily: tokens.mono, fontSize: '0.72rem', color: tokens.violet, letterSpacing: '0.1em' }}>{item.num}</div>
          <div style={{ fontFamily: tokens.display, fontWeight: 600, fontSize: 'clamp(1.5rem, 5.4vw, 2.8rem)', lineHeight: 1 }}>
            {item.name}
            {item.note && (
              <span
                style={{
                  display: 'block',
                  fontFamily: tokens.body,
                  fontWeight: 300,
                  fontSize: '0.82rem',
                  opacity: 0.6,
                  marginTop: 6,
                  maxWidth: '34ch',
                }}
              >
                {item.note}
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: tokens.display,
              fontWeight: 900,
              fontSize: 'clamp(1.8rem, 6.2vw, 3.2rem)',
              color: tokens.persimmon,
              lineHeight: 1,
              textAlign: 'right',
              whiteSpace: 'nowrap',
            }}
          >
            {item.time}
            <small style={{ display: 'block', fontFamily: tokens.grotesque, fontWeight: 500, textTransform: 'uppercase', fontSize: '0.5rem', letterSpacing: '0.2em', color: tokens.bone, opacity: 0.55, marginTop: 4 }}>
              {item.period}
            </small>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
