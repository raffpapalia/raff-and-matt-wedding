import {
  Html,
  Head,
  Font,
  Preview,
  Body,
  Container,
  Section,
  Row,
  Column,
  Text,
  Button,
  Hr,
} from 'react-email';

export interface EmailWrapperProps {
  previewText: string;
  eyebrow: string;
  weddingDate: string;
  venue: string;
  bodyText: string;
  inviteLink: string;
  ctaLabel?: string;
}

// v4 "Admit Two" palette — kept in sync with --green-deep/--persimmon/--ink/--bone/--violet
// in app/globals.css .mr-v4 and app/invite/[slug]/v4/tokens.ts.
const deepGreen = '#0F4331';
const bone = '#F6EEDD';
const gold = '#E2B23C';
const persimmon = '#F2603C';
const ink = '#0B2118';
const violet = '#8E7CC3';

// Muted tints derived from the palette above for secondary text — kept as
// solid hex (no rgba) so colour holds up in Outlook's Word rendering engine.
const boneMuted = '#C9BFA1';
const inkMuted = '#6B7268';

const edgeDividerStyle: React.CSSProperties = {
  borderTopStyle: 'solid',
  borderTopColor: gold,
  borderTopWidth: '2px',
  borderBottomWidth: 0,
  borderLeftWidth: 0,
  borderRightWidth: 0,
  margin: 0,
};

const sansFontStack =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
const serifFontStack = 'Georgia, "Times New Roman", serif';

// Code-owned brand shell. Template content (subject/body) is the only thing the
// admin can edit — the invite link, date, and venue below are always engine-injected.
export default function EmailWrapper({
  previewText,
  eyebrow,
  weddingDate,
  venue,
  bodyText,
  inviteLink,
  ctaLabel = 'See the details',
}: EmailWrapperProps) {
  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Fraunces Email"
          fallbackFontFamily="Georgia"
          webFont={{ url: 'https://mattandraff.com/fonts/fraunces-email-normal.woff2', format: 'woff2' }}
          fontWeight={900}
          fontStyle="normal"
        />
        <Font
          fontFamily="Fraunces Email Italic"
          fallbackFontFamily="Georgia"
          webFont={{ url: 'https://mattandraff.com/fonts/fraunces-email-italic.woff2', format: 'woff2' }}
          fontWeight={600}
          fontStyle="italic"
        />
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: bone, margin: 0, padding: '40px 0' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', backgroundColor: bone }}>

          <Section style={{ backgroundColor: bone, padding: '48px 48px 40px' }}>

            {/* Merged body content slot */}
            <Text
              style={{
                margin: '0 0 36px',
                fontSize: '15px',
                color: ink,
                fontFamily: sansFontStack,
                lineHeight: '1.75',
                whiteSpace: 'pre-line',
              }}
            >
              {bodyText}
            </Text>

            {/* CTA — link is always engine-injected, never from template content */}
            <Row>
              <Column style={{ textAlign: 'center' }}>
                <Button
                  href={inviteLink}
                  style={{
                    backgroundColor: persimmon,
                    color: ink,
                    padding: '14px 36px',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    fontFamily: sansFontStack,
                    boxSizing: 'border-box',
                    display: 'inline-block',
                  }}
                >
                  {ctaLabel}
                </Button>
              </Column>
            </Row>

            {/* Tagline */}
            <Text
              style={{
                margin: '36px 0 0',
                textAlign: 'center',
                fontSize: '13px',
                fontStyle: 'italic',
                color: inkMuted,
                fontFamily: serifFontStack,
              }}
            >
              Cancel your plans. We&apos;ve made better ones.
            </Text>

          </Section>

          {/* Footer band — wordmark, no hashtag */}
          <Section style={{ backgroundColor: deepGreen, padding: '36px 48px 40px' }}>
            <Text
              style={{
                margin: '0 0 6px',
                textAlign: 'center',
                fontSize: '32px',
                lineHeight: '1',
                letterSpacing: '-0.5px',
              }}
            >
              <span style={{ fontFamily: 'Fraunces Email, Georgia, serif', fontWeight: 900, color: violet }}>
                Matt
              </span>
              <span style={{ fontFamily: 'Fraunces Email Italic, Georgia, serif', fontStyle: 'italic', fontWeight: 600, color: persimmon }}>
                {' '}&amp;{' '}
              </span>
              <span style={{ fontFamily: 'Fraunces Email, Georgia, serif', fontWeight: 900, color: violet }}>
                Raff
              </span>
            </Text>
            <Text
              style={{
                margin: 0,
                textAlign: 'center',
                fontSize: '11px',
                letterSpacing: '1px',
                color: boneMuted,
                fontFamily: sansFontStack,
              }}
            >
              mattandraff.com
            </Text>
          </Section>

          {/* Bottom gold rule */}
          <Hr style={edgeDividerStyle} />

        </Container>
      </Body>
    </Html>
  );
}

EmailWrapper.PreviewProps = {
  previewText: 'Save the Date — Matt & Raff, 10 July 2027 · Melbourne',
  eyebrow: 'Save the Date',
  weddingDate: '10 July 2027',
  venue: 'Melbourne',
  bodyText:
    "Hi James,\n\nWe can't wait to celebrate with you. Mark your calendar — your personal invitation, with all the details you need, is ready below.",
  inviteLink: 'https://www.mattandraff.com/invite/sample',
} satisfies EmailWrapperProps;
