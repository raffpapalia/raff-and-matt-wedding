-- 013: Budget tracking — suppliers, payment schedules, and a single-row settings table.
--
-- The budget target deliberately lives in its own table rather than public.settings:
-- getSettings() merges every settings row into the object passed (and RSC-serialized)
-- to guest-facing pages, so a settings row would leak the budget into guest page
-- payloads. These tables have RLS enabled with NO anon policies — service-role only.

-- ── budget_settings: single row (id = 1) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.budget_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_budget NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.budget_settings (id, total_budget)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- ── budget_items: one row per supplier / line item ───────────────────────────
CREATE TABLE IF NOT EXISTS public.budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  -- 'fixed': planned cost is agreed_cost (falling back to estimated_cost).
  -- 'per_head': planned = per_head_price * expected_heads;
  --             actual  = per_head_price * live count of attending guests.
  pricing_mode TEXT NOT NULL DEFAULT 'fixed' CHECK (pricing_mode IN ('fixed', 'per_head')),
  estimated_cost NUMERIC(12,2),
  agreed_cost NUMERIC(12,2),
  per_head_price NUMERIC(12,2),
  expected_heads INT,
  is_booked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_budget_items_updated_at BEFORE UPDATE ON public.budget_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── budget_payments: deposits / instalments per item ─────────────────────────
CREATE TABLE IF NOT EXISTS public.budget_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.budget_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE,
  paid_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS budget_payments_item_id_idx ON public.budget_payments(item_id);

-- ── RLS: enabled, no policies — anon/authenticated get nothing; service role bypasses ──
ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_payments ENABLE ROW LEVEL SECURITY;
