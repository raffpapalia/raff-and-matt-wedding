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

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const [answersRes, questionsRes, guestsRes, householdsRes] = await Promise.all([
    supabaseServer.from('custom_answers').select('*').order('created_at', { ascending: true }),
    supabaseServer.from('custom_questions').select('id,question_text,question_type').order('display_order', { ascending: true }),
    supabaseServer.from('guests').select('id,first_name,last_name,household_id'),
    supabaseServer.from('households').select('id,name'),
  ]);

  const answers = answersRes.data ?? [];
  const questions = questionsRes.data ?? [];
  const guests = guestsRes.data ?? [];
  const households = householdsRes.data ?? [];

  const questionMap = new Map(questions.map(q => [q.id, q]));
  const guestMap = new Map(guests.map(g => [g.id, g]));
  const householdMap = new Map(households.map(h => [h.id, h]));

  const lines: string[] = [
    row('Household', 'Guest', 'Question', 'Answer', 'Artist', 'Song Title'),
  ];

  for (const answer of answers) {
    const guest = guestMap.get(answer.guest_id);
    const household = guest ? householdMap.get(guest.household_id) : undefined;
    const question = questionMap.get(answer.question_id);

    const householdName = household?.name ?? '';
    const guestName = guest ? `${guest.first_name} ${guest.last_name}` : '';
    const questionText = question?.question_text ?? '';

    if (question?.question_type === 'song') {
      let artist = '';
      let song = '';
      try {
        const parsed = JSON.parse(answer.answer_text);
        artist = parsed.artist?.trim() ?? '';
        song = parsed.song?.trim() ?? '';
      } catch {
        artist = answer.answer_text;
      }
      lines.push(row(householdName, guestName, questionText, '', artist, song));
    } else {
      lines.push(row(householdName, guestName, questionText, answer.answer_text, '', ''));
    }
  }

  const csv = '﻿' + lines.join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="responses.csv"',
    },
  });
}
