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

export type BodyBlock = { type: 'text'; content: string } | { type: 'cta' };

export interface EmailWrapperProps {
  previewText: string;
  eyebrow: string;
  weddingDate: string;
  venue: string;
  bodyBlocks: BodyBlock[];
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

// Muted tint derived from the palette above for secondary text — kept as
// solid hex (no rgba) so colour holds up in Outlook's Word rendering engine.
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

// One consistent gap between every paragraph-level element (text blocks, the CTA
// button, the tagline) — no element gets its own separate/special-cased margin.
const paragraphGap = '18px';

// react-email's <Font> component always injects a `* { font-family: ... }` rule
// alongside its @font-face — harmless for elements that set their own inline
// fontFamily (all of ours do), EXCEPT it directly matches every other element
// with no font-family override of its own, like the <span> line-break wrappers
// below, overriding what they'd otherwise inherit from their parent. Since the
// last-declared @font-face's `*` rule wins the cascade, that made ALL body text
// resolve to the italic face in real browsers (e.g. this admin preview iframe) —
// invisible in Gmail only because Gmail doesn't support @font-face at all and
// silently falls back to Georgia. Declaring the @font-face rules directly here,
// without the `*` selector, avoids the footgun entirely.
const fontFaceStyle = `
  @font-face {
    font-family: 'Fraunces Email';
    font-style: normal;
    font-weight: 900;
    mso-font-alt: 'Georgia';
    src: url(https://mattandraff.com/fonts/fraunces-email-normal.woff2) format('woff2');
  }
  @font-face {
    font-family: 'Fraunces Email Italic';
    font-style: italic;
    font-weight: 600;
    mso-font-alt: 'Georgia';
    src: url(https://mattandraff.com/fonts/fraunces-email-italic.woff2) format('woff2');
  }
`;

// `white-space: pre-line` isn't reliably honoured by email clients (notably
// Outlook's Word rendering engine ignores it), so line breaks are emitted as
// literal <br/> tags instead — those work everywhere. A blank line (\n\n)
// naturally becomes two consecutive <br/>s via the empty string between them.
function renderWithLineBreaks(content: string): React.ReactNode {
  return content.split('\n').map((line, i, lines) => (
    <span key={i}>
      {line}
      {i < lines.length - 1 && <br />}
    </span>
  ));
}

// Code-owned brand shell. Template content (subject/body) is the only thing the
// admin can edit — the invite link, date, and venue below are always engine-injected.
export default function EmailWrapper({
  previewText,
  eyebrow,
  weddingDate,
  venue,
  bodyBlocks,
  inviteLink,
  ctaLabel = 'See the details',
}: EmailWrapperProps) {
  return (
    <Html lang="en">
      <Head>
        <style dangerouslySetInnerHTML={{ __html: fontFaceStyle }} />
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: bone, margin: 0, padding: '40px 0' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', backgroundColor: bone }}>

          <Section style={{ backgroundColor: bone, padding: '48px 48px 40px' }}>

            {/* Body content — {{cta_button}} paragraphs become a Button at that
                position; if the tag isn't present anywhere, no button renders. */}
            {bodyBlocks.map((block, index) => {
              if (block.type === 'cta') {
                return (
                  <Row key={index} style={{ marginBottom: paragraphGap }}>
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
                );
              }
              return (
                <Text
                  key={index}
                  style={{
                    margin: `0 0 ${paragraphGap}`,
                    fontSize: '15px',
                    color: ink,
                    fontFamily: sansFontStack,
                    lineHeight: '1.75',
                  }}
                >
                  {renderWithLineBreaks(block.content)}
                </Text>
              );
            })}

            {/* Tagline — no margin of its own; the block above it (text or cta)
                already supplies paragraphGap via its own bottom margin. */}
            <Text
              style={{
                margin: 0,
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

          {/* Footer band — wordmark only. No hashtag, no link/URL text: plain
              "mattandraff.com" text was being auto-linkified by Gmail (default
              blue/underline styling applied regardless of our own color), so
              it's removed outright rather than merely restyled. */}
          <Section style={{ backgroundColor: deepGreen, padding: '36px 48px 40px' }}>
            <Text
              style={{
                margin: 0,
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
  bodyBlocks: [
    {
      type: 'text',
      content:
        "Hi James,\n\nWe can't wait to celebrate with you. Mark your calendar — your personal invitation, with all the details you need, is ready below.",
    },
    { type: 'cta' },
  ],
  inviteLink: 'https://www.mattandraff.com/invite/sample',
} satisfies EmailWrapperProps;
