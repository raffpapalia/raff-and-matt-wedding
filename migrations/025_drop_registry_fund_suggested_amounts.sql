-- 025: Drop registry_funds.suggested_amounts.
--
-- Funds no longer offer preset amount chips — guests type whatever amount
-- they want. Safe to drop outright: the registry hasn't gone live yet, so no
-- order has ever depended on this column's value.

ALTER TABLE public.registry_funds DROP COLUMN IF EXISTS suggested_amounts;
