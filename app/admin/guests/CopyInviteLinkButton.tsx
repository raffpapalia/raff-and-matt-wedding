'use client';

import { useState } from 'react';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'your-domain.com';

export default function CopyInviteLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = `https://${baseUrl}/invite/${slug}`;

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="text-emerald-200 transition hover:text-emerald-100"
    >
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  );
}
