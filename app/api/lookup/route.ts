import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const { lastName, email } = await request.json();

    if (
      typeof lastName !== 'string' ||
      typeof email !== 'string' ||
      !lastName.trim() ||
      !EMAIL_REGEX.test(email.trim())
    ) {
      // Never reveal validation details — same response either way
      return NextResponse.json({ success: true });
    }

    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();

    // Find households where either email matches (case-insensitive)
    const [byPrimary, bySecondary] = await Promise.all([
      supabaseServer.from('households').select('id').ilike('primary_email', trimmedEmail),
      supabaseServer.from('households').select('id').ilike('secondary_email', trimmedEmail),
    ]);

    const householdIds = [...(byPrimary.data ?? []), ...(bySecondary.data ?? [])].map((h) => h.id);

    if (householdIds.length > 0) {
      const { data: guests } = await supabaseServer
        .from('guests')
        .select('id')
        .in('household_id', householdIds)
        .ilike('last_name', trimmedLastName);

      if (guests && guests.length > 0) {
        // TODO Stage 5: trigger Resend email with invite link to matched household
      }
    }

    // Always return the same response — never reveal whether a match was found
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Lookup API] Unexpected error:', error);
    return NextResponse.json({ success: true });
  }
}
