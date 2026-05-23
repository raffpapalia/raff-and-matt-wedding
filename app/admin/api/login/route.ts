import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_MAX_AGE, ADMIN_COOKIE_NAME } from '@/lib/adminAuth';

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = formData.get('password');
  const expected = process.env.ADMIN_PASSWORD;
  const redirectUrl = new URL('/admin', request.url);

  if (typeof password !== 'string' || password !== expected) {
    redirectUrl.searchParams.set('error', 'invalid');
    return NextResponse.redirect(redirectUrl);
  }

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: 'true',
    httpOnly: true,
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE,
    sameSite: 'lax',
  });

  return response;
}
