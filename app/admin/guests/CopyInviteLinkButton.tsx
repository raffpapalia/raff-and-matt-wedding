'use client';

import { useState } from 'react';

export default function CopyInviteLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_SITE_URL || 'https://mattandraff.com').replace(/\/$/, '');
  const url = `${origin}/invite/${slug}`;

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="text-admin-green transition hover:text-admin-green/80"
    >
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  );
}
