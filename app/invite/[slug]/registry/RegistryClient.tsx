'use client';

import { useMemo, useState } from 'react';
import Section from '../v4/components/Section';
import Reveal from '../v4/components/Reveal';
import Kicker from '../v4/components/Kicker';
import TreatedPhoto from '../v4/components/TreatedPhoto';
import { tokens } from '../v4/tokens';
import GiftPanel from './GiftPanel';

export type CatalogFund = {
  id: string;
  name: string;
  description: string | null;
  suggested_amounts: number[];
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
  payidConfigured: boolean;
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
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const suggested = fund.suggested_amounts ?? [];
  // A chip reads as active only when it matches the amount currently selected;
  // a custom amount leaves every chip inactive, which is the honest signal.
  const activeAmount = selected?.amount;

  function commitCustom() {
    const parsed = Number(customValue);
    if (!Number.isFinite(parsed) || parsed < 1) return;
    onSelect(Math.round(parsed * 100) / 100);
    setCustomOpen(false);
    setCustomValue('');
  }

  return (
    <article className={`mr-reg-card${selected ? ' is-selected' : ''}`}>
      {fund.image_url && (
        <div className="mr-reg-card-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fund.image_url} alt="" />
        </div>
      )}
      <div className="mr-reg-card-body">
        <h3>{fund.name}</h3>
        {fund.description && <p className="mr-reg-desc">{fund.description}</p>}

        <div className="mr-reg-chip-row">
          {suggested.map(amount => (
            <button
              key={amount}
              type="button"
              className={`mr-reg-chip${activeAmount === amount ? ' is-active' : ''}`}
              aria-pressed={activeAmount === amount}
              onClick={() => onSelect(amount)}
            >
              {formatAud(amount)}
            </button>
          ))}
          <button
            type="button"
            className={`mr-reg-chip${customOpen ? ' is-active' : ''}`}
            aria-pressed={customOpen}
            onClick={() => setCustomOpen(open => !open)}
          >
            Custom
          </button>
        </div>

        {customOpen && (
          <div className="mr-reg-custom">
            <input
              className="mr-reg-field mr-reg-field-sm"
              type="number"
              min={1}
              step="1"
              inputMode="decimal"
              placeholder="Amount in AUD"
              aria-label={`Custom amount for ${fund.name}`}
              value={customValue}
              onChange={e => setCustomValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitCustom();
                }
              }}
            />
            <button type="button" className="mr-reg-btn mr-reg-btn-ghost" onClick={commitCustom}>
              Add
            </button>
          </div>
        )}

        {selected && <p className="mr-reg-price">Added — {formatAud(selected.amount)}</p>}

        <div className="mr-reg-cta">
          {selected ? (
            <button type="button" className="mr-reg-btn mr-reg-btn-ghost" onClick={onRemove}>
              Remove
            </button>
          ) : (
            <p className="mr-reg-desc" style={{ margin: 0, textAlign: 'center' }}>
              Choose an amount above
            </p>
          )}
        </div>
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
        <div className="mr-reg-cta">
          <button
            type="button"
            className={`mr-reg-btn${selected ? ' mr-reg-btn-ghost' : ''}`}
            onClick={onToggle}
            disabled={soldOut && !selected}
          >
            {soldOut && !selected ? 'Already claimed' : selected ? 'Remove' : 'Gift this'}
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

  // Categories are whatever the catalogue actually uses, in first-seen order —
  // so the admin can add one without touching this file.
  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const entry of [...funds, ...items]) {
      if (entry.category && !seen.includes(entry.category)) seen.push(entry.category);
    }
    return [ALL_CATEGORIES, ...seen];
  }, [funds, items]);

  const visibleFunds = category === ALL_CATEGORIES ? funds : funds.filter(f => f.category === category);
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

  return (
    <div style={{ background: tokens.greenDeep, minHeight: '100vh', paddingBottom: selections.length > 0 ? 96 : 0 }}>
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
      <Section variant="deep" id="registry-hero">
        <div
          style={{
            display: 'grid',
            gap: 'clamp(28px, 5vw, 64px)',
            gridTemplateColumns: settings.heroPhotoUrl ? 'minmax(0, 1.1fr) minmax(0, 0.9fr)' : '1fr',
            alignItems: 'center',
          }}
          className="mr-reg-hero-grid"
        >
          <div>
            <Kicker label={settings.heroEyebrow} variant="bare" labelColor={tokens.sand} />
            <Reveal>
              <h1
                style={{
                  fontFamily: tokens.display,
                  fontWeight: 900,
                  fontVariationSettings: '"opsz" 144',
                  fontSize: 'clamp(2.4rem, 7vw, 4.2rem)',
                  lineHeight: 0.98,
                  letterSpacing: '-0.01em',
                  color: tokens.bone,
                  margin: '18px 0 0',
                }}
              >
                {headingLead}{' '}
                {headingLast && (
                  <em style={{ fontStyle: 'italic', fontWeight: 600, color: tokens.violet }}>{headingLast}</em>
                )}
              </h1>
              <p
                style={{
                  fontFamily: tokens.grotesque,
                  fontWeight: 300,
                  fontSize: '1.02rem',
                  lineHeight: 1.6,
                  color: tokens.sand,
                  maxWidth: '46ch',
                  margin: '24px 0 0',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {settings.heroBody}
              </p>
              <div style={{ marginTop: 30 }}>
                <a href="#registry-gifts" className="mr-btn mr-btn-solid">
                  Explore the registry
                </a>
              </div>
            </Reveal>
          </div>

          {settings.heroPhotoUrl && (
            <Reveal>
              <TreatedPhoto src={settings.heroPhotoUrl} alt="" ratio={4 / 5} shape="arch" />
            </Reveal>
          )}
        </div>
      </Section>

      {/* ── FILTERS + GRID ── */}
      <Section variant="deep" id="registry-gifts">
        {categories.length > 1 && (
          <Reveal>
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

        <div style={{ marginTop: 'clamp(28px, 4vw, 44px)' }}>
          {visibleFunds.length === 0 && visibleItems.length === 0 ? (
            <p style={{ fontFamily: tokens.grotesque, color: tokens.sand, opacity: 0.75 }}>
              Nothing here just yet — please check back soon.
            </p>
          ) : (
            <div className="mr-reg-grid">
              {visibleFunds.map(fund => (
                <FundCard
                  key={fund.id}
                  fund={fund}
                  selected={selectionByKey.get(selectionKey('fund', fund.id))}
                  onSelect={amount => upsertSelection({ type: 'fund', id: fund.id, name: fund.name, amount })}
                  onRemove={() => removeSelection('fund', fund.id)}
                />
              ))}
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
          )}
        </div>
      </Section>

      {/* ── CLOSING ── */}
      <Section variant="deep" id="registry-closing">
        <Reveal style={{ textAlign: 'center' }}>
          <p
            style={{
              fontFamily: tokens.display,
              fontWeight: 400,
              fontStyle: 'italic',
              fontSize: 'clamp(1.4rem, 4vw, 2.2rem)',
              lineHeight: 1.3,
              color: tokens.bone,
              maxWidth: '34ch',
              margin: '0 auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {settings.closingMessage}
          </p>
          <div
            style={{
              fontFamily: tokens.display,
              fontWeight: 900,
              fontSize: 'clamp(1.6rem, 7vw, 2.8rem)',
              marginTop: 'clamp(28px, 4vw, 44px)',
              color: tokens.violet,
            }}
          >
            {settings.coupleNames}
          </div>
        </Reveal>
      </Section>

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
          payidConfigured={settings.payidConfigured}
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
