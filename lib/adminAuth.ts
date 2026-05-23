import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const ADMIN_COOKIE_NAME = 'wedding-admin-auth';
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export async function getAdminCookieValue() {
  return (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
}

export async function isAdminAuthenticated() {
  return (await getAdminCookieValue()) === 'true';
}

export async function requireAdminAuth() {
  if (!(await isAdminAuthenticated())) {
    redirect('/admin');
  }
}

export function getSiteBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'your-domain.com';
}
