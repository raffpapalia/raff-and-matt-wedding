import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const ADMIN_COOKIE_NAME = 'wedding-admin-auth';
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

// HMAC key for session tokens. Set ADMIN_SESSION_SECRET to use a dedicated
// secret; otherwise it is derived from ADMIN_PASSWORD so no extra deployment
// config is required (with the side effect that changing the password also
// revokes all existing sessions).
function sessionSecret(): string | null {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  if (process.env.ADMIN_PASSWORD) return `${process.env.ADMIN_PASSWORD}::wedding-admin-session-v1`;
  return null;
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

// Constant-time string equality. Hashing both sides first makes inputs of
// different lengths safe to pass to timingSafeEqual.
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(
    createHash('sha256').update(a).digest(),
    createHash('sha256').update(b).digest()
  );
}

// Session token format: "<expiryMs>.<hmac(expiryMs)>". Stateless — verifiable
// on any server instance, survives deploys, unforgeable without the secret.
export function createAdminSession(): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const expires = String(Date.now() + ADMIN_COOKIE_MAX_AGE * 1000);
  return `${expires}.${sign(expires, secret)}`;
}

export function verifyAdminSession(value: string | null | undefined): boolean {
  if (!value) return false;
  const secret = sessionSecret();
  if (!secret) return false;
  const dot = value.indexOf('.');
  if (dot <= 0) return false;
  const expires = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  if (!/^\d{1,16}$/.test(expires) || Number(expires) < Date.now()) return false;
  return safeEqual(signature, sign(expires, secret));
}

export async function getAdminCookieValue() {
  return (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
}

export async function isAdminAuthenticated() {
  return verifyAdminSession(await getAdminCookieValue());
}

export async function requireAdminAuth() {
  if (!(await isAdminAuthenticated())) {
    redirect('/admin');
  }
}

export function getSiteBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'your-domain.com';
}
