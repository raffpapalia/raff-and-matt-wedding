import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';
import { sendTestSms, type SmsTemplate } from '@/lib/sms/sendSms';

const VALID_KEYS: SmsTemplate[] = [
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
  return authCookie === 'true';
}

// Test sends use the real engine against the currently SAVED template content, but
// never write to `communications` — there's no real guest to attach the row to.
// Same approach as /admin/api/comms/email-templates/test-send.
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { key, to } = body as { key?: string; to?: string };

  if (!key || !VALID_KEYS.includes(key as SmsTemplate)) {
    return NextResponse.json({ message: 'Invalid or missing template key' }, { status: 400 });
  }
  if (typeof to !== 'string' || !to.trim()) {
    return NextResponse.json({ message: 'Enter a mobile number' }, { status: 400 });
  }

  const result = await sendTestSms(key as SmsTemplate, to.trim());

  if (!result.success) {
    return NextResponse.json({ message: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, messageId: result.messageId, to: result.to });
}
