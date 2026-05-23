'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { Household, Guest, CustomQuestion, CustomAnswer } from '@/lib/supabase';

interface RSVPPhaseProps {
  household: Household;
  guests: Guest[];
  questions: CustomQuestion[];
  existingAnswers: CustomAnswer[];
  dietaryOptions?: string[];
  rsvpCutoffDate?: string;
  embedded?: boolean;
}

function isPastCutoff(cutoffDate: string): boolean {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return todayStr > cutoffDate;
}

interface GuestFormData {
  [guestId: string]: {
    attending: boolean;
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
  const parsed = parseSongAnswer(value);

  useEffect(() => {
    const id = setInterval(() => setPromptIdx(i => (i + 1) % SONG_PROMPTS.length), 3000);
    return () => clearInterval(id);
  }, []);

  const update = (field: 'artist' | 'song', val: string) =>
    onChange(JSON.stringify({ ...parsed, [field]: val }));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <span className="text-[#D4A83A] text-xl shrink-0" aria-hidden>🎵</span>
      <input
        type="text"
        placeholder={SONG_PROMPTS[promptIdx]}
        value={parsed.artist}
        onChange={e => update('artist', e.target.value)}
        className="flex-1 px-4 py-3 bg-[#0A1F14] border border-[#D4A83A]/50 text-[#F2E8D0] placeholder-[#D4A83A]/30 focus:border-[#D4A83A] outline-none transition-colors text-sm"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      />
      <input
        type="text"
        placeholder="Song title"
        value={parsed.song}
        onChange={e => update('song', e.target.value)}
        className="flex-1 px-4 py-3 bg-[#0A1F14] border border-[#D4A83A]/50 text-[#F2E8D0] placeholder-[#D4A83A]/30 focus:border-[#D4A83A] outline-none transition-colors text-sm"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      />
    </div>
  );
}

