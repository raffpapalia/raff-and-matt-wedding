import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';

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

function formatDietaryRequirement(req: string): string {
  if (!req || req === 'none') return '';
  return req.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const [guestsRes, householdsRes] = await Promise.all([
    supabaseServer
      .from('guests')
      .select('first_name,last_name,household_id,rsvp_status,dietary_requirement,dietary_other')
      .order('household_id', { ascending: true })
      .order('first_name', { ascending: true }),
    supabaseServer.from('households').select('id,name'),
  ]);

  const guests = guestsRes.data ?? [];
  const householdMap = new Map((householdsRes.data ?? []).map(h => [h.id, h.name]));

  const lines: string[] = [
    row('Household', 'First Name', 'Last Name', 'Attending', 'Dietary Requirement', 'Dietary Notes'),
  ];

  for (const guest of guests) {
    const householdName = householdMap.get(guest.household_id) ?? '';
    const attending = guest.rsvp_status === 'attending' ? 'Yes' : guest.rsvp_status === 'declined' ? 'No' : 'Pending';
    const dietary = formatDietaryRequirement(guest.dietary_requirement ?? '');
    const notes = guest.dietary_other ?? '';
    lines.push(row(householdName, guest.first_name, guest.last_name, attending, dietary, notes));
  }

  const csv = '﻿' + lines.join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="guests.csv"',
    },
  });
}
