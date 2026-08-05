import webpush, { WebPushError } from 'web-push';
import { supabaseServer } from '@/lib/supabase';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const NOTIFY_EMAIL = process.env.UNSUBSCRIBE_NOTIFY_EMAIL ?? 'raffpapalia@gmail.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(`mailto:${NOTIFY_EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export type PushPayload = { title: string; body: string; url?: string };

// Fans a notification out to every subscribed device. Best-effort by design —
// callers already send an admin notification email as the durable channel, so
// a push failure here should never surface as an error to the caller.
export async function sendPushToAdmins(payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const { data: subs } = await supabaseServer.from('push_subscriptions').select('id, endpoint, p256dh, auth');
  if (!subs || subs.length === 0) return;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        // 404/410 means the subscription was revoked or expired — stop trying it.
        if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
          await supabaseServer.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error('[sendPush] Failed to deliver to a subscription:', err);
        }
      }
    })
  );
}
