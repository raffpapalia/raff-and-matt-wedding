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

// One line per household that has answered the room interest form, newest first.
// The three night columns are Y/blank so the file can be pivoted in a spreadsheet.
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const [interestRes, householdsRes] = await Promise.all([
    supabaseServer.from('stay_interest').select('*').order('updated_at', { ascending: false }),
    supabaseServer.from('households').select('id, name'),
  ]);

  const householdMap = new Map((householdsRes.data ?? []).map(h => [h.id, h.name]));

  const lines: string[] = [
    row('Household', 'Status', 'Nights', 'Night before', 'Wedding night', 'Staying longer', 'Rooms', 'Last updated'),
  ];

  for (const r of (interestRes.data ?? []) as StayInterestRow[]) {
    lines.push(
      row(
        householdMap.get(r.household_id) ?? 'Deleted household',
        r.status,
        describeNights(r),
        r.night_before ? 'Y' : '',
        r.wedding_night ? 'Y' : '',
        r.staying_longer ? 'Y' : '',
        r.rooms != null ? String(r.rooms) : '',
        new Date(r.updated_at).toLocaleString('en-AU')
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
