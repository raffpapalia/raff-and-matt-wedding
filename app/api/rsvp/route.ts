import { supabase, supabaseServer, getCurrentPhase, type PhaseName } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { sendHouseholdEmail, type EmailTemplate } from '@/lib/email/sendEmail';
import { sendHouseholdSms, type SmsTemplate } from '@/lib/sms/sendSms';

// Reuses the exact per-guest preference logic the "Both" send button uses
// (sendHouseholdEmail / sendHouseholdSms, mode 'all') — each engine independently
// sends to guests where (contact value exists AND that channel's toggle is on).
// Failures here must never surface to the RSVP submitter, so this is always
// called after the save has succeeded and wrapped in try/catch by the caller.
async function sendRsvpConfirmationToHousehold(householdId: string, isFirstSubmission: boolean) {
  const templateKey: EmailTemplate & SmsTemplate = isFirstSubmission ? 'rsvp_confirmation' : 'rsvp_updated';
  const { data: phaseRow } = await getCurrentPhase();
  const phase = (phaseRow?.current_phase as PhaseName | undefined) ?? 'invitation';

  await Promise.all([
    sendHouseholdEmail(householdId, templateKey, phase, 'all'),
    sendHouseholdSms(householdId, templateKey, phase, 'all'),
  ]);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { household_id, responses, plus_ones, custom_answers } = body;

    if (!household_id || !responses || !Array.isArray(responses)) {
      console.error('[RSVP API] Validation failed - missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Snapshot household RSVP state BEFORE this submission's updates land, so we can
    // tell a first-ever RSVP (every guest still 'pending') from a re-submission (at
    // least one guest already attending/declined). This is household-level, not
    // per-submitting-guest, since the RSVP form is a household flow and we can't know
    // which individual actually submitted it.
    const { data: priorGuests } = await supabaseServer
      .from('guests')
      .select('rsvp_status')
      .eq('household_id', household_id);

    const isFirstSubmission = !(priorGuests ?? []).some(
      (g) => g.rsvp_status === 'attending' || g.rsvp_status === 'declined'
    );

    // Update each guest's RSVP status and dietary requirements
    const updates = responses.map((response: any) => {
      return supabase
        .from('guests')
        .update({
          rsvp_status: response.rsvp_status,
          dietary_requirement: response.dietary_requirement,
          dietary_other: response.dietary_other,
        })
        .eq('id', response.guest_id);
    });

    const results = await Promise.all(updates);

    // Check for errors
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.error) {
        console.error('[RSVP API] Guest update failed:', {
          guestIndex: i,
          guestId: responses[i]?.guest_id,
          error: result.error,
          errorMessage: result.error.message,
          errorCode: result.error.code,
          errorDetails: result.error.details,
        });
        return NextResponse.json(
          {
            error: 'Failed to save RSVP',
            details: result.error.message,
            code: result.error.code,
          },
          { status: 500 }
        );
      }
    }

    // Handle plus ones: delete any previously-created plus-one guests, then re-insert.
    // This makes re-submissions idempotent — clicking "update RSVP" won't duplicate records.
    const originalGuestIds = responses.map((r: any) => r.guest_id);

    if (originalGuestIds.length > 0) {
      const { error: deleteError } = await supabaseServer
        .from('guests')
        .delete()
        .eq('household_id', household_id)
        .not('id', 'in', `(${originalGuestIds.join(',')})`);

      if (deleteError) {
        console.error('[RSVP API] Plus-one delete failed:', deleteError);
        return NextResponse.json(
          { error: 'Failed to update plus-one guests', details: deleteError.message },
          { status: 500 }
        );
      }
    }

    if (Array.isArray(plus_ones) && plus_ones.length > 0) {
      const plusOneRecords = plus_ones
        .filter((p: any) => p.first_name?.trim())
        .map((p: any) => ({
          household_id,
          first_name: p.first_name.trim(),
          last_name: (p.last_name || '').trim(),
          rsvp_status: p.rsvp_status,
          dietary_requirement: p.dietary_requirement || 'none',
          dietary_other: p.dietary_other || null,
          is_child: false,
        }));

      if (plusOneRecords.length > 0) {
        const { error: insertError } = await supabaseServer
          .from('guests')
          .insert(plusOneRecords);

        if (insertError) {
          console.error('[RSVP API] Plus-one insert failed:', insertError);
          return NextResponse.json(
            { error: 'Failed to save plus-one guests', details: insertError.message },
            { status: 500 }
          );
        }
      }
    }

    // Handle custom answers — attribute to first attending guest, or first guest overall
    if (Array.isArray(custom_answers) && custom_answers.length > 0 && originalGuestIds.length > 0) {
      const attributionGuestId =
        responses.find((r: any) => r.rsvp_status === 'attending')?.guest_id ??
        responses[0]?.guest_id;

      if (attributionGuestId) {
        // Delete all existing answers for any original guest (idempotent re-submissions)
        const { error: answerDeleteError } = await supabaseServer
          .from('custom_answers')
          .delete()
          .in('guest_id', originalGuestIds);

        if (answerDeleteError) {
          console.error('[RSVP API] Custom answer delete failed:', answerDeleteError);
          return NextResponse.json(
            { error: 'Failed to update custom answers', details: answerDeleteError.message },
            { status: 500 }
          );
        }

        const answersToInsert = custom_answers
          .filter((a: any) => a.question_id && a.answer_text?.trim())
          .map((a: any) => ({
            guest_id: attributionGuestId,
            question_id: a.question_id,
            answer_text: a.answer_text.trim(),
          }));

        if (answersToInsert.length > 0) {
          const { error: answerInsertError } = await supabaseServer
            .from('custom_answers')
            .insert(answersToInsert);

          if (answerInsertError) {
            console.error('[RSVP API] Custom answer insert failed:', answerInsertError);
            return NextResponse.json(
              { error: 'Failed to save custom answers', details: answerInsertError.message },
              { status: 500 }
            );
          }
        }
      }
    }

    // Confirmation send happens after the save has fully succeeded, and must never
    // fail or block the RSVP response — errors are logged, never surfaced.
    try {
      await sendRsvpConfirmationToHousehold(household_id, isFirstSubmission);
    } catch (err) {
      console.error('[RSVP API] Confirmation send failed:', err);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[RSVP API] Unexpected error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
