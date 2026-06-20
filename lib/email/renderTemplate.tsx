import React from 'react';
import { render } from 'react-email';
import { supabaseServer, getSettings, type PhaseName } from '@/lib/supabase';
import { resolveMergeTags } from './mergeTags';
import { getWrapperForTemplate } from './wrapperRegistry';

// Duplicated from sendEmail.tsx rather than imported, to avoid a circular import
// (sendEmail.tsx imports renderEmailTemplate from this file).
const EMAIL_LINK_BASE = process.env.EMAIL_LINK_BASE ?? 'https://www.mattandraff.com';

export type EmailTemplateKey =
  | 'save_the_date'
  | 'invitation'
  | 'rsvp_reminder'
  | 'rsvp_confirmation'
  | 'pre_wedding'
  | 'thank_you'
  | 'link_recovery';

const EYEBROW_LABELS: Record<EmailTemplateKey, string> = {
  save_the_date: 'Save the Date',
  invitation: "You're Invited",
  rsvp_reminder: 'RSVP Reminder',
  rsvp_confirmation: "You're Confirmed",
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
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data as EmailTemplateRow;
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
  const bodyText = resolveMergeTags(body, mergeValues);
  const inviteLink = `${EMAIL_LINK_BASE}/invite/${householdSlug}`;

  const Wrapper = getWrapperForTemplate(templateKey);
  const html = await render(
    React.createElement(Wrapper, {
      previewText: resolvedSubject,
      eyebrow: EYEBROW_LABELS[templateKey] ?? 'Matt & Raff',
      weddingDate,
      venue: settings.venue_name,
      bodyText,
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
