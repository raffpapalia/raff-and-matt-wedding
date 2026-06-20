import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';
import { renderEmailTemplate, type EmailTemplateKey } from '@/lib/email/renderTemplate';

// Proof-of-concept route for the DB-template -> wrapper -> HTML render path.
// Not wired into live sending. Remove once the real send functions are rewired
// to use renderEmailTemplate directly.
async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return authCookie === 'true';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function GET(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const key = (searchParams.get('key') ?? 'save_the_date') as EmailTemplateKey;
  const firstName = searchParams.get('firstName') ?? 'Jane';
  const slug = searchParams.get('slug') ?? 'sample';

  try {
    const { subject, html } = await renderEmailTemplate(key, { first_name: firstName }, { slug });

    if (searchParams.get('format') === 'json') {
      return NextResponse.json({ subject, html });
    }

    // Subject can contain non-Latin1 characters (em dashes, etc.), which HTTP headers
    // can't hold — render it visibly in the body instead of putting it on a header.
    const subjectBanner = `<div style="background:#0A1F14;color:#D4A83A;font-family:monospace;font-size:13px;padding:12px 20px;border-bottom:2px solid #D4A83A;">Subject: ${escapeHtml(subject)}</div>`;
    const htmlWithBanner = html.replace(/<body([^>]*)>/i, `<body$1>${subjectBanner}`);

    return new NextResponse(htmlWithBanner, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Failed to render template' },
      { status: 500 }
    );
  }
}
