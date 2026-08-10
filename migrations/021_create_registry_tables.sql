-- 021: Stripe-backed gift registry.
--
-- Two kinds of gift:
--   registry_funds — named funds guests contribute a flexible amount toward
--                    ("A Night at the Villa"). No cap, no running total shown.
--   registry_items — fixed-price gifts claimed outright ("Sunset Dinner for Two").
--                    quantity_available NULL means unlimited (no cap enforced).
--
-- An order is one guest checkout: several funds/items in a single payment, plus
-- one or more beneficiaries (who the gift is *from*, which may be households
-- other than the one submitting, or people not on the guest list at all).
--
-- Like the budget and runsheet tables: RLS enabled with NO policies, so only the
-- service-role client (supabaseServer) can touch these. The guest-facing registry
-- page and its API routes all read/write through supabaseServer.

-- ── registry_funds ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.registry_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  suggested_amounts INT[] NOT NULL DEFAULT '{50,100,250}',
  category TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── registry_items ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.registry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  quantity_available INT, -- NULL = unlimited, no cap enforced
  quantity_claimed INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── registry_orders ───────────────────────────────────────────────────────────
-- submitting_household_id is ON DELETE SET NULL rather than CASCADE: deleting a
-- household from the guest list must never destroy the record of a real payment.
CREATE TABLE IF NOT EXISTS public.registry_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitting_household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL, -- 'stripe' | 'payid_manual'
  stripe_checkout_session_id TEXT,
  reference_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending | confirmed | manual_pending | manual_received | expired
  total_amount NUMERIC(10,2) NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

-- ── registry_order_items ──────────────────────────────────────────────────────
-- One row per selection in the order. fund_id XOR item_id is set; both are
-- ON DELETE SET NULL so removing a fund/item from the catalogue later doesn't
-- erase the line from a historical order (amount is still recorded).
CREATE TABLE IF NOT EXISTS public.registry_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.registry_orders(id) ON DELETE CASCADE,
  fund_id UUID REFERENCES public.registry_funds(id) ON DELETE SET NULL,
  item_id UUID REFERENCES public.registry_items(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL
);

-- ── registry_order_beneficiaries ──────────────────────────────────────────────
-- Who the gift is from. Exactly one of household_id / guest_name_freetext is set:
-- household_id for people on the guest list (so thank-yous can be addressed from
-- the household record), guest_name_freetext for everyone else.
CREATE TABLE IF NOT EXISTS public.registry_order_beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.registry_orders(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  guest_name_freetext TEXT
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
-- Partial unique index on the session id: the webhook looks orders up by it, and
-- uniqueness is what makes duplicate webhook deliveries safe to no-op on. Partial
-- so the many manual-PayID orders (session id NULL) don't collide with each other.
CREATE UNIQUE INDEX IF NOT EXISTS idx_registry_orders_session
  ON public.registry_orders(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_registry_order_items_order ON public.registry_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_registry_order_items_item ON public.registry_order_items(item_id);
CREATE INDEX IF NOT EXISTS idx_registry_beneficiaries_order ON public.registry_order_beneficiaries(order_id);
CREATE INDEX IF NOT EXISTS idx_registry_beneficiaries_household ON public.registry_order_beneficiaries(household_id);

-- ── updated_at triggers (public.update_updated_at_column from migration 001) ──
-- Only the two catalogue tables have updated_at; orders are append-then-confirm
-- and carry confirmed_at instead.
DROP TRIGGER IF EXISTS update_registry_funds_updated_at ON public.registry_funds;
CREATE TRIGGER update_registry_funds_updated_at BEFORE UPDATE ON public.registry_funds
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_registry_items_updated_at ON public.registry_items;
CREATE TRIGGER update_registry_items_updated_at BEFORE UPDATE ON public.registry_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.registry_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registry_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registry_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registry_order_beneficiaries ENABLE ROW LEVEL SECURITY;

-- ── Settings seed (settings.value is jsonb — strings must be JSON-quoted) ─────
-- ON CONFLICT DO NOTHING so re-running this file never clobbers copy you've
-- since edited in the admin, matching migration 010's pattern.
INSERT INTO public.settings (key, value, updated_at) VALUES
  ('registry_enabled', 'false', now()),
  ('registry_hero_eyebrow', '"Our registry"', now()),
  ('registry_hero_heading', '"Give the gift of unforgettable memories"', now()),
  ('registry_hero_body', '"Your presence is the gift — truly. But if you''d like to give something more, we''ve put together a few things that would mean a lot to us."', now()),
  ('registry_closing_message', '"Thank you. Your love and support mean the world to us, and we can''t wait to celebrate with you."', now()),
  ('registry_payid', '""', now()),
  ('registry_payid_name', '""', now()),
  ('registry_payid_instructions', '"Please include the reference code above so we can match your gift to you."', now())
ON CONFLICT (key) DO NOTHING;
