-- 032: replace the placeholder nearby_hotels data from migration 031 with checked
-- details: real street addresses, official websites, walking times and map
-- positions (researched 31 Oct 2026).
--
-- Walk minutes: routed on foot from QT Melbourne (133 Russell St) to each hotel,
-- at 80 m a minute, rounded to the nearest minute.
-- Map positions: OpenStreetMap coordinates (Sofitel's from Accor's own page)
-- rotated into the CBD grid; 1 map unit = 2.5 m, QT at (600, 258). See
-- app/invite/[slug]/stay/stayData.ts.
--
-- Two hotels are switched off rather than deleted, so they can be switched back
-- on from /admin/hotels:
--   Hotel Lindrum: permanently closed, being converted to an office tower.
--   Quincy Hotel: 509 Flinders Lane, 1.5 km (18 min) away, past the edge of the map.
--
-- display_order is nearest first among the hotels that are on.

UPDATE public.nearby_hotels SET
  street = '222 Russell St', walk_minutes = 3, website_url = 'https://www.mantraonrussell.com.au/',
  map_x = 622, map_y = 170, display_order = 1
WHERE name = 'Mantra on Russell';

UPDATE public.nearby_hotels SET
  street = '123 Collins St', walk_minutes = 3, website_url = 'https://www.hyatt.com/en-US/hotel/australia/grand-hyatt-melbourne/melbo',
  map_x = 630, map_y = 354, display_order = 2
WHERE name = 'Grand Hyatt Melbourne';

UPDATE public.nearby_hotels SET
  street = '205 Collins St', walk_minutes = 5, website_url = 'https://www.marriott.com/en-us/hotels/melwi-the-westin-melbourne/overview/',
  map_x = 538, map_y = 353, display_order = 3
WHERE name = 'The Westin Melbourne';

UPDATE public.nearby_hotels SET
  street = '187 Flinders Lane', walk_minutes = 5, website_url = 'https://adelphi.com.au/',
  map_x = 562, map_y = 385, display_order = 4
WHERE name = 'Adelphi Hotel';

UPDATE public.nearby_hotels SET
  street = '186 Exhibition St', walk_minutes = 6, website_url = 'https://www.rydges.com/accommodation/melbourne-vic/melbourne-cbd/',
  map_x = 711, map_y = 206, display_order = 5
WHERE name = 'Rydges Melbourne';

UPDATE public.nearby_hotels SET
  street = '25 Collins St', walk_minutes = 7, website_url = 'https://sofitel.accor.com/en/hotels/1902.html',
  map_x = 769, map_y = 328, display_order = 6
WHERE name = 'Sofitel on Collins';

-- Official name is "Laneways by Ovolo".
UPDATE public.nearby_hotels SET
  name = 'Laneways by Ovolo', street = '19 Little Bourke St', walk_minutes = 7, website_url = 'https://ovolohotels.com/ovolo/laneways/',
  map_x = 767, map_y = 197, display_order = 7
WHERE name = 'Ovolo Laneways';

UPDATE public.nearby_hotels SET
  street = '1 Parliament Sq', walk_minutes = 11, website_url = 'https://www.hyatt.com/en-US/hotel/australia/park-hyatt-melbourne/melph',
  map_x = 905, map_y = 280, display_order = 8
WHERE name = 'Park Hyatt Melbourne';

UPDATE public.nearby_hotels SET
  street = '509 Flinders Lane', walk_minutes = 18, website_url = 'https://www.tfehotels.com/en/hotels/quincy-hotels/melbourne/',
  map_x = 135, map_y = 383, display_order = 9, is_active = false
WHERE name = 'Quincy Hotel';

UPDATE public.nearby_hotels SET
  street = '26 Flinders St', display_order = 10, is_active = false
WHERE name = 'Hotel Lindrum';
