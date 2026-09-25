import { resolveMergeTags } from '@/lib/email/mergeTags';

// Final SMS text: merge tags resolved, then the invite short link appended. When
// the body uses {{stay_link}}, that link is the message's call to action, so the
// invite link is left off rather than giving the guest two links to choose from.
// Pure (no server imports) so the admin previews can share it with the send path.
export function buildSmsBody(
  template: string,
  values: { first_name: string; inviteLink: string; stayLink: string }
): string {
  const resolved = resolveMergeTags(template, { first_name: values.first_name, stay_link: values.stayLink });
  return template.includes('{{stay_link}}') ? resolved : `${resolved} ${values.inviteLink}`;
}
