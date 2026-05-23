import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseServer =
  supabaseServiceRoleKey && supabaseServiceRoleKey.length
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : supabase;

// Type definitions for database tables
export type Household = {
  id: string;
  name: string;
  slug: string;
  primary_email: string;
  secondary_email: string | null;
    mobile_numbers: Array<{ number: string; label: string }> | null;
  personal_photo_url: string | null;
  personal_message: string | null;
  plus_one_allowance: number;
  link_open_count: number;
  link_first_opened_at: string | null;
  created_at: string;
};

export type Guest = {
  id: string;
  household_id: string;
  first_name: string;
  last_name: string;
  is_child: boolean;
  dietary_requirement: 'none' | 'vegetarian' | 'vegan' | 'gluten_free' | 'dairy_free' | 'halal' | 'kosher' | 'nut_allergy' | 'shellfish_allergy' | 'other';
  dietary_other: string | null;
  rsvp_status: 'pending' | 'attending' | 'declined';
  created_at: string;
};

export type Phase = {
  id: string;
  current_phase: 'save_the_date' | 'invitation' | 'pre_wedding' | 'thank_you';
  activated_at: string;
};

export type QuestionType = 'text' | 'textarea' | 'yes_no' | 'dropdown' | 'song';

export type CustomQuestion = {
  id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[] | null;
  target_tags: string[];
  display_order: number;
  is_active: boolean;
};

export type CustomAnswer = {
  id: string;
  guest_id: string;
  question_id: string;
  answer_text: string;
  created_at: string;
};

export type Communication = {
  id: string;
  household_id: string;
  type: 'sms' | 'email';
  message: string;
  sent_at: string;
  status: string;
};

export type GuestTag = {
  id: string;
  household_id: string;
  tag: string;
};

// Helper functions
export async function getHousehold(slug: string) {
  return supabase
    .from('households')
    .select('*')
    .eq('slug', slug)
    .single();
}

export async function getHouseholdGuests(householdId: string) {
  return supabase
    .from('guests')
    .select('*')
    .eq('household_id', householdId)
    .order('is_child', { ascending: true })
    .order('first_name', { ascending: true });
}

export async function getCurrentPhase() {
  return supabase
    .from('phases')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
}

export async function getActiveCustomQuestions() {
  return supabase
    .from('custom_questions')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
}

export async function getGuestAnswers(guestId: string) {
  return supabase
    .from('custom_answers')
    .select('*')
    .eq('guest_id', guestId);
}

export async function getHouseholdTags(householdId: string) {
  return supabase
    .from('guest_tags')
    .select('*')
    .eq('household_id', householdId);
}
