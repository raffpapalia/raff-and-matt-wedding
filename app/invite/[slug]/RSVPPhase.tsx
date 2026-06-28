'use client';

import { useState, useEffect } from 'react';
import type { Household, Guest, CustomQuestion, CustomAnswer } from '@/lib/supabase';
import { formatShortWeekday } from '@/lib/date';

interface RSVPPhaseProps {
  household: Household;
  guests: Guest[];
  questions: CustomQuestion[];
  existingAnswers: CustomAnswer[];
  dietaryOptions?: string[];
  rsvpCutoffDate?: string;
  // Display-only — shown on the post-submit confirmation card. Not used by submit logic.
  weddingDate?: string;
}

function isPastCutoff(cutoffDate: string): boolean {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return todayStr > cutoffDate;
}

interface GuestFormData {
  [guestId: string]: {
    // null = no selection yet — guests must actively choose Yes or No, never
    // defaulted to "No" for them.
    attending: boolean | null;
    hasDietary: boolean;
    dietary_requirement: string;
    dietary_other: string;
  };
}

interface PlusOneGuest {
  id: string; // temporary ID for form state
  first_name: string;
  last_name: string;
  attending: boolean;
  hasDietary: boolean;
  dietary_requirement: string;
  dietary_other: string;
}

const DEFAULT_DIETARY_LABELS = ['Vegetarian', 'Vegan', 'Gluten free', 'Dairy free', 'Halal', 'Kosher', 'Other'];

function buildDietaryOptions(labels: string[]) {
  return [
    { value: 'none', label: 'No preference' },
    ...labels.map(label => ({
      value: label.toLowerCase().replace(/\s+/g, '_'),
      label,
    })),
  ];
}

function getDietaryLabel(
  requirement: string,
  other: string | null,
  options: { value: string; label: string }[],
): string {
  const opt = options.find(o => o.value === requirement);
  if (opt) return opt.label;
  return requirement.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function parseSongAnswer(raw: string): { artist: string; song: string } {
  try {
    const parsed = JSON.parse(raw);
    return { artist: parsed.artist || '', song: parsed.song || '' };
  } catch {
    return { artist: '', song: '' };
  }
}

const SONG_PROMPTS = [
  "The song you can't sit down for...",
  'Your go-to karaoke anthem...',
  'The track that defines you at 11pm...',
  'The one that always gets you up...',
];

function SongQuestionInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (serialised: string) => void;
}) {
  const [promptIdx, setPromptIdx] = useState(0);
  const [promptVisible, setPromptVisible] = useState(true);
  const parsed = parseSongAnswer(value);

  useEffect(() => {
    let fadeTimeout: ReturnType<typeof setTimeout>;
    const id = setInterval(() => {
      setPromptVisible(false);
      fadeTimeout = setTimeout(() => {
        setPromptIdx(i => (i + 1) % SONG_PROMPTS.length);
        setPromptVisible(true);
      }, 400);
    }, 3000);
    return () => {
      clearInterval(id);
      clearTimeout(fadeTimeout);
    };
  }, []);

  const update = (field: 'artist' | 'song', val: string) =>
    onChange(JSON.stringify({ ...parsed, [field]: val }));

  return (
    <div>
      <p className="rv-song-prompt" style={{ opacity: promptVisible ? 1 : 0 }}>
        {SONG_PROMPTS[promptIdx]}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="text-xl shrink-0" aria-hidden>🎵</span>
        <input
          type="text"
          placeholder="Artist"
          value={parsed.artist}
          onChange={e => update('artist', e.target.value)}
          className="rv-field flex-1"
        />
        <input
          type="text"
          placeholder="Song title"
          value={parsed.song}
          onChange={e => update('song', e.target.value)}
          className="rv-field flex-1"
        />
      </div>
    </div>
  );
}

