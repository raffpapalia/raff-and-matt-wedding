import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import { describeNights, type StayInterestRow } from '@/lib/stay/interest';

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSession(authCookie);
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function row(...cells: string[]): string {
  return cells.map(escapeCSV).join(',');
}

// One line per household, answered or not, with room interest page opens, so the
// file also answers "who opened the link but didn't reply". The three night
// columns are Y/blank so the file can be pivoted in a spreadsheet.
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const [interestRes, householdsRes] = await Promise.all([
    supabaseServer.from('stay_interest').select('*'),
    supabaseServer
      .from('households')
      .select('id, name, stay_link_open_count, stay_link_first_opened_at, stay_link_last_opened_at')
      .order('name', { ascending: true }),
  ]);

  const interestByHousehold = new Map(
    ((interestRes.data ?? []) as StayInterestRow[]).map(r => [r.household_id, r])
  );
  const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('en-AU') : '');

  const lines: string[] = [
    row(
      'Household',
      'Status',
      'Nights',
      'Night before',
      'Wedding night',
      'Staying longer',
      'Rooms',
      'Answered',
      'Link opens',
      'First opened',
      'Last opened'
    ),
  ];

  for (const h of householdsRes.data ?? []) {
    const r = interestByHousehold.get(h.id);
    lines.push(
      row(
        h.name,
        r?.status ?? 'not answered',
        r ? describeNights(r) : '',
        r?.night_before ? 'Y' : '',
        r?.wedding_night ? 'Y' : '',
        r?.staying_longer ? 'Y' : '',
        r?.rooms != null ? String(r.rooms) : '',
        when(r?.updated_at),
        String(h.stay_link_open_count ?? 0),
        when(h.stay_link_first_opened_at),
        when(h.stay_link_last_opened_at)
      )
    );
  }

  const csv = '﻿' + lines.join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="room-interest.csv"',
    },
  });
}
