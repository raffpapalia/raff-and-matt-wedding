import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/admin', request.url));

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  });

  return response;
}
