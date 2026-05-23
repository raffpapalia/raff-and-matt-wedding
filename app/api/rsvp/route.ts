import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { household_id, responses } = body;

    console.log('[RSVP API] Received request:', {
      household_id,
      responseCount: responses?.length,
      timestamp: new Date().toISOString(),
    });

    if (!household_id || !responses || !Array.isArray(responses)) {
      console.error('[RSVP API] Validation failed - missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update each guest's RSVP status and dietary requirements
    const updates = responses.map((response: any) => {
      console.log('[RSVP API] Updating guest:', {
        guest_id: response.guest_id,
        rsvp_status: response.rsvp_status,
        dietary_requirement: response.dietary_requirement,
      });

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

    console.log('[RSVP API] All guests updated successfully');
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
