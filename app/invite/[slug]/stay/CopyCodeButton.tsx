'use client';

import { useEffect, useRef, useState } from 'react';

type CopyState = 'idle' | 'copied' | 'selected';

const LABELS: Record<CopyState, string> = {
  idle: 'Copy code',
  copied: 'Copied',
  selected: 'Code selected',
};

interface CopyCodeButtonProps {
  code: string;
  // id of the element showing the code, selected as a fallback when the
  // clipboard can't be written (older browsers, insecure context).
  targetId: string;
}

export default function CopyCodeButton({ code, targetId }: CopyCodeButtonProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function handleCopy() {
    let next: CopyState = 'copied';
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // No clipboard access: select the visible code so a long-press or Ctrl+C
      // finishes the job, and try the legacy copy command on that selection.
      next = 'selected';
      const el = document.getElementById(targetId);
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        try {
          if (document.execCommand('copy')) next = 'copied';
        } catch {
          // keep 'selected'
        }
      }
    }
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 2500);
  }

  return (
    <button type="button" className="stay-btn stay-btn--outline" onClick={handleCopy}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="12" height="12" rx="2" />
        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
      </svg>
      <span aria-live="polite">{LABELS[state]}</span>
    </button>
  );
}
