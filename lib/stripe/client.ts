import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Fail loudly at import time rather than degrading to a broken checkout —
// same posture as lib/sms/twilioClient.ts. Any route that imports this module
// will 500 with this message in the server log if the key isn't configured,
// instead of silently producing sessions that can't be paid.
if (!STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

// Server-only — never reference via NEXT_PUBLIC_.
//
// apiVersion is deliberately not passed: the SDK pins its own bundled version
// (2026-07-29.dahlia for stripe@22.4.0), which is exactly what these TypeScript
// types are generated against. Passing a different string desyncs the types from
// the runtime response shape without any compile-time warning.
export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  appInfo: { name: 'raff-and-matt-wedding' },
});
