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
  personal_photo_url: string | null;
  personal_message: string | null;
  thank_you_message: string | null;
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
  email: string | null;
  mobile: string | null;
  comms_email: boolean;
  comms_sms: boolean;
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
  guest_id: string;
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

export type Faq = {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

export type Settings = {
  wedding_date: string;
  wedding_time: string;
  venue_name: string;
  location: string;
  couple_names: string;
  tagline: string;
  invitation_footer: string;
  rsvp_cutoff_date: string;
  dietary_options: string[];
  default_plus_one_allowance: number;
  accommodation_url: string;
  photos_upload_url: string;
  registry_url: string;
  hashtag: string;
  wedding_photo_url: string;
  google_photos_url: string;
};

export const DEFAULT_SETTINGS: Settings = {
  wedding_date: '2027-07-12',
  wedding_time: '6:00 PM',
  venue_name: 'QT Hotel Melbourne',
  location: 'Melbourne, Victoria',
  couple_names: 'Matt & Raff',
  tagline: "Cancel your plans. We've made better ones.",
  invitation_footer: 'Full invitation coming soon',
  rsvp_cutoff_date: '2027-06-01',
  dietary_options: ['Vegetarian', 'Vegan', 'Gluten free', 'Dairy free', 'Halal', 'Kosher', 'Other'],
  default_plus_one_allowance: 0,
  accommodation_url: '',
  photos_upload_url: '',
  registry_url: '',
  hashtag: '#mattraff2027',
  wedding_photo_url: '',
  google_photos_url: '',
};

export async function getSettings(): Promise<Settings> {
  const { data } = await supabase.from('settings').select('key, value');
  if (!data || data.length === 0) return DEFAULT_SETTINGS;
  const map = Object.fromEntries(data.map((row: { key: string; value: unknown }) => [row.key, row.value]));
  return { ...DEFAULT_SETTINGS, ...map } as Settings;
}
