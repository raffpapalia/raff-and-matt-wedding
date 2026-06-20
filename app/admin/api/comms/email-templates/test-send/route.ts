import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';
import { renderEmailTemplate, type EmailTemplateKey } from '@/lib/email/renderTemplate';
import { FROM_EMAIL, REPLY_TO } from '@/lib/email/sendEmail';

const VALID_KEYS: EmailTemplateKey[] = [
  'save_the_date',
  'invitation',
  'rsvp_reminder',
  'rsvp_confirmation',
  'pre_wedding',
  'thank_you',
  'link_recovery',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return authCookie === 'true';
}

// Test sends use the real engine (renderEmailTemplate -> Resend) against the
// CURRENTLY SAVED template content, but are never written to `communications` —
// there's no real household/guest to attach the row to, and forcing one in would
// either fail the foreign key or make a real guest look emailed. The "[TEST]"
// subject prefix is the only marker, and the result is shown inline instead.
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { key, to } = body as { key?: string; to?: string };

  if (!key || !VALID_KEYS.includes(key as EmailTemplateKey)) {
    return NextResponse.json({ message: 'Invalid or missing template key' }, { status: 400 });
  }
  if (typeof to !== 'string' || !EMAIL_RE.test(to.trim())) {
    return NextResponse.json({ message: 'Enter a valid email address' }, { status: 400 });
  }

  try {
    const rendered = await renderEmailTemplate(key as EmailTemplateKey, { first_name: 'Jane' }, { slug: 'sample' });

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO,
      to: to.trim(),
      subject: `[TEST] ${rendered.subject}`,
      html: rendered.html,
    });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: data?.id });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Failed to send test email' },
      { status: 500 }
    );
  }
}
