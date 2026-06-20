import type { PhaseName } from '@/lib/supabase';
import type { EmailTemplateKey } from './renderTemplate';

// Human-language titles for Matt — single source of truth, used by the Templates
// page, the comms-dashboard phase heading, and the manual-send template chooser.
export const EMAIL_TEMPLATE_TITLES: Record<EmailTemplateKey, string> = {
  save_the_date: 'Save the Date',
  invitation: 'Invitation',
  rsvp_reminder: 'RSVP Reminder',
  rsvp_confirmation: 'RSVP Confirmation',
  pre_wedding: 'Final Details',
  thank_you: 'Thank You',
  link_recovery: 'Lost Invitation Link',
};

export const PHASE_LABELS: Record<PhaseName, string> = {
  save_the_date: 'Save the Date',
  invitation: 'Invitation',
  pre_wedding: 'Pre-Wedding',
  thank_you: 'Thank You',
};

// Sub-type templates (rsvp_reminder, rsvp_confirmation, link_recovery) are not
// phase-primary and are only ever sent by explicit key, never via this map.
export const PHASE_TEMPLATE_MAP: Record<PhaseName, EmailTemplateKey> = {
  save_the_date: 'save_the_date',
  invitation: 'invitation',
  pre_wedding: 'pre_wedding',
  thank_you: 'thank_you',
};
