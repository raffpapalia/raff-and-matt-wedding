import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';

export async function GET(request: Request) {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (authCookie !== 'true') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  const { data, error } = await supabaseServer
    .from('communications')
    .select('id, household_id, type, message, sent_at, status, households(name)')
    .order('sent_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const headers = ['ID', 'Household', 'Channel', 'Status', 'Message Preview', 'Sent At'];
  const csvRows = rows.map((row: any) => {
    const householdName = (row.households?.name ?? '').replace(/"/g, '""');
    const messagePreview = (row.message ?? '').substring(0, 80).replace(/"/g, '""');
    return [row.id, `"${householdName}"`, row.type, row.status, `"${messagePreview}"`, row.sent_at].join(',');
  });

  const csv = [headers.join(','), ...csvRows].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="comms-log.csv"',
    },
  });
}
