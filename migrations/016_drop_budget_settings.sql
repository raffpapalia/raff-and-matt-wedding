-- 016: Remove the overall budget target.
--
-- The budget page tracks committed/projected/paid/left-to-pay from suppliers
-- and payments; a separate hand-set total was never used (value stayed 0) and
-- has been removed from the UI, so the single-row table goes too.
DROP TABLE IF EXISTS public.budget_settings;
