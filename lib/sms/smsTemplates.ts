import { supabaseServer } from '@/lib/supabase';
import type { EmailTemplateKey } from '@/lib/email/renderTemplate';

// SMS now shares the same key-space and table (email_templates) as email — a row's
// `channel` distinguishes the two. The old tmpl_sms_* settings strings are no longer
// read by the engine; they're left parked in settings, unused.
export type SmsTemplateKey = EmailTemplateKey;

export async function loadSmsTemplate(key: SmsTemplateKey): Promise<string> {
  const { data, error } = await supabaseServer
    .from('email_templates')
    .select('body')
    .eq('key', key)
    .eq('channel', 'sms')
    .eq('is_active', true)
    .single();

  if (error || !data || !data.body || !data.body.trim()) {
    throw new Error(`No active SMS template found for key: ${key}`);
  }

  return data.body;
}
