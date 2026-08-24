'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Section from '../v4/components/Section';
import Reveal from '../v4/components/Reveal';
import Kicker from '../v4/components/Kicker';
import { tokens } from '../v4/tokens';
import GiftPanel from './GiftPanel';

export type CatalogFund = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  image_url: string | null;
};

export type CatalogItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  quantity_available: number | null;
  quantity_claimed: number;
};

// The in-memory selection tray. Deliberately not persisted — a lost tray on
// refresh is a minor annoyance, whereas a stale persisted tray would keep
// re-proposing gifts that have since been claimed by someone else.
export type Selection = { type: 'fund' | 'item'; id: string; name: string; amount: number };

export type RegistrySettings = {
  coupleNames: string;
  heroEyebrow: string;
  heroHeading: string;
  heroBody: string;
  closingMessage: string;
  heroPhotoUrl: string;
  bankTransferConfigured: boolean;
  storyHeading: string;
  storyBody: string;
  travelPhotos: string[];
};

export function formatAud(amount: number): string {
  return amount.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function selectionKey(type: 'fund' | 'item', id: string): string {
  return `${type}:${id}`;
}

const ALL_CATEGORIES = 'All';

// Horizontal scroll-snap strip with dot indicators showing which photo is in
// view. The active dot is whichever item's snap position (offsetLeft) is
// nearest the strip's current scrollLeft — the same reference point
// scroll-snap-align: start itself uses, so it always agrees with where the
// strip has actually settled, including when the trailing item can't reach
// full width-visibility (an intersection-ratio approach ties in that case).
// Clicking a dot scrolls its photo into view — the dots double as a scrubber.
function PhotoStrip({ photos }: { photos: string[] }) {
  const stripRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;

    function updateActive() {
      // The trailing item's offsetLeft can exceed the strip's actual max
      // scroll position — there's no content after it to scroll further, so
      // the browser clamps there instead of ever reaching that offset. Without
      // clamping the comparison the same way, scrolled-to-the-end never
      // matches the last item and an earlier one wins by default.
      const maxScroll = strip!.scrollWidth - strip!.clientWidth;
      let closest = 0;
      let closestDistance = Infinity;
      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        const target = Math.min(el.offsetLeft, maxScroll);
        const distance = Math.abs(target - strip!.scrollLeft);
        // <=, not <: at max scroll every item past the last one that fits
        // clamps to the same target and ties on distance — the later index
        // is the one actually flush against the strip's trailing edge, so it
        // should win the tie instead of the first item that reached it.
        if (distance <= closestDistance) {
          closestDistance = distance;
          closest = i;
        }
      });
      setActive(closest);
    }

    updateActive();
    strip.addEventListener('scroll', updateActive, { passive: true });
    return () => strip.removeEventListener('scroll', updateActive);
  }, [photos]);

  return (
    <>
      <div className="mr-reg-photo-strip" ref={stripRef}>
        {photos.map((photo, i) => (
          <div
            className="mr-reg-photo-strip-item"
            key={i}
            ref={el => {
              itemRefs.current[i] = el;
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="mr-reg-photo-dots" role="tablist" aria-label="Travel photos">
          {photos.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-label={`Photo ${i + 1} of ${photos.length}`}
              className={`mr-reg-photo-dot${active === i ? ' is-active' : ''}`}
              onClick={() => itemRefs.current[i]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })}
            />
          ))}
        </div>
      )}
    </>
  );
}

