-- Web Push subscriptions for the admin PWA (iOS 16.4+ supports Web Push only
-- inside an installed PWA). Service-role only, same as the other admin-facing
-- tables (RLS enabled, no policies).
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
