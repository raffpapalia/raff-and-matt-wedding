-- 030: Remove the QT room block expression of interest (migrations 027-029).
--
-- The couple dropped the group-rate headcount: guests will book their own rooms
-- with a discount code shown on the invitation instead, and nothing about rooms
-- is collected at RSVP. At removal stay_interest had no rows and the only sends
-- of the request template were tests to the couple's test household.
DROP TABLE IF EXISTS public.stay_interest;

ALTER TABLE public.households
  DROP COLUMN IF EXISTS stay_link_open_count,
  DROP COLUMN IF EXISTS stay_link_first_opened_at,
  DROP COLUMN IF EXISTS stay_link_last_opened_at;

DELETE FROM public.email_templates WHERE key = 'stay_interest_request';

DELETE FROM public.settings WHERE key = 'stay_eoi_open';
