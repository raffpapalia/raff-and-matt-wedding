'use client';

import { useState } from 'react';
import { MIN_ROOMS, MAX_ROOMS, type StayAnswer, type StayStatus } from '@/lib/stay/interest';

// Layout, copy and interaction follow design/stay-eoi/Stay.dc.html (desktop) and
// StayMobile.dc.html (mobile). One markup for both: the breakpoint switch lives
// in ../v4/stay.css.

type NightId = 'night_before' | 'wedding_night' | 'staying_longer';

export type StayNight = {
  id: NightId;
  kicker: string; // desktop tile, e.g. "FRI · JUL"
  dow: string; // mobile tile, e.g. "FRI"
  date: string; // "09", or "+" for a longer stay
  title: string;
  note: string;
};

type Dates = {
  nightBeforeLong: string;
  weddingDayLong: string;
  dayAfterLong: string;
  nightBeforeCard: string;
  weddingDayCard: string;
  dayAfterCard: string;
};

type Props = {
  slug: string;
  greeting: string;
  coupleNames: string;
  venueName: string;
  venueShort: string;
  dotDate: string;
  nights: StayNight[];
  dates: Dates;
  isOpen: boolean;
  existing: StayAnswer | null;
};

const STATUS_OPTIONS: { id: StayStatus; label: string; sub: string }[] = [
  { id: 'yes', label: 'Yes, likely', sub: 'We’d probably want a room' },
  { id: 'maybe', label: 'Maybe', sub: 'Too early to say' },
  { id: 'no', label: 'No thanks', sub: 'We’re local or sorted' },
];

type Nights = Record<NightId, boolean>;

const NO_NIGHTS: Nights = { night_before: false, wedding_night: false, staying_longer: false };

function CheckIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Wordmark({ coupleNames }: { coupleNames: string }) {
  const [a, b] = coupleNames.includes(' & ') ? coupleNames.split(' & ') : [coupleNames, ''];
  return (
    <div className="mr-stay-wordmark">
      <span className="mr-stay-wordmark-name">{a}</span>
      {b && (
        <>
          {' '}
          <span className="mr-stay-wordmark-amp">&amp;</span>{' '}
          <span className="mr-stay-wordmark-name">{b}</span>
        </>
      )}
    </div>
  );
}

