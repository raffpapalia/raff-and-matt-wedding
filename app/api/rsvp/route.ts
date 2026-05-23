import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { household_id, responses } = body;

    if (!household_id || !responses || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update each guest's RSVP status and dietary requirements
    const updates = responses.map((response: any) =>
      supabase
        .from('guests')
        .update({
          rsvp_status: response.rsvp_status,
          dietary_requirement: response.dietary_requirement,
          dietary_other: response.dietary_other,
        })
        .eq('id', response.guest_id)
    );

    const results = await Promise.all(updates);

    // Check for errors
    for (const result of results) {
      if (result.error) {
        console.error('Error updating guest:', result.error);
        return NextResponse.json(
          { error: 'Failed to save RSVP' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('RSVP API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
