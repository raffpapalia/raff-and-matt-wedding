// Same production base as email links (lib/email/renderTemplate.tsx) — duplicated rather
// than imported to keep this helper dependency-free for callers like the SMS engine.
const EMAIL_LINK_BASE = process.env.EMAIL_LINK_BASE ?? 'https://www.mattandraff.com';

export function getShortLink(household: { short_code: string }): string {
  return `${EMAIL_LINK_BASE}/i/${household.short_code}`;
}
