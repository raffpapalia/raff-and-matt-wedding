import Stripe from 'stripe';

// Stripe credentials are read lazily rather than at module scope.
//
// The obvious version — throwing at import time, the way lib/sms/twilioClient.ts
// does — fails `next build` outright, because Next evaluates every route module
// while collecting page data. On this project a push to master deploys, so a
// missing key would take the entire site's build down rather than just the
// registry. Resolving on first use keeps the blast radius to the thing that
// actually needs the key: registry payment requests 500 with an explicit
// message in the log, and every other page carries on.
//
// Both getters still fail loudly — they throw, they never fall back to a stub
// or a no-op that would silently accept payments into nowhere.

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  }

  // apiVersion is deliberately not passed: the SDK pins its own bundled version
  // (2026-07-29.dahlia for stripe@22.4.0), which is exactly what these TypeScript
  // types are generated against. Passing a different string desyncs the types from
  // the runtime response shape without any compile-time warning.
  cached = new Stripe(secretKey, { appInfo: { name: 'raff-and-matt-wedding' } });
  return cached;
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    // Without this, every delivery would fail signature verification and look
    // like an attack rather than a misconfiguration — so say which it is.
    throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable');
  }
  return secret;
}