function FundCard({
  fund,
  selected,
  onSelect,
  onRemove,
}: {
  fund: CatalogFund;
  selected: Selection | undefined;
  onSelect: (amount: number) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [amountValue, setAmountValue] = useState('');

  function commitAmount() {
    const parsed = Number(amountValue);
    if (!Number.isFinite(parsed) || parsed < 1) return;
    onSelect(Math.round(parsed * 100) / 100);
    setOpen(false);
    setAmountValue('');
  }

  return (
    <article className={`mr-reg-card${selected ? ' is-selected' : ''}${open && !selected ? ' is-open' : ''}`}>
      {fund.image_url && (
        <div className="mr-reg-card-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fund.image_url} alt="" />
          <span className="mr-reg-badge mr-reg-badge--open">Open</span>
        </div>
      )}
      <div className="mr-reg-card-body">
        <h3>{fund.name}</h3>
        {fund.description && <p className="mr-reg-desc">{fund.description}</p>}
        <p className="mr-reg-price">{selected ? `Added — ${formatAud(selected.amount)}` : 'Contribute any amount'}</p>

        {selected ? (
          <div className="mr-reg-card-footer">
            <button type="button" className="mr-reg-card-cta" onClick={onRemove}>
              Remove
            </button>
          </div>
        ) : (
          <>
            <div className="mr-reg-card-footer">
              <button type="button" className="mr-reg-card-cta" onClick={() => setOpen(o => !o)} aria-expanded={open}>
                {open ? 'Close' : 'Contribute →'}
              </button>
            </div>
            <div className="mr-reg-contribute-panel">
              <div className="mr-reg-contribute-panel-inner">
                <div className="mr-reg-custom">
                  <input
                    className="mr-reg-field mr-reg-field-sm"
                    type="number"
                    min={1}
                    step="1"
                    inputMode="decimal"
                    placeholder="Amount in AUD"
                    aria-label={`Amount for ${fund.name}`}
                    value={amountValue}
                    onChange={e => setAmountValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitAmount();
                      }
                    }}
                  />
                  <button type="button" className="mr-reg-btn mr-reg-btn-ghost" onClick={commitAmount}>
                    Add
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function ItemCard({
  item,
  selected,
  onToggle,
}: {
  item: CatalogItem;
  selected: boolean;
  onToggle: () => void;
}) {
  // Unlimited items (quantity_available null) show no scarcity badge at all —
  // only genuinely capped ones get "n of m claimed".
  const isCapped = item.quantity_available !== null;
  const soldOut = isCapped && item.quantity_claimed >= (item.quantity_available as number);
  const availability = soldOut ? 'Claimed' : `${item.quantity_claimed} of ${item.quantity_available} claimed`;

  return (
    <article className={`mr-reg-card${selected ? ' is-selected' : ''}`}>
      {item.image_url && (
        <div className="mr-reg-card-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image_url} alt="" />
          {isCapped && <span className="mr-reg-badge">{availability}</span>}
        </div>
      )}
      <div className="mr-reg-card-body">
        <h3>{item.name}</h3>
        {item.description && <p className="mr-reg-desc">{item.description}</p>}
        <p className="mr-reg-price">
          {formatAud(item.price)}
          {/* Without a photo there's no badge slot, so availability rides along here. */}
          {!item.image_url && isCapped && <> · {availability}</>}
        </p>
        <div className="mr-reg-card-footer">
          <button
            type="button"
            className={`mr-reg-card-cta${soldOut && !selected ? ' is-claimed' : ''}`}
            onClick={onToggle}
            disabled={soldOut && !selected}
          >
            {soldOut && !selected ? 'Already claimed' : selected ? 'Remove' : 'Gift this →'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function RegistryClient({
  slug,
  householdName,
  householdRef,
  settings,
  funds,
  items,
  isPreview,
}: {
  slug: string;
  householdName: string;
  householdRef: string;
  settings: RegistrySettings;
  funds: CatalogFund[];
  items: CatalogItem[];
  isPreview: boolean;
}) {
  const [selections, setSelections] = useState<Selection[]>([]);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [panelOpen, setPanelOpen] = useState(false);

  // Categories are whatever the item catalogue actually uses, in first-seen
  // order — so the admin can add one without touching this file. Funds are
  // expected to stay a small, uncategorised handful (the honeymoon fund and
  // maybe one or two more), so they always render in full, unfiltered.
  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const entry of items) {
      if (entry.category && !seen.includes(entry.category)) seen.push(entry.category);
    }
    return [ALL_CATEGORIES, ...seen];
  }, [items]);

  const visibleItems = category === ALL_CATEGORIES ? items : items.filter(i => i.category === category);

  const total = selections.reduce((sum, s) => sum + s.amount, 0);
  const selectionByKey = new Map(selections.map(s => [selectionKey(s.type, s.id), s]));

  function upsertSelection(next: Selection) {
    setSelections(prev => {
      const key = selectionKey(next.type, next.id);
      // Re-picking an amount on a fund already in the tray replaces it rather
      // than adding a second line for the same fund.
      const without = prev.filter(s => selectionKey(s.type, s.id) !== key);
      return [...without, next];
    });
  }

  function removeSelection(type: 'fund' | 'item', id: string) {
    const key = selectionKey(type, id);
    setSelections(prev => prev.filter(s => selectionKey(s.type, s.id) !== key));
  }

  const headingParts = settings.heroHeading.split(' ');
  const headingLast = headingParts.length > 1 ? headingParts.pop() : null;
  const headingLead = headingParts.join(' ');

  const hasStory = Boolean(settings.storyHeading || settings.storyBody || settings.travelPhotos.length > 0);

  return (
    <div style={{ background: tokens.bone, minHeight: '100vh', paddingBottom: selections.length > 0 ? 96 : 0 }}>
      {isPreview && (
        <div
          style={{
            background: tokens.persimmon,
            color: tokens.onPersimmon,
            fontFamily: tokens.grotesque,
            fontWeight: 700,
            fontSize: '0.72rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            textAlign: 'center',
            padding: '10px 16px',
          }}
        >
          Admin preview — the registry is switched off for guests
        </div>
      )}

      {/* ── HERO ── */}
      <section className="mr-reg-hero" id="registry-hero">
        {settings.heroPhotoUrl && (
          <div className="mr-reg-hero-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={settings.heroPhotoUrl} alt="" />
          </div>
        )}
        <div className={`mr-reg-hero-panel${settings.heroPhotoUrl ? '' : ' mr-reg-hero-panel--full'}`}>
          <div className="mr-reg-hero-panel-inner">
            <Kicker label={settings.heroEyebrow} variant="bare" labelColor={tokens.persimmon} />
            <Reveal>
              <h1 className="mr-reg-hero-heading">
                {headingLead}{' '}
                {headingLast && <em>{headingLast}</em>}
              </h1>
              <p className="mr-reg-hero-body">{settings.heroBody}</p>
              <a href="#registry-gifts" className="mr-reg-hero-cta">
                Explore the registry ↓
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── STORY + FUNDS + ITEMS — one continuous section. These used to be
          separate <Section>s, each with the same clamp(72-150px) top/bottom
          padding, which stacked into a huge dead gap between them; a single
          section with margin-based spacing between the sub-blocks reads as
          one continuous page instead. Renders nothing at all — not even the
          section's own padding — if there's neither story content nor a
          catalogue yet, rather than showing an empty "coming soon" block. ── */}
      {(hasStory || funds.length > 0 || items.length > 0) && (
      <Section variant="bone" id="registry-gifts">
        {hasStory && (
          <div>
            <Reveal style={{ maxWidth: 640 }}>
              {settings.storyHeading && (
                <h2
                  style={{
                    fontFamily: tokens.display,
                    fontWeight: 500,
                    fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                    lineHeight: 1.1,
                    color: tokens.ink,
                    margin: 0,
                  }}
                >
                  {settings.storyHeading}
                </h2>
              )}
              {settings.storyBody && (
                <p
                  style={{
                    fontFamily: tokens.body,
                    fontSize: '1rem',
                    lineHeight: 1.7,
                    color: 'rgba(11,33,24,.75)',
                    maxWidth: '56ch',
                    marginTop: settings.storyHeading ? 18 : 0,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {settings.storyBody}
                </p>
              )}
            </Reveal>

            {settings.travelPhotos.length > 0 && (
              <Reveal style={{ marginTop: 'clamp(28px, 4vw, 40px)' }}>
                <PhotoStrip photos={settings.travelPhotos} />
              </Reveal>
            )}
          </div>
        )}

        {/* ── FUNDS — the main way to give, so they lead ── */}
        {funds.length > 0 && (
          <div style={{ marginTop: hasStory ? 'clamp(48px, 6vw, 72px)' : 0 }}>
            <Reveal>
              <Kicker label="Our next adventures" variant="bare" labelColor={tokens.persimmon} />
            </Reveal>
            <div className="mr-reg-fund-grid" style={{ marginTop: 'clamp(20px, 3vw, 28px)' }}>
              {funds.map(fund => (
                <FundCard
                  key={fund.id}
                  fund={fund}
                  selected={selectionByKey.get(selectionKey('fund', fund.id))}
                  onSelect={amount => upsertSelection({ type: 'fund', id: fund.id, name: fund.name, amount })}
                  onRemove={() => removeSelection('fund', fund.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── ITEMS — a specific gift in mind, if the couple's curated any ── */}
        {items.length > 0 && (
          <div style={{ marginTop: hasStory || funds.length > 0 ? 'clamp(48px, 6vw, 72px)' : 0 }}>
            <Reveal>
              <Kicker label="Something specific" variant="bare" labelColor={tokens.sand} />
            </Reveal>

            {categories.length > 1 && (
              <Reveal style={{ marginTop: 18 }}>
                <div className="mr-reg-filters" role="group" aria-label="Filter gifts by category">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`mr-reg-pill${category === cat ? ' is-active' : ''}`}
                      aria-pressed={category === cat}
                      onClick={() => setCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </Reveal>
            )}

            <div className="mr-reg-grid" style={{ marginTop: 'clamp(20px, 3vw, 28px)' }}>
              {visibleItems.map(item => {
                const isSelected = selectionByKey.has(selectionKey('item', item.id));
                return (
                  <ItemCard
                    key={item.id}
                    item={item}
                    selected={isSelected}
                    onToggle={() =>
                      isSelected
                        ? removeSelection('item', item.id)
                        : upsertSelection({ type: 'item', id: item.id, name: item.name, amount: Number(item.price) })
                    }
                  />
                );
              })}
            </div>
          </div>
        )}

      </Section>
      )}

      {/* ── CLOSING ── */}
      <section className="mr-reg-closing">
        <p className="mr-reg-closing-script">{settings.closingMessage}</p>
        <div className="mr-reg-closing-names">
          {settings.coupleNames.includes(' & ') ? (
            (() => {
              const [name1, name2] = settings.coupleNames.split(' & ');
              return (
                <>
                  <span style={{ color: tokens.violet }}>{name1}</span>{' '}
                  <em style={{ fontStyle: 'italic', color: tokens.persimmon }}>&amp;</em>{' '}
                  <span style={{ color: tokens.violet }}>{name2}</span>
                </>
              );
            })()
          ) : (
            settings.coupleNames
          )}
        </div>
      </section>

      {/* ── STICKY TRAY ── */}
      {selections.length > 0 && (
        <div className="mr-reg-tray">
          <div>
            <p className="mr-reg-tray-summary" style={{ margin: 0 }}>
              {selections.length} {selections.length === 1 ? 'gift' : 'gifts'} selected
            </p>
            <p className="mr-reg-tray-total" style={{ margin: '2px 0 0' }}>
              {formatAud(total)}
            </p>
          </div>
          <button type="button" className="mr-reg-btn" onClick={() => setPanelOpen(true)}>
            Checkout
          </button>
        </div>
      )}

      {panelOpen && (
        <GiftPanel
          slug={slug}
          householdName={householdName}
          householdRef={householdRef}
          selections={selections}
          bankTransferConfigured={settings.bankTransferConfigured}
          onClose={() => setPanelOpen(false)}
          onDropSelections={keys => {
            setSelections(prev => prev.filter(s => !keys.includes(selectionKey(s.type, s.id))));
          }}
          onRemoveSelection={removeSelection}
        />
      )}
    </div>
  );
}
