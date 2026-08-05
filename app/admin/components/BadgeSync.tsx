'use client';

import { useEffect } from 'react';

// Same badge-refresh logic the service worker runs on push (public/sw.js) —
// duplicated rather than shared, since a client component and a service
// worker can't import the same module. Kept in sync deliberately: both read
// /admin/api/push/unread-count and call navigator.setAppBadge/clearAppBadge.
export async function syncAppBadge(): Promise<void> {
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  if (!nav.setAppBadge || !nav.clearAppBadge) return;
  if (Notification.permission !== 'granted') return;

  try {
    const res = await fetch('/admin/api/push/unread-count');
    if (!res.ok) return;
    const { count } = await res.json();
    if (count > 0) await nav.setAppBadge(count);
    else await nav.clearAppBadge();
  } catch {
    // best-effort
  }
}

// Mounted once in AdminSidebarShell so the badge reflects reality on every
// admin page load, not just right after a push arrives.
export default function BadgeSync() {
  useEffect(() => {
    syncAppBadge();
  }, []);
  return null;
}
