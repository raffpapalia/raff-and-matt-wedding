import type { NearbyHotel } from '@/lib/supabase';
import { clampTier, safeHttpUrl, tierLabel } from './stayData';

function PriceMeter({ tier }: { tier: number }) {
  const t = clampTier(tier);
  const label = tierLabel(t);
  return (
    <span className="stay-price" role="img" aria-label={label} title={label}>
      <span aria-hidden="true">
        {'$'.repeat(t)}
        <span className="stay-price__off">{'$'.repeat(4 - t)}</span>
      </span>
    </span>
  );
}

// One numbered hotel card. The number matches the pin on the map.
export default function HotelCard({ hotel, number }: { hotel: NearbyHotel; number: number }) {
  const url = safeHttpUrl(hotel.website_url);
  return (
    <li className="stay-card">
      <span className="stay-card__num" aria-hidden="true">{number}</span>
      <div className="stay-card__body">
        <div className="stay-card__top">
          <span className="stay-card__name">{hotel.name}</span>
          <PriceMeter tier={hotel.price_tier} />
        </div>
        <span className="stay-meta">{hotel.walk_minutes} min walk · {hotel.street}</span>
        <span className="stay-card__blurb">{hotel.blurb}</span>
        {url && (
          <a className="stay-card__link" href={url} target="_blank" rel="noopener">
            Hotel website
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17L17 7M9 7h8v8" />
            </svg>
            <span className="stay-sr"> for {hotel.name} (opens in a new tab)</span>
          </a>
        )}
      </div>
    </li>
  );
}
