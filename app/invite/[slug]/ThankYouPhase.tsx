import type { Household, Guest, Settings } from '@/lib/supabase';
import { formatDotted, cityFromLocation } from '@/lib/date';
import StickyBar from './v4/components/StickyBar';
import Section from './v4/components/Section';
import Reveal from './v4/components/Reveal';
import Kicker from './v4/components/Kicker';
import Button from './v4/components/Button';
import Stamp from './v4/components/Stamp';
import TreatedPhoto from './v4/components/TreatedPhoto';
import { tokens } from './v4/tokens';

interface ThankYouPhaseProps {
  household: Household;
  guests: Guest[];
  settings: Settings;
}

interface StateCopy {
  headline: string;
  opening: string;
  galleryHeading: string;
  signoff: string;
}

const ATTENDED_COPY: StateCopy = {
  headline: 'Thank you for being there.',
  opening: "It wouldn't have been the same without you in the room.",
  galleryHeading: 'In case you want to relive it',
  signoff: 'Until the next dance floor —',
};

const MISSED_COPY: StateCopy = {
  headline: 'We missed you.',
  opening: "You were there in spirit — here's the night, so you don't miss a thing.",
  galleryHeading: "Here's how it went",
  signoff: "Hopefully we'll catch you on the next one —",
};

export default function ThankYouPhase({ household, guests, settings }: ThankYouPhaseProps) {
  const attended = guests.some(g => g.rsvp_status === 'attending');
  const copy = attended ? ATTENDED_COPY : MISSED_COPY;
  const [name1, name2] = settings.couple_names.includes(' & ')
    ? settings.couple_names.split(' & ')
    : [settings.couple_names, ''];

  const hasNote = Boolean(household.thank_you_message || household.thank_you_photo_url);
  const hasFeaturePhotos = Boolean(settings.wedding_photo_url || household.thank_you_photo_url);
  const bothPhotos = Boolean(settings.wedding_photo_url && household.thank_you_photo_url);

  return (
    <div style={{ fontFamily: tokens.body, fontWeight: 300, lineHeight: 1.6 }}>
      <StickyBar
        coupleNames={settings.couple_names}
        rightHref={settings.google_photos_url || '#gallery'}
        rightLabel="The photos"
        rightVariant="ghost"
      />

      {/* ── HERO ── */}
      <Section variant="deep" backgroundImage={settings.wedding_photo_url || undefined} minHeight="96svh" contentAlign="center">
        <Reveal style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Stamp line="That's a wrap ✓" color={tokens.gold} inline />
          <h1
            style={{
              fontFamily: tokens.display,
              fontWeight: 900,
              fontSize: 'clamp(2.8rem, 10vw, 6rem)',
              lineHeight: 0.98,
              letterSpacing: '-0.02em',
              maxWidth: '15ch',
              margin: 0,
            }}
          >
            {copy.headline}
          </h1>
          <p
            style={{
              fontFamily: tokens.display,
              fontStyle: 'italic',
              fontSize: 'clamp(1.15rem, 3.4vw, 1.7rem)',
              marginTop: 22,
              maxWidth: '26ch',
              opacity: 0.9,
            }}
          >
            {copy.opening}
          </p>
        </Reveal>
      </Section>

      {/* ── NOTE — household-driven, optional ── */}
      {hasNote && (
        <Section variant="deep">
          <Reveal style={{ maxWidth: 620, margin: '0 auto', textAlign: 'center' }}>
            <Kicker variant="bare" label="A note from us" />
            {household.thank_you_message && (
              <p
                style={{
                  fontFamily: tokens.display,
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: 'clamp(1.3rem, 4vw, 2rem)',
                  lineHeight: 1.3,
                  marginTop: 18,
                  whiteSpace: 'pre-line',
                }}
              >
                {household.thank_you_message}
              </p>
            )}
            {household.thank_you_photo_url && (
              <div style={{ marginTop: 24, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>
                <TreatedPhoto src={household.thank_you_photo_url} alt="" ratio={3 / 4} shape="rect" />
              </div>
            )}
            <p
              style={{
                fontFamily: tokens.mono,
                fontSize: '0.66rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: tokens.gold,
                marginTop: 24,
              }}
            >
              — {settings.couple_names}
            </p>
          </Reveal>
        </Section>
      )}

      {/* ── GALLERY ── */}
      <Section variant="bone" id="gallery">
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(34px, 5vw, 52px)' }}>
            <Kicker variant="bare" label="The night" />
            <h2 style={{ fontFamily: tokens.display, fontWeight: 900, fontSize: 'clamp(2rem, 7vw, 3.4rem)', marginTop: 12, color: tokens.green }}>
              {copy.galleryHeading}
            </h2>
          </div>

          {hasFeaturePhotos && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: bothPhotos ? 'repeat(2, 1fr)' : '1fr',
                gap: 16,
                maxWidth: bothPhotos ? 720 : 420,
                margin: '0 auto',
              }}
            >
              {settings.wedding_photo_url && <TreatedPhoto src={settings.wedding_photo_url} alt="" ratio={4 / 5} shape="rect" />}
              {household.thank_you_photo_url && <TreatedPhoto src={household.thank_you_photo_url} alt="" ratio={4 / 5} shape="rect" />}
            </div>
          )}

          {settings.google_photos_url && (
            <div style={{ textAlign: 'center', marginTop: 'clamp(34px, 5vw, 48px)' }}>
              <p style={{ opacity: 0.7, marginBottom: 18 }}>The full album lives here — download anything you love.</p>
              <Button href={settings.google_photos_url} variant="solid">
                View the full gallery
              </Button>
            </div>
          )}
        </Reveal>
      </Section>

      {/* ── SIGN-OFF ── */}
      <Section variant="deep">
        <Reveal style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: tokens.display, fontStyle: 'italic', fontSize: 'clamp(1.3rem, 4vw, 2rem)', opacity: 0.9, margin: 0 }}>
            {copy.signoff}
          </p>
          <div style={{ fontFamily: tokens.display, fontWeight: 900, fontSize: 'clamp(2.2rem, 9vw, 4rem)', marginTop: 14 }}>
            {name1} <em style={{ fontStyle: 'italic', color: tokens.persimmon }}>&amp;</em> {name2}
          </div>
        </Reveal>
      </Section>

      {/* ── FOOTER ── */}
      <footer style={{ background: tokens.greenDeep, textAlign: 'center', padding: '46px clamp(20px, 5.5vw, 90px)' }}>
        <p
          style={{
            fontFamily: tokens.mono,
            fontSize: '0.6rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            opacity: 0.55,
            margin: 0,
            color: tokens.bone,
          }}
        >
          {settings.hashtag} · {formatDotted(settings.wedding_date, { year: '4', spaced: true })} · {cityFromLocation(settings.location)}
        </p>
      </footer>
    </div>
  );
}
