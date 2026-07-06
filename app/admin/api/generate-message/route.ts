import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseServer, getSettings } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (authCookie !== 'true') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ message: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { householdId?: string; field?: string; currentText?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const { householdId, field, currentText } = body;

  if (!householdId || !field || !['personal_message', 'thank_you_message'].includes(field)) {
    return NextResponse.json({ message: 'Invalid request: householdId and field required' }, { status: 400 });
  }

  const [{ data: guests }, settings] = await Promise.all([
    supabaseServer
      .from('guests')
      .select('first_name, rsvp_status')
      .eq('household_id', householdId),
    getSettings(),
  ]);

  const guestList = guests ?? [];
  const guestNames = guestList.map(g => g.first_name).join(', ') || 'unknown';
  const isThankYou = field === 'thank_you_message';

  const styleGuide =
    settings.ai_message_style_prompt.trim() ||
    "Warm, a little playful, not overly formal — high-end bar/restaurant vibe, not traditional wedding. Keep suggestions under 3 sentences. Always 'Matt & Raff', never reversed.";

  const promptParts: string[] = [
    `Current draft: ${currentText?.trim() ? currentText.trim() : 'none — write fresh'}`,
    `Guests: ${guestNames}`,
  ];

  if (isThankYou) {
    const rsvpSummary = guestList.map(g => `${g.first_name}: ${g.rsvp_status}`).join(', ');
    promptParts.push(`RSVP status: ${rsvpSummary || 'unknown'}`);
  }

  promptParts.push(
    `Couple names: ${settings.couple_names || 'Matt & Raff'}`,
    `Style guide: ${styleGuide}`,
    `Task: ${currentText?.trim() ? 'Rewrite or improve' : 'Write a new'} short ${isThankYou ? 'thank you' : 'personal'} message from the couple to this household. Don't invent specific facts about the guests beyond what's given. Return ONLY the message text, no preamble or explanation.`,
  );

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: promptParts.join('\n') }],
    });

    const suggestion =
      response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';

    return NextResponse.json({ suggestion });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate suggestion';
    return NextResponse.json({ message }, { status: 500 });
  }
}
