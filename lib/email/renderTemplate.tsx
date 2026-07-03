import React from 'react';
import { render } from 'react-email';
import { supabaseServer, getSettings, type PhaseName } from '@/lib/supabase';
import { resolveMergeTags } from './mergeTags';
import { getWrapperForTemplate } from './wrapperRegistry';
import type { BodyBlock } from '@/emails/EmailWrapper';

// Duplicated from sendEmail.tsx rather than imported, to avoid a circular import
// (sendEmail.tsx imports renderEmailTemplate from this file).
const EMAIL_LINK_BASE = process.env.EMAIL_LINK_BASE ?? 'https://www.mattandraff.com';

export type EmailTemplateKey =
  | 'save_the_date'
  | 'invitation'
  | 'rsvp_reminder'
  | 'rsvp_confirmation'
  | 'rsvp_updated'
  | 'pre_wedding'
  | 'thank_you'
  | 'link_recovery';

const EYEBROW_LABELS: Record<EmailTemplateKey, string> = {
  save_the_date: 'Save the Date',
  invitation: "You're Invited",
  rsvp_reminder: 'RSVP Reminder',
  rsvp_confirmation: "You're Confirmed",
  rsvp_updated: 'RSVP Updated',
  pre_wedding: 'Almost Time',
  thank_you: 'Thank You',
  link_recovery: 'Your Invitation Link',
};

export type EmailTemplateRow = {
  key: string;
  phase: PhaseName | null;
  subject: string;
  body: string;
  trigger_type: 'phase' | 'manual' | 'event';
  is_active: boolean;
};

type GuestForRender = { first_name: string };
type HouseholdForRender = { slug: string };

export type RenderedEmail = { subject: string; html: string };

export async function loadEmailTemplate(key: string): Promise<EmailTemplateRow | null> {
  const { data, error } = await supabaseServer
    .from('email_templates')
    .select('key, phase, subject, body, trigger_type, is_active')
    .eq('key', key)
    .eq('channel', 'email')
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data as EmailTemplateRow;
}

// A paragraph consisting of exactly this literal (once trimmed) becomes a Button
// instead of text. Checked BEFORE resolveMergeTags() so the generic {{word}} pass
// (which blanks out any key not in mergeValues) never gets a chance to consume it.
// If the token is embedded inside a paragraph with other content, it does NOT match
// here — but "cta_button" is passed to resolveMergeTags() as a preserved key, so it
// falls through as literal visible text ("{{cta_button}}") rather than being blanked
// out like a genuinely unknown tag would be.
const CTA_BUTTON_TOKEN = '{{cta_button}}';

// Splits on blank-line boundaries (matching the literal-<br/> rendering the body
// relies on), pulls out cta_button paragraphs as their own block, and re-joins
// consecutive text paragraphs with '\n\n' so unrelated body copy still renders as
// one merged block exactly as it did before this existed.
function buildBodyBlocks(rawBody: string, mergeValues: Record<string, string>): BodyBlock[] {
  const paragraphs = rawBody.split(/\n\s*\n/);
  const blocks: BodyBlock[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === CTA_BUTTON_TOKEN) {
      blocks.push({ type: 'cta' });
      continue;
    }

    const resolved = resolveMergeTags(paragraph, mergeValues, ['cta_button']);
    const previous = blocks[blocks.length - 1];
    if (previous?.type === 'text') {
      previous.content = `${previous.content}\n\n${resolved}`;
    } else {
      blocks.push({ type: 'text', content: resolved });
    }
  }

  return blocks;
}

function formatWeddingDate(isoDate: string): string {
  try {
    return new Date(isoDate + 'T00:00:00Z').toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

async function renderWithWrapper(
  templateKey: EmailTemplateKey,
  subject: string,
  body: string,
  firstName: string,
  householdSlug: string
): Promise<RenderedEmail> {
  const settings = await getSettings();
  const weddingDate = formatWeddingDate(settings.wedding_date);
  const mergeValues: Record<string, string> = {
    first_name: firstName,
    wedding_date: weddingDate,
    venue: settings.venue_name,
  };

  const resolvedSubject = resolveMergeTags(subject, mergeValues);
  const bodyBlocks = buildBodyBlocks(body, mergeValues);
  const inviteLink = `${EMAIL_LINK_BASE}/invite/${householdSlug}`;

  const Wrapper = getWrapperForTemplate(templateKey);
  const html = await render(
    React.createElement(Wrapper, {
      previewText: resolvedSubject,
      eyebrow: EYEBROW_LABELS[templateKey] ?? 'Matt & Raff',
      weddingDate,
      venue: settings.venue_name,
      bodyBlocks,
      inviteLink,
    })
  );

  return { subject: resolvedSubject, html };
}

export async function renderEmailTemplate(
  templateKey: EmailTemplateKey,
  guest: GuestForRender,
  household: HouseholdForRender
): Promise<RenderedEmail> {
  const template = await loadEmailTemplate(templateKey);
  if (!template) {
    throw new Error(`No active template found for key: ${templateKey}`);
  }

  return renderWithWrapper(templateKey, template.subject, template.body, guest.first_name, household.slug);
}

// Admin-only preview: renders unsaved subject/body edits through the same wrapper
// pipeline as a real send, against sample guest data instead of a loaded template row.
export async function renderEmailPreview(
  templateKey: EmailTemplateKey,
  subject: string,
  body: string
): Promise<RenderedEmail> {
  return renderWithWrapper(templateKey, subject, body, 'Jane', 'sample');
}
