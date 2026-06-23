import Reveal from './Reveal';
import Button from './Button';
import { tokens } from '../tokens';

interface TicketProps {
  serial: string;
  admits: string;
  household: string;
  date: string;
  doors: string;
  venue: string;
  replyBy: string;
  ctaLabel: string;
  ctaHref: string;
}

const metaLabelStyle: React.CSSProperties = {
  fontFamily: tokens.mono,
  fontSize: '0.55rem',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: tokens.muted,
};

const metaValueStyle: React.CSSProperties = {
  fontFamily: tokens.display,
  fontWeight: 600,
  fontSize: '1.05rem',
  marginTop: 4,
};

// "ADMIT TWO" perforated ticket — the RSVP centrepiece.
export default function Ticket({ serial, admits, household, date, doors, venue, replyBy, ctaLabel, ctaHref }: TicketProps) {
  return (
    <Reveal className="mr-ticket">
      <div style={{ padding: 'clamp(28px, 5vw, 44px)' }}>
        <div
          style={{
            fontFamily: tokens.mono,
            fontSize: '0.6rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: tokens.persimmon,
          }}
        >
          {serial}
        </div>
        <div
          style={{
            fontFamily: tokens.display,
            fontWeight: 900,
            fontSize: 'clamp(2.2rem, 9vw, 3.4rem)',
            lineHeight: 0.9,
            margin: '18px 0 4px',
          }}
        >
          ADMIT{admits ? ` ${admits.toUpperCase()}` : ''}
        </div>
        <div
          style={{
            fontFamily: tokens.display,
            fontWeight: 600,
            fontStyle: 'italic',
            // Same clamp scale as BoardingPass's .mr-pass-who, so the household/admitting
            // name reads at a consistent size across the Ticket and BoardingPass.
            fontSize: 'clamp(1.6rem, 5.5vw, 2.4rem)',
            color: tokens.green,
          }}
        >
          {household}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, marginTop: 24 }}>
          <div>
            <div style={metaLabelStyle}>Date</div>
            <div style={metaValueStyle}>{date}</div>
          </div>
          <div>
            <div style={metaLabelStyle}>Doors</div>
            <div style={metaValueStyle}>{doors}</div>
          </div>
          <div>
            <div style={metaLabelStyle}>Venue</div>
            <div style={metaValueStyle}>{venue}</div>
          </div>
        </div>
      </div>

      <div className="mr-perf" />

      <div
        style={{
          padding: 'clamp(22px, 4vw, 32px) clamp(28px, 5vw, 44px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 18,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontFamily: tokens.mono, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.muted }}>
          Please reply by
          <b style={{ display: 'block', color: tokens.ink, fontSize: '0.8rem', marginTop: 4, letterSpacing: '0.04em' }}>{replyBy}</b>
        </div>
        <Button href={ctaHref} variant="solid">
          {ctaLabel}
        </Button>
      </div>
    </Reveal>
  );
}
