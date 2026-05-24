import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/supabase';
import { buildIcsContent } from '@/lib/ics';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');

  if (mode !== 'save_the_date' && mode !== 'invitation') {
    return new NextResponse('Invalid mode', { status: 400 });
  }

  const settings = await getSettings();
  const content = buildIcsContent(mode, settings);

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="matt-raff-wedding.ics"',
    },
  });
}
