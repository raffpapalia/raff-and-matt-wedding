import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import { renderEmailPreview, type EmailTemplateKey } from '@/lib/email/renderTemplate';

const VALID_KEYS: EmailTemplateKey[] = [
  'save_the_date',
  'invitation',
  'rsvp_reminder',
  'rsvp_confirmation',
  'pre_wedding',
  'thank_you',
  'link_recovery',
];

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSession(authCookie);
}

export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { key, subject, body: templateBody } = body as { key?: string; subject?: string; body?: string };

  if (!key || !VALID_KEYS.includes(key as EmailTemplateKey)) {
    return NextResponse.json({ message: 'Invalid or missing template key' }, { status: 400 });
  }
  if (typeof subject !== 'string' || typeof templateBody !== 'string') {
    return NextResponse.json({ message: 'subject and body are required' }, { status: 400 });
  }

  try {
    const rendered = await renderEmailPreview(key as EmailTemplateKey, subject, templateBody);
    return NextResponse.json(rendered);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Failed to render preview' },
      { status: 500 }
    );
  }
}
