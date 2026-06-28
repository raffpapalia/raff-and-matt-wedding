'use client';

import { useState } from 'react';
import type { Settings } from '@/lib/supabase';
import { buildGoogleCalendarUrl, buildOutlookCalendarUrl } from '@/lib/ics';
import { tokens } from '../tokens';

interface CalendarControlProps {
  mode: 'save_the_date' | 'invitation';
  settings: Settings;
}

const optionStyle: React.CSSProperties = {
  fontFamily: tokens.mono,
  fontSize: '0.62rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: tokens.ink,
  border: '1px solid rgba(11,33,24,.3)',
  borderRadius: 999,
  padding: '10px 20px',
  textDecoration: 'none',
  transition: '0.2s',
};

// Single "Add to calendar" pill that reveals the three real options (Apple / Google /
// Outlook) inline once clicked, instead of showing all three up front.
export default function CalendarControl({ mode, settings }: CalendarControlProps) {
  const [open, setOpen] = useState(false);
  const googleUrl = buildGoogleCalendarUrl(mode, settings);
  const outlookUrl = buildOutlookCalendarUrl(mode, settings);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="mr-btn mr-btn-solid"
        style={{ border: 'none', cursor: 'pointer' }}
      >
        Add to calendar
      </button>
      {open && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href={`/api/calendar?mode=${mode}`}
            download="matt-raff-wedding.ics"
            style={optionStyle}
            onMouseEnter={e => (e.currentTarget.style.borderColor = tokens.violet)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(11,33,24,.3)')}
          >
            Apple
          </a>
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={optionStyle}
            onMouseEnter={e => (e.currentTarget.style.borderColor = tokens.violet)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(11,33,24,.3)')}
          >
            Google
          </a>
          <a
            href={outlookUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={optionStyle}
            onMouseEnter={e => (e.currentTarget.style.borderColor = tokens.violet)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(11,33,24,.3)')}
          >
            Outlook
          </a>
        </div>
      )}
    </div>
  );
}
