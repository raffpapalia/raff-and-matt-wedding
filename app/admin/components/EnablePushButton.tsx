'use client';

import { useEffect, useState } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Web Push subscriptions use a base64url-encoded key; PushManager.subscribe
// needs it as a raw Uint8Array.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64Safe);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes;
}

type State = 'checking' | 'unsupported' | 'not-standalone' | 'ready' | 'subscribing' | 'subscribed' | 'error';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export default function EnablePushButton() {
  const [state, setState] = useState<State>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }
    if (!isStandalone()) {
      setState('not-standalone');
      return;
    }
    navigator.serviceWorker.register('/sw.js').then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setState(existing ? 'subscribed' : 'ready');
    });
  }, []);

  async function enable() {
    if (!VAPID_PUBLIC_KEY) return;
    setState('subscribing');
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Notification permission was not granted.');
        setState('ready');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const json = subscription.toJSON();
      const res = await fetch('/admin/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to save subscription');
        setState('ready');
        return;
      }
      setState('subscribed');
    } catch {
      setError('Could not enable notifications on this device.');
      setState('ready');
    }
  }

  if (state === 'checking' || state === 'unsupported' || state === 'subscribed') return null;

  return (
    <div className="rounded-2xl border border-admin-sand/30 bg-admin-bone/50 px-5 py-4 text-sm text-admin-ink/80">
      {state === 'not-standalone' ? (
        <p>Open this from your home-screen icon (not a Safari tab) to enable push notifications for replies and email bounces.</p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>Get a push notification here for SMS replies and bounced/spam emails.</p>
          <button
            type="button"
            onClick={enable}
            disabled={state === 'subscribing'}
            className="min-h-[40px] rounded-full bg-admin-green px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-admin-bone transition hover:bg-admin-green/90 disabled:opacity-50"
          >
            {state === 'subscribing' ? 'Enabling…' : 'Enable notifications'}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-admin-persimmon">{error}</p>}
    </div>
  );
}