export default function StayClient({
  slug,
  greeting,
  coupleNames,
  venueName,
  venueShort,
  dotDate,
  nights: nightOptions,
  dates,
  isOpen,
  existing,
}: Props) {
  const [status, setStatus] = useState<StayStatus | null>(existing?.status ?? null);
  const [nights, setNights] = useState<Nights>(
    existing
      ? { night_before: existing.night_before, wedding_night: existing.wedding_night, staying_longer: existing.staying_longer }
      : NO_NIGHTS
  );
  const [rooms, setRooms] = useState<number>(existing?.rooms ?? MIN_ROOMS);
  const [submitted, setSubmitted] = useState<boolean>(existing !== null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { night_before: before, wedding_night: weddingNight, staying_longer: longer } = nights;
  const count = (before ? 1 : 0) + (weddingNight ? 1 : 0);
  const showDetails = status === 'yes' || status === 'maybe';

  function toggleNight(id: NightId) {
    setNights((n) => {
      if (id === 'staying_longer') {
        const on = !n.staying_longer;
        return on ? { night_before: false, wedding_night: false, staying_longer: true } : { ...n, staying_longer: false };
      }
      return { ...n, [id]: !n[id], staying_longer: false };
    });
  }

  let rangeText: string;
  let cardIn = 'TBC';
  let cardOut = 'TBC';
  if (longer) {
    rangeText = 'Longer stay: you’ll confirm your exact dates at RSVP';
  } else if (count === 0) {
    rangeText = 'Pick at least one option';
  } else {
    const checkIn = before ? dates.nightBeforeLong : dates.weddingDayLong;
    const checkOut = weddingNight ? dates.dayAfterLong : dates.weddingDayLong;
    rangeText = `Check in ${checkIn} · check out ${checkOut}`;
    cardIn = before ? dates.nightBeforeCard : dates.weddingDayCard;
    cardOut = weddingNight ? dates.dayAfterCard : dates.weddingDayCard;
  }
  if (status === 'no') {
    cardIn = 'TBC';
    cardOut = 'TBC';
  }

  const roomsText = `${rooms} room${rooms === 1 ? '' : 's'}`;
  const maybeSuffix = status === 'maybe' ? ' · maybe' : '';
  let summary: string;
  if (!status) summary = 'Nothing selected yet';
  else if (longer) summary = `Longer stay · ${roomsText}${maybeSuffix}`;
  else summary = `${count} night${count === 1 ? '' : 's'} · ${roomsText}${maybeSuffix}`;

  const submitDisabled = saving || !status || (showDetails && count === 0 && !longer);

  async function submit() {
    if (submitDisabled || !status) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/stay-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, status, ...nights, rooms }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          res.status === 403
            ? 'Room interest is closed. You’ll be able to confirm a room when you RSVP.'
            : 'Something went wrong saving that. Please try again.'
        );
        return;
      }
      // Reflect whatever the server normalised (e.g. 'no' clearing nights).
      const saved = data.interest as StayAnswer | undefined;
      if (saved) {
        setStatus(saved.status);
        setNights({ night_before: saved.night_before, wedding_night: saved.wedding_night, staying_longer: saved.staying_longer });
        setRooms(saved.rooms ?? MIN_ROOMS);
      }
      setSubmitted(true);
    } catch {
      setError('Something went wrong saving that. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const doneTitle = status === 'no' ? 'Thanks for letting us know.' : 'Thanks, interest noted.';
  const doneBody =
    status === 'no'
      ? 'We won’t count a room for you. If plans change, you can add one when you RSVP.'
      : `We’ve noted ${summary.replace(/ · /g, ', ').toLowerCase()}. Nothing’s booked yet. You’ll confirm your room, with the rate, when you RSVP.`;

  const guestCaps = greeting.toUpperCase();

  return (
    <main className="mr-stay">
      <header className="mr-stay-header">
        <Wordmark coupleNames={coupleNames} />
        <div className="mr-stay-header-meta">
          <span className="mr-stay-desktop-only">{venueName.toUpperCase()}</span>
          <span className="mr-stay-mobile-only">{venueShort}</span> · {dotDate}
        </div>
      </header>

      <section className="mr-stay-grid">
        <div className="mr-stay-intro">
          <div className="mr-stay-kicker">Expression of interest</div>
          <div className="mr-stay-greeting">Hi {greeting},</div>
          <h1 className="mr-stay-heading">
            Staying at <em>{venueShort}?</em>
          </h1>
          <div className="mr-stay-lede">
            <p>
              Are you planning to book a room at{' '}
              <a className="mr-stay-lede-link" href="https://www.qthotels.com/melbourne" target="_blank" rel="noopener noreferrer">
                QT Hotel
              </a>{' '}
              for our wedding?
              <br />
              One lift can take you from ceremony to party to bed!
            </p>
            <p>
              We are organising a group room booking which will give you a better rate than booking directly. The more
              rooms we hold, the better the rate will be.
            </p>
            <p>
              If you’re keen to stay, we’ll handle the booking for you via your RSVP. You won’t have to do anything
              other than pay on check-in.
            </p>
            <p>QT Hotel is right in the middle of the CBD with heaps of other options if QT isn’t your thing.</p>
            <p>Be on the lookout for the invite coming soon!</p>
          </div>

          <div className="mr-stay-keycard" aria-hidden="true">
            <div className="mr-stay-keycard-top">
              <div className="mr-stay-keycard-venue">{venueName.toUpperCase()}</div>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M8.5 7.5a6 6 0 0 1 0 9" />
                <path d="M12 5a9.5 9.5 0 0 1 0 14" />
                <path d="M15.5 2.5a13 13 0 0 1 0 19" />
              </svg>
            </div>
            <div className="mr-stay-keycard-mid">
              <div className="mr-stay-keycard-names">
                {coupleNames.includes(' & ') ? (
                  <>
                    {coupleNames.split(' & ')[0]} <em>&amp;</em> {coupleNames.split(' & ')[1]}
                  </>
                ) : (
                  coupleNames
                )}
              </div>
              <div className="mr-stay-mono-sm">GUEST · {guestCaps}</div>
            </div>
            <div className="mr-stay-keycard-cells">
              <div>
                <div className="mr-stay-keycard-label">IN</div>
                <div className="mr-stay-keycard-value">{cardIn}</div>
              </div>
              <div>
                <div className="mr-stay-keycard-label">OUT</div>
                <div className="mr-stay-keycard-value">{cardOut}</div>
              </div>
              <div>
                <div className="mr-stay-keycard-label">ROOMS</div>
                <div className="mr-stay-keycard-value">{status === 'no' ? '00' : String(rooms).padStart(2, '0')}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mr-stay-card">
          {!isOpen ? (
            <div className="mr-stay-closed">
              <p>Room interest is closed. You’ll be able to confirm a room when you RSVP.</p>
            </div>
          ) : submitted ? (
            <div className="mr-stay-done" role="status">
              <div className="mr-stay-done-icon">
                <CheckIcon size={24} />
              </div>
              <h2 className="mr-stay-done-title">{doneTitle}</h2>
              <p className="mr-stay-done-body">{doneBody}</p>
              <div>
                <button type="button" className="mr-stay-ghost" onClick={() => setSubmitted(false)}>
                  Change my answer
                </button>
              </div>
            </div>
          ) : (
            <div className="mr-stay-form">
              <fieldset className="mr-stay-fieldset">
                <legend className="mr-stay-legend">
                  <span className="mr-stay-num">01</span>
                  <span className="mr-stay-q">Are you likely to stay at {venueShort}?</span>
                </legend>
                <div className="mr-stay-status-grid">
                  {STATUS_OPTIONS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className="mr-stay-option mr-stay-status"
                      aria-pressed={status === o.id}
                      onClick={() => setStatus(o.id)}
                    >
                      <span className="mr-stay-option-label">{o.label}</span>
                      <span className="mr-stay-option-sub">{o.sub}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              {showDetails && (
                <>
                  <fieldset className="mr-stay-fieldset">
                    <legend className="mr-stay-legend">
                      <span className="mr-stay-num">02</span>
                      <span className="mr-stay-q">Which nights?</span>
                      <span className="mr-stay-legend-hint">Pick all that apply</span>
                    </legend>
                    <div className="mr-stay-night-grid">
                      {nightOptions.map((n) => {
                        const on = nights[n.id];
                        return (
                          <button
                            key={n.id}
                            type="button"
                            className="mr-stay-option mr-stay-night"
                            aria-pressed={on}
                            onClick={() => toggleNight(n.id)}
                          >
                            <span className="mr-stay-night-date">
                              <span className="mr-stay-night-kicker mr-stay-desktop-only">{n.kicker}</span>
                              <span className="mr-stay-night-kicker mr-stay-mobile-only">{n.dow}</span>
                              <span className="mr-stay-night-day">{n.date}</span>
                            </span>
                            <span className="mr-stay-night-text">
                              <span className="mr-stay-night-title">{n.title}</span>
                              <span className="mr-stay-option-sub">{n.note}</span>
                            </span>
                            <span className="mr-stay-dot">{on && <CheckIcon size={13} />}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mr-stay-range" aria-live="polite">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" />
                        <circle cx="7" cy="11" r="1.6" />
                      </svg>
                      <span>{rangeText}</span>
                    </div>
                  </fieldset>

                  <div className="mr-stay-rooms">
                    <div className="mr-stay-legend" id="mr-stay-rooms-label">
                      <span className="mr-stay-num">03</span>
                      <span className="mr-stay-q">How many rooms?</span>
                    </div>
                    <div className="mr-stay-stepper" role="group" aria-labelledby="mr-stay-rooms-label">
                      <button
                        type="button"
                        className="mr-stay-step"
                        aria-label="One fewer room"
                        disabled={rooms <= MIN_ROOMS}
                        onClick={() => setRooms((r) => Math.max(MIN_ROOMS, r - 1))}
                      >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                          <path d="M5 12h14" />
                        </svg>
                      </button>
                      <div className="mr-stay-step-value" aria-live="polite">
                        <span aria-hidden="true">{rooms}</span>
                        <span className="sr-only">{roomsText}</span>
                      </div>
                      <button
                        type="button"
                        className="mr-stay-step"
                        aria-label="One more room"
                        disabled={rooms >= MAX_ROOMS}
                        onClick={() => setRooms((r) => Math.min(MAX_ROOMS, r + 1))}
                      >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                          <path d="M5 12h14M12 5v14" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {status === 'no' && (
                <div className="mr-stay-no-note">
                  No worries at all. We won’t count a room for you, and if plans change you can add one when you RSVP.
                </div>
              )}

              <div className="mr-stay-perf" aria-hidden="true">
                <span className="mr-stay-notch mr-stay-notch--left" />
                <span className="mr-stay-perf-line" />
                <span className="mr-stay-notch mr-stay-notch--right" />
              </div>

              <div className="mr-stay-submit-block">
                {status !== 'no' && (
                  <div className="mr-stay-summary">
                    <div className="mr-stay-summary-label">YOUR INTEREST</div>
                    <div className="mr-stay-summary-value">{summary}</div>
                  </div>
                )}
                <button type="button" className="mr-stay-submit" onClick={submit} disabled={submitDisabled}>
                  {saving ? 'Saving…' : status === 'no' ? 'Let us know' : 'Register interest'}
                </button>
                {error && (
                  <p className="mr-stay-error" role="alert">
                    {error}
                  </p>
                )}
                {status !== 'no' && (
                  <p className="mr-stay-fineprint">
                    This is an expression of interest only. It’s not a booking, and you’re not committed to anything.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