export default function RSVPPhase({ household, guests, questions, existingAnswers, dietaryOptions, rsvpCutoffDate, weddingDate }: RSVPPhaseProps) {
  const DIETARY_OPTIONS = buildDietaryOptions(dietaryOptions ?? DEFAULT_DIETARY_LABELS);
  const rsvpClosed = rsvpCutoffDate ? isPastCutoff(rsvpCutoffDate) : false;
  const [formData, setFormData] = useState<GuestFormData>(
    guests.reduce((acc, guest) => ({
      ...acc,
      [guest.id]: {
        attending: guest.rsvp_status === 'attending' ? true : guest.rsvp_status === 'declined' ? false : null,
        hasDietary: guest.dietary_requirement !== 'none' && guest.dietary_requirement !== null,
        dietary_requirement: guest.dietary_requirement || 'none',
        dietary_other: guest.dietary_other || '',
      },
    }), {})
  );

  // Initialise from any previously-saved answers (keyed by question_id)
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const a of existingAnswers) {
      init[a.question_id] = a.answer_text;
    }
    return init;
  });

  const [plusOnes, setPlusOnes] = useState<PlusOneGuest[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submittedCounts, setSubmittedCounts] = useState({ attending: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True on initial load when the household has already submitted responses
  const [showSummary, setShowSummary] = useState(
    () => guests.some(g => g.rsvp_status === 'attending' || g.rsvp_status === 'declined')
  );
  // Gates the inline form behind a "Confirm your seats" button for first-time
  // guests; returning guests (who already have a saved response) start open.
  const [isFormOpen, setIsFormOpen] = useState(
    () => guests.some(g => g.rsvp_status === 'attending' || g.rsvp_status === 'declined')
  );

  const handleAttendingChange = (guestId: string, attending: boolean) => {
    setFormData(prev => ({
      ...prev,
      [guestId]: {
        ...prev[guestId],
        attending,
      },
    }));
  };

  const handleHasDietaryChange = (guestId: string, hasDietary: boolean) => {
    setFormData(prev => ({
      ...prev,
      [guestId]: {
        ...prev[guestId],
        hasDietary,
        dietary_requirement: hasDietary ? 'vegetarian' : 'none',
        dietary_other: '',
      },
    }));
  };

  const handleDietaryChange = (guestId: string, dietary: string) => {
    setFormData(prev => ({
      ...prev,
      [guestId]: {
        ...prev[guestId],
        dietary_requirement: dietary,
        dietary_other: dietary === 'other' ? prev[guestId].dietary_other : '',
      },
    }));
  };

  const handleDietaryOtherChange = (guestId: string, text: string) => {
    setFormData(prev => ({
      ...prev,
      [guestId]: {
        ...prev[guestId],
        dietary_other: text,
      },
    }));
  };

  const setQuestionAnswer = (questionId: string, value: string) =>
    setQuestionAnswers(prev => ({ ...prev, [questionId]: value }));

  const handlePlusOneChange = (id: string, field: string, value: any) => {
    setPlusOnes(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addPlusOne = () => {
    setPlusOnes(prev => [...prev, {
      id: `new_${Date.now()}`,
      first_name: '',
      last_name: '',
      attending: true,
      hasDietary: false,
      dietary_requirement: 'none',
      dietary_other: '',
    }]);
  };

  const removePlusOne = (id: string) => {
    setPlusOnes(prev => prev.filter(p => p.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const allGuests = Object.entries(formData).map(([guestId, data]) => ({
        guest_id: guestId,
        rsvp_status: data.attending ? 'attending' : 'declined',
        dietary_requirement: data.hasDietary ? data.dietary_requirement : 'none',
        dietary_other: data.hasDietary && data.dietary_requirement === 'other' ? (data.dietary_other || null) : null,
      }));

      // Build custom answers — skip blanks; song type needs both fields present
      const custom_answers = questions
        .map(q => {
          const raw = (questionAnswers[q.id] ?? '').trim();
          if (!raw) return null;
          if (q.question_type === 'song') {
            const { artist, song } = parseSongAnswer(raw);
            if (!artist.trim() && !song.trim()) return null;
          }
          return { question_id: q.id, answer_text: raw };
        })
        .filter((a): a is { question_id: string; answer_text: string } => a !== null);

      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household_id: household.id,
          responses: allGuests,
          plus_ones: plusOnes.map(p => ({
            first_name: p.first_name,
            last_name: p.last_name,
            rsvp_status: p.attending ? 'attending' : 'declined',
            dietary_requirement: p.hasDietary ? p.dietary_requirement : 'none',
            dietary_other: p.hasDietary && p.dietary_requirement === 'other' ? (p.dietary_other || null) : null,
          })),
          custom_answers,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.details || 'Failed to submit RSVP');
      }

      // Calculate submission counts for confirmation screen
      const attendingCount = allGuests.filter(g => g.rsvp_status === 'attending').length +
        plusOnes.filter(p => p.attending).length;
      const totalCount = allGuests.length + plusOnes.length;

      setSubmittedCounts({ attending: attendingCount, total: totalCount });
      setLoading(false);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const householdName = guests.length === 1
    ? `${guests[0].first_name}`
    : `${guests.map(g => g.first_name).join(' & ')}`;

  const getConfirmationMessage = () => {
    const allAttending = submittedCounts.attending === submittedCounts.total && submittedCounts.total > 0;
    const allDeclined = submittedCounts.attending === 0;

    if (allAttending) {
      return "We can't wait to celebrate with you!";
    } else if (allDeclined) {
      return "We'll miss you so much — thanks for letting us know.";
    } else {
      return "Thanks for letting us know — we're so excited to celebrate with those who can make it!";
    }
  };

  if (submitted) {
    return (
      <div className="mr-rsvp-v4 mr-v4">
        <div style={{ textAlign: 'center' }}>
          <h2 className="rv-success-heading">You&apos;re on the list</h2>
          {weddingDate && (
            <p className="rv-success-meta">
              {householdName} &nbsp;·&nbsp; {formatShortWeekday(weddingDate)}
            </p>
          )}
          <p className="rv-success-message">{getConfirmationMessage()}</p>
          <button
            type="button"
            onClick={() => { setSubmitted(false); setIsFormOpen(true); }}
            className="rv-submit"
            style={{ marginTop: 20 }}
          >
            Update your RSVP
          </button>
        </div>
      </div>
    );
  }

  if (showSummary) {
    return (
      <div className="mr-rsvp-v4 mr-v4">
        <div style={{ marginBottom: 24 }}>
          <p className="rv-guest-name" style={{ marginBottom: 4 }}>You&apos;re all set!</p>
          <p className="rv-label" style={{ marginBottom: 0 }}>Here&apos;s what we have for you</p>
        </div>

        <div>
          {guests.map(guest => (
            <div key={guest.id} className="rv-summary-row">
              <div>
                <h3 style={{ fontFamily: 'var(--grotesque)', fontWeight: 600, fontSize: '1.05rem', margin: 0 }}>
                  {guest.first_name} {guest.last_name}
                </h3>
                {guest.rsvp_status === 'attending' && guest.dietary_requirement && guest.dietary_requirement !== 'none' && (
                  <p style={{ fontFamily: 'var(--grotesque)', fontSize: '0.78rem', opacity: 0.6, margin: '2px 0 0' }}>
                    {getDietaryLabel(guest.dietary_requirement, guest.dietary_other, DIETARY_OPTIONS)}
                    {guest.dietary_requirement === 'other' && guest.dietary_other ? ` — ${guest.dietary_other}` : ''}
                  </p>
                )}
              </div>
              <span className={`rv-badge ${guest.rsvp_status === 'attending' ? 'is-attending' : ''}`}>
                {guest.rsvp_status === 'attending' ? 'Attending' : 'Not attending'}
              </span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => { setShowSummary(false); setIsFormOpen(true); }}
          className="rv-submit"
          style={{ marginTop: 20 }}
        >
          Update your RSVP
        </button>
      </div>
    );
  }

  if (!isFormOpen) {
    return (
      <div className="mr-rsvp-v4 mr-v4" style={{ textAlign: 'center' }}>
        <button type="button" onClick={() => setIsFormOpen(true)} className="rv-submit">
          Confirm your seats
        </button>
      </div>
    );
  }

  return (
    <div className="mr-rsvp-v4 mr-v4">
      {/* RSVP Form */}
      <form onSubmit={handleSubmit}>
        {/* Invited Guests */}
        {guests.map(guest => (
          <div key={guest.id} className="rv-section">
            <h3 className="rv-guest-name">
              {guest.first_name} {guest.last_name}
            </h3>

            {/* Attending Toggle - Primary Question */}
            <div style={{ marginBottom: formData[guest.id].attending ? 24 : 0 }}>
              <p className="rv-label">Will you be attending?</p>
              <div className="rv-pill-row">
                <button
                  type="button"
                  onClick={() => handleAttendingChange(guest.id, true)}
                  className={`rv-pill ${formData[guest.id].attending === true ? 'is-active' : ''}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => handleAttendingChange(guest.id, false)}
                  className={`rv-pill ${formData[guest.id].attending === false ? 'is-active' : ''}`}
                >
                  No
                </button>
              </div>
            </div>

            {/* Dietary Requirements - Only show if attending */}
            {formData[guest.id].attending && (
              <div>
                <p className="rv-label">Dietary requirements</p>
                <div className="rv-pill-row" style={{ marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={() => handleHasDietaryChange(guest.id, false)}
                    className={`rv-pill rv-pill-sm ${!formData[guest.id].hasDietary ? 'is-active' : ''}`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHasDietaryChange(guest.id, true)}
                    className={`rv-pill rv-pill-sm ${formData[guest.id].hasDietary ? 'is-active' : ''}`}
                  >
                    Yes
                  </button>
                </div>

                {/* Dietary Dropdown */}
                {formData[guest.id].hasDietary && (
                  <>
                    <label className="rv-label">What are your requirements?</label>
                    <select
                      value={formData[guest.id].dietary_requirement}
                      onChange={(e) => handleDietaryChange(guest.id, e.target.value)}
                      className="rv-field"
                      style={{ marginBottom: 16 }}
                    >
                      {DIETARY_OPTIONS.filter(opt => opt.value !== 'none').map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    {/* Other Dietary Text Field */}
                    {formData[guest.id].dietary_requirement === 'other' && (
                      <input
                        type="text"
                        placeholder="Please specify"
                        value={formData[guest.id].dietary_other}
                        onChange={(e) => handleDietaryOtherChange(guest.id, e.target.value)}
                        className="rv-field"
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Plus One Guests Section */}
        {household.plus_one_allowance > 0 && (
          <div className="rv-divider" style={{ marginBottom: 'clamp(24px, 4vw, 32px)' }}>
            <p style={{ fontFamily: 'var(--grotesque)', fontSize: '0.92rem', marginBottom: 18 }}>
              You&apos;re welcome to bring {household.plus_one_allowance} additional guest{household.plus_one_allowance !== 1 ? 's' : ''}
            </p>

            {/* Existing Plus Ones */}
            {plusOnes.map((plusOne, idx) => (
              <div key={plusOne.id} className="rv-plus-one-card">
                <div className="flex justify-between items-center" style={{ marginBottom: 14 }}>
                  <p className="rv-label" style={{ margin: 0 }}>Additional Guest {idx + 1}</p>
                  <button type="button" onClick={() => removePlusOne(plusOne.id)} className="rv-remove-link">
                    Remove
                  </button>
                </div>

                <div className="grid gap-3 grid-cols-2" style={{ marginBottom: 14 }}>
                  <input
                    type="text"
                    placeholder="First name"
                    value={plusOne.first_name}
                    onChange={(e) => handlePlusOneChange(plusOne.id, 'first_name', e.target.value)}
                    className="rv-field rv-field-sm"
                  />
                  <input
                    type="text"
                    placeholder="Last name"
                    value={plusOne.last_name}
                    onChange={(e) => handlePlusOneChange(plusOne.id, 'last_name', e.target.value)}
                    className="rv-field rv-field-sm"
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <p className="rv-label">Attending?</p>
                  <div className="rv-pill-row">
                    <button
                      type="button"
                      onClick={() => handlePlusOneChange(plusOne.id, 'attending', true)}
                      className={`rv-pill rv-pill-sm ${plusOne.attending ? 'is-active' : ''}`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePlusOneChange(plusOne.id, 'attending', false)}
                      className={`rv-pill rv-pill-sm ${!plusOne.attending ? 'is-active' : ''}`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {plusOne.attending && (
                  <div>
                    <p className="rv-label">Dietary requirements?</p>
                    <div className="rv-pill-row" style={{ marginBottom: 10 }}>
                      <button
                        type="button"
                        onClick={() => handlePlusOneChange(plusOne.id, 'hasDietary', false)}
                        className={`rv-pill rv-pill-sm ${!plusOne.hasDietary ? 'is-active' : ''}`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePlusOneChange(plusOne.id, 'hasDietary', true)}
                        className={`rv-pill rv-pill-sm ${plusOne.hasDietary ? 'is-active' : ''}`}
                      >
                        Yes
                      </button>
                    </div>

                    {plusOne.hasDietary && (
                      <>
                        <select
                          value={plusOne.dietary_requirement}
                          onChange={(e) => handlePlusOneChange(plusOne.id, 'dietary_requirement', e.target.value)}
                          className="rv-field rv-field-sm"
                          style={{ marginBottom: 10 }}
                        >
                          {DIETARY_OPTIONS.filter(opt => opt.value !== 'none').map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        {plusOne.dietary_requirement === 'other' && (
                          <input
                            type="text"
                            placeholder="Please specify"
                            value={plusOne.dietary_other}
                            onChange={(e) => handlePlusOneChange(plusOne.id, 'dietary_other', e.target.value)}
                            className="rv-field rv-field-sm"
                          />
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Add Plus One Button */}
            {plusOnes.length < household.plus_one_allowance && (
              <button type="button" onClick={addPlusOne} className="rv-add-link">
                + Add another guest
              </button>
            )}
          </div>
        )}

        {/* Custom Questions */}
        {questions.length > 0 && (
          <div className="rv-divider" style={{ marginBottom: 'clamp(24px, 4vw, 32px)' }}>
            {questions.map((q, qi) => (
              <div key={q.id} style={{ marginBottom: qi < questions.length - 1 ? 28 : 0 }}>
                <p className="rv-label">{q.question_text}</p>

                {q.question_type === 'text' && (
                  <input
                    type="text"
                    value={questionAnswers[q.id] ?? ''}
                    onChange={e => setQuestionAnswer(q.id, e.target.value)}
                    className="rv-field"
                  />
                )}

                {q.question_type === 'textarea' && (
                  <textarea
                    rows={3}
                    value={questionAnswers[q.id] ?? ''}
                    onChange={e => setQuestionAnswer(q.id, e.target.value)}
                    className="rv-field"
                    style={{ resize: 'none' }}
                  />
                )}

                {q.question_type === 'yes_no' && (
                  <div className="rv-pill-row">
                    {(['yes', 'no'] as const).map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setQuestionAnswer(q.id, val)}
                        className={`rv-pill ${questionAnswers[q.id] === val ? 'is-active' : ''}`}
                      >
                        {val === 'yes' ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                )}

                {q.question_type === 'dropdown' && (
                  <select
                    value={questionAnswers[q.id] ?? ''}
                    onChange={e => setQuestionAnswer(q.id, e.target.value)}
                    className="rv-field"
                  >
                    <option value="">Select an option...</option>
                    {(q.options ?? []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {q.question_type === 'song' && (
                  <SongQuestionInput
                    value={questionAnswers[q.id] ?? ''}
                    onChange={val => setQuestionAnswer(q.id, val)}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Error Message */}
        {error && <div className="rv-error" style={{ marginBottom: 20 }}>{error}</div>}

        {/* Submit Button or cutoff notice */}
        <div>
          {rsvpClosed ? (
            <p className="rv-cutoff-notice">
              RSVP submissions are now closed. Please contact Matt &amp; Raff directly.
            </p>
          ) : (
            <button type="submit" disabled={loading} className="rv-submit">
              {loading ? 'Submitting...' : 'Submit RSVP'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
