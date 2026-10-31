import Link from 'next/link';
import type { NearbyHotel, Settings } from '@/lib/supabase';
import Section from '../v4/components/Section';
import KickerPill from '../v4/components/KickerPill';
import Names from '../v4/components/Names';
import Perforation from '../v4/components/Perforation';
import CopyCodeButton from './CopyCodeButton';
import HotelCard from './HotelCard';
import StayMap from './StayMap';
import { safeHttpUrl } from './stayData';
import './stay.css';

const CODE_ID = 'stay-code';

function BackLink({ slug, short }: { slug: string; short?: boolean }) {
  return (
    <Link
      href={`/invite/${slug}#good-to-know`}
      className="stay-btn stay-btn--ghost"
      aria-label="Back to invitation"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {short ? (
        <>
          <span className="stay-back__short">Back</span>
          <span className="stay-back__long">Back to invitation</span>
        </>
      ) : (
        <span>Back to invitation</span>
      )}
    </Link>
  );
}

export default function StayView({
  slug,
  settings,
  hotels,
}: {
  slug: string;
  settings: Settings;
  hotels: NearbyHotel[];
}) {
  const code = settings.qt_booking_code;
  const bookingUrl = safeHttpUrl(settings.qt_booking_url);

  return (
    <div className="stay">
      {/* ── Header ── */}
      <header className="stay-header">
        <div className="stay-header__inner">
          <BackLink slug={slug} short />
          <Names fontSize="clamp(22px, 0.6vw + 19.5px, 26px)" />
        </div>
      </header>

      {/* ── Hero ── */}
      <Section
        variant="deep"
        bloom="hero"
        gutter="var(--stay-gutter)"
        padding={{ top: 'clamp(56px, 3.81vw + 41px, 96px)', bottom: 'clamp(64px, 3.81vw + 49px, 104px)' }}
      >
        <div className="stay-stack stay-hero">
          <KickerPill label="Accommodation" />
          <h1 className="stay-h1">Where to stay</h1>
          <p className="stay-lead">
            Everything’s on at QT Hotel Melbourne, so staying there is the easy option. QT have given us a code for a discounted rate, and there are plenty of other hotels nearby if you’d rather stay somewhere else.
          </p>
        </div>
      </Section>

      {/* ── Booking at QT ── */}
      <Section
        variant="sand"
        gutter="var(--stay-gutter)"
        padding={{ top: 'clamp(56px, 4.57vw + 38px, 104px)', bottom: 'clamp(64px, 3.81vw + 49px, 104px)' }}
      >
        <div className="stay-book">
          <div className="stay-stack stay-book__head">
            <KickerPill label="QT Melbourne" surface="sand" />
            <h2 className="stay-h2">Booking at QT</h2>
            <p className="stay-copy">
              Book directly with QT using our code. You choose your own room and nights, and pay the hotel when you stay.
            </p>
          </div>

          <div className="stay-ticket stay-book__ticket">
            <div className="stay-ticket__top">
              <span className="stay-meta">Our code</span>
              <div className="stay-ticket__code-row">
                <div className="stay-code" id={CODE_ID}>{code}</div>
                <CopyCodeButton code={code} targetId={CODE_ID} />
              </div>
            </div>

            <Perforation notch="var(--sand)" />

            <div className="stay-ticket__bottom">
              <span className="stay-meta">How to use it</span>
              <ol className="stay-steps">
                <li>
                  <span className="stay-num" aria-hidden="true">1</span>
                  <span className="stay-steps__text">Go to the QT Hotel Melbourne website and pick your dates.</span>
                </li>
                <li>
                  <span className="stay-num" aria-hidden="true">2</span>
                  <span className="stay-steps__text">Tick “I have a code”.</span>
                </li>
                <li>
                  <span className="stay-num" aria-hidden="true">3</span>
                  <span className="stay-steps__text">
                    Type <strong>{code}</strong> into the Corporate ID box.
                    <span className="stay-steps__note">Not the promo code box.</span>
                  </span>
                </li>
                <li>
                  <span className="stay-num" aria-hidden="true">4</span>
                  <span className="stay-steps__text">Choose your room and book.</span>
                </li>
              </ol>
              {bookingUrl && (
                <>
                  <a className="stay-btn stay-btn--solid" href={bookingUrl} target="_blank" rel="noopener">
                    Book at QT
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M7 17L17 7M9 7h8v8" />
                    </svg>
                    <span className="stay-sr"> (opens in a new tab)</span>
                  </a>
                  <p className="stay-ticket__note">Opens QT’s website. If the code doesn’t work, let us know.</p>
                </>
              )}
            </div>
          </div>

          <dl className="stay-details stay-book__details">
            <div>
              <dt>Check-in</dt>
              <dd>{settings.hotel_checkin}</dd>
            </div>
            <div>
              <dt>Check-out</dt>
              <dd>{settings.hotel_checkout}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>{settings.venue_street}</dd>
            </div>
          </dl>
        </div>
      </Section>

      {/* ── Other hotels nearby ── */}
      {hotels.length > 0 && (
        <Section
          variant="deep"
          gutter="var(--stay-gutter)"
          padding={{ top: 'clamp(64px, 3.81vw + 49px, 104px)', bottom: 'clamp(72px, 3.81vw + 57px, 112px)' }}
        >
          <div className="stay-near">
            <div className="stay-stack stay-near__head">
              <KickerPill label="Nearby" />
              <h2 className="stay-h2">Other hotels nearby</h2>
              <p className="stay-lead" style={{ fontSize: 16 }}>
                We don’t have special rates at these, but they’re all a short walk from QT if it doesn’t suit.
              </p>
            </div>

            <div className="stay-near__body">
              <div className="stay-near__mapcol">
                <StayMap hotels={hotels} />
              </div>
              <div className="stay-near__cards">
                <ol className="stay-cards">
                  {hotels.map((h, i) => (
                    <HotelCard key={h.id} hotel={h} number={i + 1} />
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* ── Footer ── */}
      <Section
        variant="deep"
        bloom="footer"
        className="stay-footer"
        gutter="var(--stay-gutter)"
        padding={{ top: 'clamp(56px, 2.29vw + 47px, 80px)', bottom: 'clamp(56px, 2.29vw + 47px, 80px)' }}
      >
        <div className="stay-footer__inner">
          <Names fontSize="clamp(34px, 1vw + 30px, 44px)" />
          <BackLink slug={slug} />
        </div>
      </Section>
    </div>
  );
}
