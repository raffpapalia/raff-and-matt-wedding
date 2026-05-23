'use client';

import { useState } from 'react';
import type { Household, Guest } from '@/lib/supabase';

interface RSVPPhaseProps {
  household: Household;
  guests: Guest[];
}

interface GuestFormData {
  [guestId: string]: {
    attending: boolean;
    hasDietary: boolean;
    dietary_requirement: string;
    dietary_other: string;
  };
}

const DIETARY_OPTIONS = [
  { value: 'none', label: 'No preference' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten_free', label: 'Gluten free' },
  { value: 'dairy_free', label: 'Dairy free' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
  { value: 'other', label: 'Other' },
];

export default function RSVPPhase({ household, guests }: RSVPPhaseProps) {
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

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household_id: household.id,
          responses: Object.entries(formData).map(([guestId, data]) => ({
            guest_id: guestId,
            rsvp_status: data.attending ? 'attending' : 'declined',
            dietary_requirement: data.hasDietary ? data.dietary_requirement : 'none',
            dietary_other: data.hasDietary && data.dietary_requirement === 'other' ? (data.dietary_other || null) : null,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit RSVP');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const allAttending = Object.values(formData).every(data => data.attending);
  const householdName = guests.length === 1
    ? `${guests[0].first_name}`
    : `${guests.map(g => g.first_name).join(' & ')}`;

  if (submitted) {
    return (
      <div className="relative w-full h-screen flex items-center justify-center overflow-hidden bg-[#0A1F14]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-900/5 to-transparent opacity-100" />
        <div className="relative z-10 w-full max-w-2xl px-4 sm:px-6 text-center">
          <h2 className="text-5xl sm:text-6xl font-light text-[#F2E8D0] mb-8" style={{ fontFamily: 'var(--font-cinzel)' }}>
            Thank you!
          </h2>
          <p className="text-xl sm:text-2xl text-white/80 mb-6 font-light" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {allAttending
              ? "We can't wait to celebrate with you!"
              : "Thank you for letting us know. We appreciate you taking the time to respond."}
          </p>
          <p className="text-base sm:text-lg text-[#D4A83A]/80 font-light" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            More details will be sent your way soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-[#0A1F14] py-12 sm:py-16">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-900/5 to-transparent opacity-100" />
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"><filter id=\"noise\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" seed=\"1\"/></filter><rect width=\"100\" height=\"100\" fill=\"%23fff\" filter=\"url(%23noise)\"/></svg>')"
      }} />

      <div className="relative z-10 w-full max-w-2xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8 sm:mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light text-[#F2E8D0] mb-4" style={{ fontFamily: 'var(--font-cinzel)' }}>
            {householdName}
          </h1>
          <div className="h-px w-24 bg-[#D4A83A] mx-auto mb-6" />
          <p className="text-sm uppercase tracking-widest text-[#D4A83A]" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Please confirm your attendance
          </p>
        </div>

        {/* RSVP Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {guests.map((guest, idx) => (
            <div key={guest.id} className="border-b border-[#D4A83A]/20 pb-8 last:border-b-0">
              <h3 className="text-2xl text-[#F2E8D0] mb-6 font-light" style={{ fontFamily: 'var(--font-cinzel)' }}>
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

                  {/* Dietary Dropdown - Show only if they have requirements */}
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

          {/* Error Message */}
          {error && (
            <div className="text-center text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-8">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#D4A83A] text-[#0A1F14] font-light uppercase tracking-widest transition-all disabled:opacity-50 hover:bg-[#E8B854]"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {loading ? 'Submitting...' : 'Submit RSVP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
