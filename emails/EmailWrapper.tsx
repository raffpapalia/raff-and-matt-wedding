import {
  Html,
  Head,
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

const bg = '#0A1F14';
const gold = '#D4A83A';
const cream = '#F2E8D0';
const amber = '#C4621A';

const dividerStyle: React.CSSProperties = {
  borderTopStyle: 'solid',
  borderTopColor: gold,
  borderTopWidth: '1px',
  borderBottomWidth: 0,
  borderLeftWidth: 0,
  borderRightWidth: 0,
  margin: '0 0 32px',
};

const thickDividerStyle: React.CSSProperties = {
  borderTopStyle: 'solid',
  borderTopColor: gold,
  borderTopWidth: '4px',
  borderBottomWidth: 0,
  borderLeftWidth: 0,
  borderRightWidth: 0,
  margin: 0,
};

const sansFontStack =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
const serifFontStack = 'Georgia, "Times New Roman", serif';
const displayFontStack = '"Arial Black", "Arial Bold", Gadget, Arial, sans-serif';

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
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: bg, margin: 0, padding: '40px 0' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', backgroundColor: bg }}>

          {/* Top gold bar */}
          <Hr style={thickDividerStyle} />

          <Section style={{ padding: '52px 48px 8px' }}>

            {/* Eyebrow */}
            <Text
              style={{
                margin: '0 0 20px',
                textAlign: 'center',
                fontSize: '11px',
                letterSpacing: '5px',
                textTransform: 'uppercase',
                color: gold,
                fontFamily: serifFontStack,
              }}
            >
              {eyebrow}
            </Text>

            {/* Couple names */}
            <Text
              style={{
                margin: '0 0 10px',
                textAlign: 'center',
                fontSize: '54px',
                lineHeight: '1',
                fontWeight: 900,
                fontFamily: displayFontStack,
                color: cream,
                letterSpacing: '-1px',
              }}
            >
              Matt &amp; Raff
            </Text>

            {/* Date */}
            <Text
              style={{
                margin: '0 0 8px',
                textAlign: 'center',
                fontSize: '20px',
                color: cream,
                fontFamily: serifFontStack,
                letterSpacing: '1px',
              }}
            >
              {weddingDate}
            </Text>

            {/* Venue */}
            <Text
              style={{
                margin: '0 0 36px',
                textAlign: 'center',
                fontSize: '11px',
                letterSpacing: '4px',
                textTransform: 'uppercase',
                color: gold,
                fontFamily: sansFontStack,
              }}
            >
              {venue}
            </Text>

            <Hr style={dividerStyle} />

          </Section>

          <Section style={{ padding: '0 48px 40px' }}>

            {/* Merged body content slot */}
            <Text
              style={{
                margin: '0 0 36px',
                fontSize: '15px',
                color: cream,
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
                    backgroundColor: gold,
                    color: bg,
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
                color: amber,
                fontFamily: serifFontStack,
              }}
            >
              Cancel your plans. We&apos;ve made better ones.
            </Text>

          </Section>

          {/* Footer */}
          <Section style={{ padding: '20px 48px 40px' }}>
            <Text
              style={{
                margin: 0,
                textAlign: 'center',
                fontSize: '11px',
                letterSpacing: '3px',
                color: '#7A6530',
                fontFamily: sansFontStack,
              }}
            >
              #mattraff2027
            </Text>
          </Section>

          {/* Bottom gold bar */}
          <Hr style={thickDividerStyle} />

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
