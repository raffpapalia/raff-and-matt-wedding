import type { ComponentType } from 'react';
import EmailWrapper, { type EmailWrapperProps } from '@/emails/EmailWrapper';

export type TemplateWrapperProps = EmailWrapperProps;

// Every key maps to EmailWrapper today. A future template key can be pointed at a
// different wrapper component here without touching the render path in renderTemplate.tsx.
const TEMPLATE_WRAPPERS: Record<string, ComponentType<TemplateWrapperProps>> = {
  save_the_date: EmailWrapper,
  invitation: EmailWrapper,
  rsvp_reminder: EmailWrapper,
  rsvp_confirmation: EmailWrapper,
  pre_wedding: EmailWrapper,
  thank_you: EmailWrapper,
  link_recovery: EmailWrapper,
};

export function getWrapperForTemplate(key: string): ComponentType<TemplateWrapperProps> {
  return TEMPLATE_WRAPPERS[key] ?? EmailWrapper;
}
