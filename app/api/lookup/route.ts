import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { sendGuestEmail } from '@/lib/email/sendEmail';

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
      return NextResponse.json({ success: true });
    }

    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();

    const { data: guests } = await supabaseServer
      .from('guests')
      .select('id, first_name, email, household_id')
      .ilike('last_name', trimmedLastName)
      .ilike('email', trimmedEmail);

    if (guests && guests.length === 1) {
      const guest = guests[0];
      const { household_id, first_name, email: guestEmail } = guest;

      if (household_id && first_name && guestEmail) {
        const { data: household } = await supabaseServer
          .from('households')
          .select('id, name, slug')
          .eq('id', household_id)
          .single();

        if (household) {
          // Send regardless of comms_email — the guest is actively requesting their link
          try {
            const result = await sendGuestEmail(
              { id: guest.id, first_name, email: guestEmail },
              household,
              'link_recovery',
              'save_the_date'
            );
            if (!result.success) {
              console.error('[Lookup API] sendGuestEmail failed:', result.error);
            }
          } catch (err) {
            console.error('[Lookup API] sendGuestEmail threw:', err);
          }
        }
      }
    }

    // Always return the same response — never reveal whether a match was found
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Lookup API] Unexpected error:', error);
    return NextResponse.json({ success: true });
  }
}
