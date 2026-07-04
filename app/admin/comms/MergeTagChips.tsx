'use client';

import { useState } from 'react';

export default function MergeTagChips({ tags }: { tags: Array<{ tag: string; hint: string }> }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(tag: string) {
    try {
      await navigator.clipboard.writeText(tag);
      setCopied(tag);
      setTimeout(() => setCopied((prev) => (prev === tag ? null : prev)), 1500);
    } catch {
      // Clipboard API unavailable — silently ignore, the tag is still visible to copy by hand.
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(({ tag, hint }) => (
        <button
          key={tag}
          type="button"
          onClick={() => copy(tag)}
          title={hint}
          className="rounded-full border border-admin-green/30 bg-admin-green/5 px-3 py-1 font-mono text-xs text-admin-green outline-none transition hover:border-admin-green hover:bg-admin-green/15 focus-visible:ring-2 focus-visible:ring-admin-green/60"
        >
          {copied === tag ? 'Copied!' : tag}
        </button>
      ))}
    </div>
  );
}
