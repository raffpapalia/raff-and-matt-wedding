-- 014: Line items within a budget quote.
--
-- A single supplier quote (e.g. a venue package) can bundle many priced lines
-- that mix pricing: some are fixed quantities (1 room hire, 17 bottles, 7 kids
-- meals) and some are per-head (arrival cocktail x100, food station x100).
-- budget_items already models "one supplier, one payment schedule", so lines
-- hang off an item rather than fragmenting the quote into separate items.
--
-- An item with zero lines keeps its original behaviour (item-level pricing_mode
-- + agreed/estimated/per_head_price). Once it has ANY line, its planned/actual
-- totals are the sum of its lines and the item-level cost fields are ignored.

-- ── budget_line_items: priced components of a quote ──────────────────────────
CREATE TABLE IF NOT EXISTS public.budget_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.budget_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  -- 'fixed'   : quantity is a literal count; planned = actual = unit_price * quantity.
  -- 'per_head': quantity is the expected head count (planned); the live actual
  --             recalculates as unit_price * confirmed-attending count.
  quantity_mode TEXT NOT NULL DEFAULT 'fixed' CHECK (quantity_mode IN ('fixed', 'per_head')),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity NUMERIC(12,2),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS budget_line_items_item_id_idx ON public.budget_line_items(item_id);

-- ── minimum spend: venue packages often carry a contractual floor ────────────
ALTER TABLE public.budget_items
  ADD COLUMN IF NOT EXISTS minimum_spend NUMERIC(12,2);

-- ── RLS: enabled, no policies — service role only, matching the sibling tables ──
ALTER TABLE public.budget_line_items ENABLE ROW LEVEL SECURITY;