export default function RSVPPhase({ household, guests, questions, existingAnswers, dietaryOptions, rsvpCutoffDate, embedded = false }: RSVPPhaseProps) {
  const DIETARY_OPTIONS = buildDietaryOptions(dietaryOptions ?? DEFAULT_DIETARY_LABELS);
  const rsvpClosed = rsvpCutoffDate ? isPastCutoff(rsvpCutoffDate) : false;
  const [formData, setFormData] = useState<GuestFormData>(
    guests.reduce((acc, guest) => ({
      ...acc,
      [guest.id]: {
        attending: guest.rsvp_status === 'attending',
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
      <div className={embedded ? 'w-full' : 'relative w-full h-screen flex items-center justify-center overflow-hidden bg-[#0A1F14]'}>
        {!embedded && <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-900/5 to-transparent opacity-100" />}
        <div className={embedded ? 'text-center py-4' : 'relative z-10 w-full max-w-2xl px-4 sm:px-6 text-center'}>
          <h2 className="text-5xl sm:text-6xl font-light text-[#F2E8D0] mb-8" style={{ fontFamily: 'var(--font-cinzel)' }}>
            Thank you!
          </h2>
          <p className="text-xl sm:text-2xl text-white/80 mb-6 font-light" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {getConfirmationMessage()}
          </p>
          <p className="text-base sm:text-lg text-[#D4A83A]/80 font-light mb-8" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            More details will be sent your way soon.
          </p>
          <button
            onClick={() => { setLoading(false); setSubmitted(false); }}
            className="text-[#D4A83A] hover:text-[#F2E8D0] transition-colors text-sm underline"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Need to change your response? Click here to update your RSVP
          </button>
        </div>
      </div>
    );
  }

  if (showSummary) {
    return (
      <div className={embedded ? 'w-full' : 'relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-[#0A1F14] py-12 sm:py-16'}>
        {!embedded && <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-900/5 to-transparent opacity-100" />}
        <div className={embedded ? 'w-full' : 'relative z-10 w-full max-w-2xl px-4 sm:px-6'}>
          <div className="text-center mb-10">
            <h2 className="text-4xl sm:text-5xl font-light text-[#F2E8D0] mb-4" style={{ fontFamily: 'var(--font-cinzel)' }}>
              {householdName}
            </h2>
            <div className="h-px w-24 bg-[#D4A83A] mx-auto mb-8" />
            <p className="text-2xl sm:text-3xl font-light text-[#F2E8D0] mb-2" style={{ fontFamily: 'var(--font-cinzel)' }}>
              You&apos;re all set!
            </p>
            <p className="text-base text-white/60 font-light" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Here&apos;s what we have for you.
            </p>
          </div>

          <div className="space-y-6 mb-10">
            {guests.map(guest => (
              <div key={guest.id} className="border-b border-[#D4A83A]/20 pb-6 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-light text-[#F2E8D0]" style={{ fontFamily: 'var(--font-cinzel)' }}>
                    {guest.first_name} {guest.last_name}
                  </h3>
                  <span
                    className={`text-xs uppercase tracking-widest px-3 py-1 font-light border ${
                      guest.rsvp_status === 'attending'
                        ? 'bg-[#D4A83A]/15 text-[#D4A83A] border-[#D4A83A]/40'
                        : 'bg-white/5 text-white/40 border-white/20'
                    }`}
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    {guest.rsvp_status === 'attending' ? 'Attending' : 'Not attending'}
                  </span>
                </div>
                {guest.rsvp_status === 'attending' && guest.dietary_requirement && guest.dietary_requirement !== 'none' && (
                  <p className="text-sm text-white/50 font-light" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    Dietary: {getDietaryLabel(guest.dietary_requirement, guest.dietary_other, DIETARY_OPTIONS)}
                    {guest.dietary_requirement === 'other' && guest.dietary_other ? ` — ${guest.dietary_other}` : ''}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => setShowSummary(false)}
              className="text-[#D4A83A] hover:text-[#F2E8D0] transition-colors text-sm underline"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Update your RSVP
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? 'w-full' : 'relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-[#0A1F14] py-12 sm:py-16'}>
      {!embedded && <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-900/5 to-transparent opacity-100" />}
      {!embedded && <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"><filter id=\"noise\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" seed=\"1\"/></filter><rect width=\"100\" height=\"100\" fill=\"%23fff\" filter=\"url(%23noise)\"/></svg>')"
      }} />}

      <div className={embedded ? 'w-full' : 'relative z-10 w-full max-w-2xl px-4 sm:px-6'}>
        {/* Header with Personal Photo and Message */}
        {!embedded && <div className="mb-12 sm:mb-16 text-center">
          {/* Personal Photo */}
          {household.personal_photo_url && (
            <div className="mb-8 w-full max-w-sm mx-auto">
              <div className="relative aspect-square rounded-sm overflow-hidden border border-accent-gold/30">
                <Image
                  src={household.personal_photo_url}
                  alt="Personal photo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light text-[#F2E8D0] mb-4" style={{ fontFamily: 'var(--font-cinzel)' }}>
            {householdName}
          </h1>

          {/* Personal Message */}
          {household.personal_message && (
            <p className="text-lg sm:text-xl text-white/70 font-light italic mb-6" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              {household.personal_message}
            </p>
          )}

          <div className="h-px w-24 bg-[#D4A83A] mx-auto" />
        </div>}

        {/* RSVP Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Invited Guests */}
          {guests.map((guest, idx) => (
            <div key={guest.id} className="border-b border-[#D4A83A]/20 pb-8 last:border-b-0">
              <h3 className="text-2xl text-[#F2E8D0] mb-8 font-light" style={{ fontFamily: 'var(--font-cinzel)' }}>
                {guest.first_name} {guest.last_name}
              </h3>

              {/* Attending Toggle - Primary Question */}
              <div className="mb-8">
                <p className="text-base uppercase tracking-widest text-[#D4A83A] mb-5 font-light" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Will you be attending?
                </p>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => handleAttendingChange(guest.id, true)}
                    className={`px-8 py-4 font-light text-base transition-all ${
                      formData[guest.id].attending
                        ? 'bg-[#D4A83A] text-[#0A1F14]'
                        : 'border border-[#D4A83A]/50 text-[#F2E8D0] hover:border-[#D4A83A]'
                    }`}
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAttendingChange(guest.id, false)}
                    className={`px-8 py-4 font-light text-base transition-all ${
                      !formData[guest.id].attending
                        ? 'bg-[#D4A83A] text-[#0A1F14]'
                        : 'border border-[#D4A83A]/50 text-[#F2E8D0] hover:border-[#D4A83A]'
                    }`}
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Dietary Requirements - Only show if attending */}
              {formData[guest.id].attending && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#D4A83A]/80 mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    Dietary requirements
                  </p>
                  <div className="flex gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => handleHasDietaryChange(guest.id, false)}
                      className={`px-4 py-2 font-light text-sm transition-all ${
                        !formData[guest.id].hasDietary
                          ? 'bg-[#D4A83A] text-[#0A1F14]'
                          : 'border border-[#D4A83A]/50 text-[#F2E8D0] hover:border-[#D4A83A]'
                      }`}
                      style={{ fontFamily: 'var(--font-dm-sans)' }}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHasDietaryChange(guest.id, true)}
                      className={`px-4 py-2 font-light text-sm transition-all ${
                        formData[guest.id].hasDietary
                          ? 'bg-[#D4A83A] text-[#0A1F14]'
                          : 'border border-[#D4A83A]/50 text-[#F2E8D0] hover:border-[#D4A83A]'
                      }`}
                      style={{ fontFamily: 'var(--font-dm-sans)' }}
                    >
                      Yes
                    </button>
                  </div>

                  {/* Dietary Dropdown */}
                  {formData[guest.id].hasDietary && (
                    <>
                      <label className="text-xs uppercase tracking-widest text-[#D4A83A]/80 mb-2 block" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        What are your requirements?
                      </label>
                      <select
                        value={formData[guest.id].dietary_requirement}
                        onChange={(e) => handleDietaryChange(guest.id, e.target.value)}
                        className="w-full px-4 py-3 bg-[#0A1F14] border border-[#D4A83A]/50 text-[#F2E8D0] focus:border-[#D4A83A] outline-none transition-colors mb-4 text-sm"
                        style={{ fontFamily: 'var(--font-dm-sans)' }}
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
                          className="w-full px-4 py-3 bg-[#0A1F14] border border-[#D4A83A]/50 text-[#F2E8D0] placeholder-[#D4A83A]/30 focus:border-[#D4A83A] outline-none transition-colors text-sm"
                          style={{ fontFamily: 'var(--font-dm-sans)' }}
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
            <div className="border-t border-[#D4A83A]/20 pt-8">
              <div className="mb-8">
                <p className="text-base text-[#F2E8D0] mb-4 font-light" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  You're welcome to bring {household.plus_one_allowance} additional guest{household.plus_one_allowance !== 1 ? 's' : ''}
                </p>

                {/* Existing Plus Ones */}
                {plusOnes.map((plusOne, idx) => (
                  <div key={plusOne.id} className="mb-6 p-4 border border-[#D4A83A]/20 rounded">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-[#D4A83A]" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        Additional Guest {idx + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => removePlusOne(plusOne.id)}
                        className="text-xs text-[#D4A83A]/60 hover:text-[#D4A83A] transition-colors"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-4 grid-cols-2 mb-4">
                      <input
                        type="text"
                        placeholder="First name"
                        value={plusOne.first_name}
                        onChange={(e) => handlePlusOneChange(plusOne.id, 'first_name', e.target.value)}
                        className="px-4 py-2 bg-[#0A1F14] border border-[#D4A83A]/50 text-[#F2E8D0] placeholder-[#D4A83A]/30 focus:border-[#D4A83A] outline-none transition-colors text-sm"
                        style={{ fontFamily: 'var(--font-dm-sans)' }}
                      />
                      <input
                        type="text"
                        placeholder="Last name"
                        value={plusOne.last_name}
                        onChange={(e) => handlePlusOneChange(plusOne.id, 'last_name', e.target.value)}
                        className="px-4 py-2 bg-[#0A1F14] border border-[#D4A83A]/50 text-[#F2E8D0] placeholder-[#D4A83A]/30 focus:border-[#D4A83A] outline-none transition-colors text-sm"
                        style={{ fontFamily: 'var(--font-dm-sans)' }}
                      />
                    </div>

                    <div className="mb-4">
                      <p className="text-xs uppercase tracking-widest text-[#D4A83A]/80 mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        Attending?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handlePlusOneChange(plusOne.id, 'attending', true)}
                          className={`px-3 py-2 font-light text-xs transition-all ${
                            plusOne.attending
                              ? 'bg-[#D4A83A] text-[#0A1F14]'
                              : 'border border-[#D4A83A]/50 text-[#F2E8D0] hover:border-[#D4A83A]'
                          }`}
                          style={{ fontFamily: 'var(--font-dm-sans)' }}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePlusOneChange(plusOne.id, 'attending', false)}
                          className={`px-3 py-2 font-light text-xs transition-all ${
                            !plusOne.attending
                              ? 'bg-[#D4A83A] text-[#0A1F14]'
                              : 'border border-[#D4A83A]/50 text-[#F2E8D0] hover:border-[#D4A83A]'
                          }`}
                          style={{ fontFamily: 'var(--font-dm-sans)' }}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {plusOne.attending && (
                      <div>
                        <p className="text-xs uppercase tracking-widest text-[#D4A83A]/80 mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          Dietary requirements?
                        </p>
                        <div className="flex gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => handlePlusOneChange(plusOne.id, 'hasDietary', false)}
                            className={`px-3 py-2 font-light text-xs transition-all ${
                              !plusOne.hasDietary
                                ? 'bg-[#D4A83A] text-[#0A1F14]'
                                : 'border border-[#D4A83A]/50 text-[#F2E8D0] hover:border-[#D4A83A]'
                            }`}
                            style={{ fontFamily: 'var(--font-dm-sans)' }}
                          >
                            No
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePlusOneChange(plusOne.id, 'hasDietary', true)}
                            className={`px-3 py-2 font-light text-xs transition-all ${
                              plusOne.hasDietary
                                ? 'bg-[#D4A83A] text-[#0A1F14]'
                                : 'border border-[#D4A83A]/50 text-[#F2E8D0] hover:border-[#D4A83A]'
                            }`}
                            style={{ fontFamily: 'var(--font-dm-sans)' }}
                          >
                            Yes
                          </button>
                        </div>

                        {plusOne.hasDietary && (
                          <>
                            <select
                              value={plusOne.dietary_requirement}
                              onChange={(e) => handlePlusOneChange(plusOne.id, 'dietary_requirement', e.target.value)}
                              className="w-full px-3 py-2 bg-[#0A1F14] border border-[#D4A83A]/50 text-[#F2E8D0] focus:border-[#D4A83A] outline-none transition-colors mb-2 text-xs"
                              style={{ fontFamily: 'var(--font-dm-sans)' }}
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
                                className="w-full px-3 py-2 bg-[#0A1F14] border border-[#D4A83A]/50 text-[#F2E8D0] placeholder-[#D4A83A]/30 focus:border-[#D4A83A] outline-none transition-colors text-xs"
                                style={{ fontFamily: 'var(--font-dm-sans)' }}
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
                  <button
                    type="button"
                    onClick={addPlusOne}
                    className="text-sm text-[#D4A83A] hover:text-[#F2E8D0] transition-colors underline"
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    + Add another guest
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Custom Questions */}
          {questions.length > 0 && (
            <div className="border-t border-[#D4A83A]/20 pt-8 space-y-10">
              {questions.map(q => (
                <div key={q.id}>
                  <p
                    className="text-base uppercase tracking-widest text-[#D4A83A] mb-5 font-light"
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    {q.question_text}
                  </p>

                  {q.question_type === 'text' && (
                    <input
                      type="text"
                      value={questionAnswers[q.id] ?? ''}
                      onChange={e => setQuestionAnswer(q.id, e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A1F14] border border-[#D4A83A]/50 text-[#F2E8D0] placeholder-[#D4A83A]/30 focus:border-[#D4A83A] outline-none transition-colors text-sm"
                      style={{ fontFamily: 'var(--font-dm-sans)' }}
                    />
                  )}

                  {q.question_type === 'textarea' && (
                    <textarea
                      rows={3}
                      value={questionAnswers[q.id] ?? ''}
                      onChange={e => setQuestionAnswer(q.id, e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A1F14] border border-[#D4A83A]/50 text-[#F2E8D0] placeholder-[#D4A83A]/30 focus:border-[#D4A83A] outline-none transition-colors text-sm resize-none"
                      style={{ fontFamily: 'var(--font-dm-sans)' }}
                    />
                  )}

                  {q.question_type === 'yes_no' && (
                    <div className="flex gap-4">
                      {(['yes', 'no'] as const).map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setQuestionAnswer(q.id, val)}
                          className={`px-8 py-4 font-light text-base transition-all ${
                            questionAnswers[q.id] === val
                              ? 'bg-[#D4A83A] text-[#0A1F14]'
                              : 'border border-[#D4A83A]/50 text-[#F2E8D0] hover:border-[#D4A83A]'
                          }`}
                          style={{ fontFamily: 'var(--font-dm-sans)' }}
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
                      className="w-full px-4 py-3 bg-[#0A1F14] border border-[#D4A83A]/50 text-[#F2E8D0] focus:border-[#D4A83A] outline-none transition-colors text-sm"
                      style={{ fontFamily: 'var(--font-dm-sans)' }}
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
          {error && (
            <div className="text-center text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button or cutoff notice */}
          <div className="pt-8">
            {rsvpClosed ? (
              <p
                className="text-center text-sm text-[#F2E8D0]/60 font-light"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                RSVP submissions are now closed. Please contact Matt &amp; Raff directly.
              </p>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#D4A83A] text-[#0A1F14] font-light uppercase tracking-widest transition-all disabled:opacity-50 hover:bg-[#E8B854]"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {loading ? 'Submitting...' : 'Submit RSVP'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
