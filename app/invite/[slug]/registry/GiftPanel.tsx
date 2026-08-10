'use client';

import { useEffect, useRef, useState } from 'react';
import { formatAud, selectionKey, type Selection } from './RegistryClient';

// "Who's this from?" — everything between picking gifts and paying for them.
// Nothing here charges anyone; the two buttons at the bottom are the only
// points where money is involved, and each states plainly what it will do.

type HouseholdTag = { ref: string; name: string };
type InvalidSelection = { type: 'fund' | 'item'; id: string; name: string | null; reason: string };
type PayidResult = {
  payid: string;
  payidName: string;
  instructions: string;
  referenceCode: string;
  total: number;
};

const REASON_COPY: Record<string, string> = {
  sold_out: 'has already been claimed',
  inactive: 'is no longer available',
  not_found: 'is no longer available',
  duplicate: 'was added twice',
  invalid_amount: 'needs a valid amount',
};

export default function GiftPanel({
  slug,
  householdName,
  householdRef,
  selections,
  payidConfigured,
  onClose,
  onDropSelections,
  onRemoveSelection,
}: {
  slug: string;
  householdName: string;
  householdRef: string;
  selections: Selection[];
  payidConfigured: boolean;
  onClose: () => void;
  onDropSelections: (keys: string[]) => void;
  onRemoveSelection: (type: 'fund' | 'item', id: string) => void;
}) {
  // The submitting household is pre-added but removable — someone paying purely
  // on behalf of their parents shouldn't have their own name on the gift.
  const [tags, setTags] = useState<HouseholdTag[]>([{ ref: householdRef, name: householdName }]);
  const [freetextNames, setFreetextNames] = useState<string[]>([]);
  const [freetextInput, setFreetextInput] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HouseholdTag[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<'card' | 'payid' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<InvalidSelection[] | null>(null);
  const [payid, setPayid] = useState<PayidResult | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Debounced typeahead — the endpoint scans every household per call, so this
  // waits for a pause rather than firing on each keystroke.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/registry/household-search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        setResults(data.matches ?? []);
      } catch {
        // Aborted or offline — the guest can still use the free-text field.
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const total = selections.reduce((sum, s) => sum + s.amount, 0);

  function addTag(tag: HouseholdTag) {
    setTags(prev => (prev.some(t => t.ref === tag.ref) ? prev : [...prev, tag]));
    setQuery('');
    setResults([]);
  }

  function addFreetext() {
    const name = freetextInput.trim();
    if (!name) return;
    setFreetextNames(prev => (prev.includes(name) ? prev : [...prev, name]));
    setFreetextInput('');
  }

  function buildBody() {
    return {
      slug,
      selections: selections.map(s => ({ type: s.type, id: s.id, amount: s.amount })),
      beneficiaries: [
        ...tags.map(t => ({ householdRef: t.ref })),
        ...freetextNames.map(name => ({ freetextName: name })),
      ],
      message: message.trim() || undefined,
    };
  }

  /**
   * Handles the 409 both payment paths can return: strips the selections the
   * server rejected out of the tray and surfaces them, so the guest reviews an
   * accurate tray before trying again rather than being bounced opaquely.
   * Returns true when the response was a 409 and has been dealt with.
   */
  function handleConflict(status: number, data: { invalid?: InvalidSelection[] }): boolean {
    if (status !== 409 || !data.invalid) return false;
    setUnavailable(data.invalid);
    onDropSelections(data.invalid.map(i => selectionKey(i.type, i.id)));
    return true;
  }

  async function payByCard() {
    setBusy('card');
    setError(null);
    setUnavailable(null);
    try {
      const res = await fetch('/api/registry/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody()),
      });
      const data = await res.json().catch(() => ({}));
      if (handleConflict(res.status, data)) return;
      if (!res.ok || !data.url) {
        setError(data.message || 'Something went wrong. Please try again.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Could not reach the payment page. Please check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  async function payByTransfer() {
    setBusy('payid');
    setError(null);
    setUnavailable(null);
    try {
      const res = await fetch('/api/registry/contribute-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody()),
      });
      const data = await res.json().catch(() => ({}));
      if (handleConflict(res.status, data)) return;
      if (!res.ok) {
        setError(data.message || 'Something went wrong. Please try again.');
        return;
      }
      setPayid(data as PayidResult);
    } catch {
      setError('Could not set up the transfer. Please check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  // ── Confirmed bank-transfer view: the reference code is the only thing
  // standing between this gift and an unmatched line in the couple's bank feed,
  // so it gets the whole panel rather than a toast. ──
  if (payid) {
    return (
      <div className="mr-reg-overlay" role="dialog" aria-modal="true" aria-label="Bank transfer details">
        <div className="mr-reg-panel" ref={panelRef}>
          <h2>Almost there</h2>
          <p className="mr-reg-desc">
            Transfer {formatAud(payid.total)} using the details below. We&apos;ll mark your gift as received once
            it lands.
          </p>

          <div className="mr-reg-section">
            <span className="mr-reg-label">PayID</span>
            <div className="mr-reg-payid">{payid.payid}</div>
            {payid.payidName && (
              <p className="mr-reg-desc" style={{ marginTop: 8 }}>
                Account name: {payid.payidName}
              </p>
            )}
          </div>

          <div className="mr-reg-section">
            <span className="mr-reg-label">Reference</span>
            <div className="mr-reg-payid">{payid.referenceCode}</div>
            {payid.instructions && (
              <p className="mr-reg-desc" style={{ marginTop: 8 }}>
                {payid.instructions}
              </p>
            )}
          </div>

          <div className="mr-reg-section">
            <span className="mr-reg-label">Amount</span>
            <div className="mr-reg-payid">{formatAud(payid.total)}</div>
          </div>

          <div className="mr-reg-section">
            <button type="button" className="mr-reg-btn" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasSelections = selections.length > 0;

  return (
    <div
      className="mr-reg-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Who's this gift from?"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mr-reg-panel" ref={panelRef}>
        <h2>Who&apos;s this from?</h2>
        <p className="mr-reg-desc">
          So we know who to thank. You can add other households, or anyone who isn&apos;t on the guest list.
        </p>

        {/* ── Review ── */}
        <div className="mr-reg-section">
          <span className="mr-reg-label">Your gifts</span>
          {hasSelections ? (
            <ul className="mr-reg-lines">
              {selections.map(s => (
                <li key={selectionKey(s.type, s.id)}>
                  <span>{s.name}</span>
                  <span>
                    <span className="mr-reg-line-amount">{formatAud(s.amount)}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${s.name}`}
                      onClick={() => onRemoveSelection(s.type, s.id)}
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mr-reg-desc" style={{ margin: 0 }}>
              Your selection is empty — close this and choose a gift.
            </p>
          )}
        </div>

        {unavailable && unavailable.length > 0 && (
          <div className="mr-reg-section">
            <div className="mr-reg-notice">
              <strong>Some gifts changed while you were choosing.</strong>
              <ul>
                {unavailable.map(u => (
                  <li key={`${u.type}:${u.id}`}>
                    {u.name ?? 'A gift'} {REASON_COPY[u.reason] ?? 'is no longer available'}
                  </li>
                ))}
              </ul>
              <p style={{ margin: '8px 0 0' }}>
                We&apos;ve removed {unavailable.length === 1 ? 'it' : 'them'} — check the list above, then choose how
                you&apos;d like to pay.
              </p>
            </div>
          </div>
        )}

        {/* ── Beneficiaries ── */}
        <div className="mr-reg-section">
          <span className="mr-reg-label">From</span>

          {(tags.length > 0 || freetextNames.length > 0) && (
            <div className="mr-reg-tag-row">
              {tags.map(tag => (
                <span key={tag.ref} className="mr-reg-tag">
                  {tag.name}
                  <button
                    type="button"
                    aria-label={`Remove ${tag.name}`}
                    onClick={() => setTags(prev => prev.filter(t => t.ref !== tag.ref))}
                  >
                    ×
                  </button>
                </span>
              ))}
              {freetextNames.map(name => (
                <span key={name} className="mr-reg-tag">
                  {name}
                  <button
                    type="button"
                    aria-label={`Remove ${name}`}
                    onClick={() => setFreetextNames(prev => prev.filter(n => n !== name))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <input
            className="mr-reg-field"
            type="text"
            placeholder="Search for another household…"
            aria-label="Search for another household"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {results.length > 0 && (
            <ul className="mr-reg-results">
              {results
                .filter(r => !tags.some(t => t.ref === r.ref))
                .map(r => (
                  <li key={r.ref}>
                    <button type="button" onClick={() => addTag(r)}>
                      {r.name}
                    </button>
                  </li>
                ))}
            </ul>
          )}

          <div className="mr-reg-custom" style={{ marginTop: 14 }}>
            <input
              className="mr-reg-field"
              type="text"
              placeholder="Someone else — type their name"
              aria-label="Add someone who isn't on the guest list"
              value={freetextInput}
              onChange={e => setFreetextInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addFreetext();
                }
              }}
            />
            <button type="button" className="mr-reg-btn mr-reg-btn-ghost" onClick={addFreetext}>
              Add
            </button>
          </div>
        </div>

        {/* ── Message ── */}
        <div className="mr-reg-section">
          <label className="mr-reg-label" htmlFor="mr-reg-message">
            A note (optional)
          </label>
          <textarea
            id="mr-reg-message"
            className="mr-reg-field"
            rows={3}
            style={{ resize: 'vertical' }}
            placeholder="Anything you'd like to say…"
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>

        {/* ── Payment ── */}
        <div className="mr-reg-section">
          <span className="mr-reg-label">Total — {formatAud(total)}</span>

          {error && (
            <div className="mr-reg-notice" style={{ marginBottom: 12 }}>
              {error}
            </div>
          )}

          <button
            type="button"
            className="mr-reg-btn"
            onClick={payByCard}
            disabled={!hasSelections || busy !== null}
          >
            {busy === 'card' ? 'Taking you to checkout…' : `Pay by card — ${formatAud(total)}`}
          </button>
          <p className="mr-reg-desc" style={{ textAlign: 'center', marginTop: 8 }}>
            Visa, Mastercard and Amex · secured by Stripe
          </p>

          {payidConfigured && (
            <>
              <button
                type="button"
                className="mr-reg-btn mr-reg-btn-ghost"
                style={{ marginTop: 16 }}
                onClick={payByTransfer}
                disabled={!hasSelections || busy !== null}
              >
                {busy === 'payid' ? 'Setting up…' : 'Bank transfer (PayID) — no fees'}
              </button>
              <p className="mr-reg-desc" style={{ textAlign: 'center', marginTop: 8 }}>
                We&apos;ll show you a PayID and a reference code to quote
              </p>
            </>
          )}

          <button
            type="button"
            className="mr-reg-btn mr-reg-btn-ghost"
            style={{ marginTop: 16, border: 0 }}
            onClick={onClose}
            disabled={busy !== null}
          >
            Keep browsing
          </button>
        </div>
      </div>
    </div>
  );
}
