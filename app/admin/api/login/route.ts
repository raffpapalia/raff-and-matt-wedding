import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_MAX_AGE, ADMIN_COOKIE_NAME, createAdminSession, safeEqual } from '@/lib/adminAuth';

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = formData.get('password');
  const expected = process.env.ADMIN_PASSWORD;
  const redirectUrl = new URL('/admin', request.url);

  const valid =
    typeof password === 'string' &&
    typeof expected === 'string' &&
    expected.length > 0 &&
    safeEqual(password, expected);

  if (!valid) {
    redirectUrl.searchParams.set('error', 'invalid');
    return NextResponse.redirect(redirectUrl);
  }

  const token = createAdminSession();
  if (!token) {
    console.error('[admin:login] ADMIN_PASSWORD / ADMIN_SESSION_SECRET not configured');
    redirectUrl.searchParams.set('error', 'invalid');
    return NextResponse.redirect(redirectUrl);
  }

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE,
    sameSite: 'lax',
  });

  return response;
}
