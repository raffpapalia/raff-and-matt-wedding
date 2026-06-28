import { tokens } from './v4/tokens';
import type { PhaseName } from '@/lib/supabase';

const PHASE_LABELS: Record<PhaseName, string> = {
  save_the_date: 'Save the Date',
  invitation: 'Invitation',
  pre_wedding: 'Pre-wedding',
  thank_you: 'Thank You',
};

// Shown only when an admin has forced ?preview=<phase> on an invite URL — see
// the override gate in page.tsx. Never rendered for the real current phase.
export default function PreviewBanner({ phase }: { phase: PhaseName }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        textAlign: 'center',
        padding: '8px 12px',
        background: tokens.persimmon,
        color: tokens.onPersimmon,
        fontFamily: tokens.mono,
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      Preview: {PHASE_LABELS[phase]} — not live (admin only)
    </div>
  );
}
