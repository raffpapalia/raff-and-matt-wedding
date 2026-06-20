export type NormalizeMobileResult =
  | { ok: true; e164: string }
  | { ok: false; reason: string };

// Australian mobiles: +61 followed by 4 and 8 more digits (9 digits total after the
// country code), e.g. +61485010727.
const AU_MOBILE_RE = /^\+614\d{8}$/;

// Accepts the formats guests actually enter: '0485 010 727', '0485010727',
// '+61485010727', '61485010727', '0061485010727', with arbitrary spaces/dashes/parens.
// Anything that doesn't resolve to a valid AU mobile is rejected rather than guessed at.
export function normalizeAuMobile(raw: string | null | undefined): NormalizeMobileResult {
  if (!raw || !raw.trim()) {
    return { ok: false, reason: 'Mobile number is empty' };
  }

  const cleaned = raw.replace(/[\s\-()]/g, '');

  let national: string;
  if (cleaned.startsWith('+61')) {
    national = cleaned.slice(3);
  } else if (cleaned.startsWith('0061')) {
    national = cleaned.slice(4);
  } else if (cleaned.startsWith('61') && cleaned.length === 11) {
    national = cleaned.slice(2);
  } else if (cleaned.startsWith('0')) {
    national = cleaned.slice(1);
  } else {
    return { ok: false, reason: `Unrecognised mobile format: ${raw}` };
  }

  const e164 = `+61${national}`;
  if (!AU_MOBILE_RE.test(e164)) {
    return { ok: false, reason: `Not a valid Australian mobile number: ${raw}` };
  }

  return { ok: true, e164 };
}
