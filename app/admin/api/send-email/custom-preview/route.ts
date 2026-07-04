import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';
import { renderCustomEmailPreview, type EmailTemplateKey } from '@/lib/email/renderTemplate';

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return authCookie === 'true';
}

export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { subject, body: emailBody, baseKey } = body as {
    subject?: string;
    body?: string;
    baseKey?: EmailTemplateKey;
  };

  if (typeof subject !== 'string' || typeof emailBody !== 'string') {
    return NextResponse.json({ message: 'subject and body are required' }, { status: 400 });
  }

  try {
    const rendered = await renderCustomEmailPreview(subject, emailBody, baseKey);
    return NextResponse.json(rendered);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Failed to render preview' },
      { status: 500 }
    );
  }
}
