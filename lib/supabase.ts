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
  short_code: string;
  personal_photo_url: string | null;
  personal_message: string | null;
  thank_you_message: string | null;
  thank_you_photo_url: string | null;
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

export type PhaseName = 'save_the_date' | 'invitation' | 'pre_wedding' | 'thank_you';

export type Phase = {
  id: string;
  current_phase: PhaseName;
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
  guest_id: string | null;
  type: 'sms' | 'email';
  message: string;
  recipient_email: string | null;
  recipient_number: string | null;
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string;
  status: string;
  phase: PhaseName | null;
  created_at: string;
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

export type ScheduleItem = {
  time: string;
  label: string;
  location?: string;
  description?: string;
};

export type SectionOrderItem = {
  id: string;
  label: string;
  order: number;
  visible_phases: string[];
};

export const DEFAULT_SECTION_ORDER: SectionOrderItem[] = [
  { id: 'the_day', label: 'The Day', order: 1, visible_phases: ['invitation', 'pre_wedding'] },
  { id: 'on_the_day', label: 'On the Day', order: 2, visible_phases: ['invitation'] },
  { id: 'dress_code', label: 'Dress Code', order: 3, visible_phases: ['invitation'] },
  { id: 'practicalities', label: 'The Practicalities', order: 4, visible_phases: ['invitation', 'pre_wedding'] },
  { id: 'faqs', label: 'FAQs', order: 5, visible_phases: ['invitation', 'pre_wedding'] },
];

export type Settings = {
  wedding_date: string;
  wedding_time: string;
  venue_name: string;
  location: string;
  couple_names: string;
  tagline: string;
  dress_code_heading: string;
  dress_code_description: string;
  rsvp_cutoff_date: string;
  dietary_options: string[];
  default_plus_one_allowance: number;
  accommodation_url: string;
  photos_upload_url: string;
  registry_url: string;
  hashtag: string;
  wedding_photo_url: string;
  couple_photo_url: string;
  story_photo_url: string;
  band_photo_url: string;
  story_heading: string;
  story_body: string;
  band_quote: string;
  contact_email: string;
  ai_message_style_prompt: string;
  google_photos_url: string;
  wedding_schedule: ScheduleItem[];
  section_order: SectionOrderItem[];
  thank_you_attended_message: string;
  thank_you_not_attended_message: string;
};

export const DEFAULT_SETTINGS: Settings = {
  wedding_date: '2027-07-10',
  wedding_time: '15:00',
  venue_name: 'QT Hotel Melbourne',
  location: '133 Russell St, Melbourne, Victoria, 3000',
  couple_names: 'Matt & Raff',
  tagline: "Cancel your plans. We've made better ones.",
  dress_code_heading: 'Elevated Cocktail',
  dress_code_description:
    "We'll be dressed up and we'd love you to be too. Think glamorous cocktail — dresses and suits. Black tie welcome if that's your vibe.",
  rsvp_cutoff_date: '2027-06-01',
  dietary_options: ['Vegetarian', 'Vegan', 'Gluten free', 'Dairy free', 'Other'],
  default_plus_one_allowance: 0,
  accommodation_url: '',
  photos_upload_url: '',
  registry_url: '',
  hashtag: '#mattraff2027',
  wedding_photo_url: '',
  couple_photo_url: '',
  story_photo_url: '',
  band_photo_url: '',
  story_heading: 'Boy meets boy. Boy makes questionable dinner.',
  story_body: "A line or two in your own voice goes here — where you met, the date that shouldn't have worked but did.",
  band_quote: 'One afternoon that turns into a very good night.',
  contact_email: '',
  ai_message_style_prompt: '',
  google_photos_url: '',
  wedding_schedule: [
    { time: '3:00 PM', label: 'Arrive', location: 'QT Melbourne', description: 'Doors open — come say hello.' },
    { time: '3:30 PM', label: 'Ceremony', location: 'QT Melbourne', description: '' },
    { time: '4:00 PM', label: 'Cocktails & Canapés', location: 'QT Melbourne', description: '' },
    { time: '5:00 PM', label: 'Reception', location: 'QT Melbourne', description: '' },
  ],
  section_order: DEFAULT_SECTION_ORDER,
  thank_you_attended_message:
    'Thank you so much for celebrating with us. Your presence made our day truly special.',
  thank_you_not_attended_message:
    'We missed you on our special day. Thank you for your kind wishes — it meant the world to us.',
};

// ── Budget tracking (admin-only; tables have no anon RLS policies) ──

export type BudgetPricingMode = 'fixed' | 'per_head';

export type BudgetItem = {
  id: string;
  supplier_name: string;
  category: string;
  description: string | null;
  notes: string | null;
  pricing_mode: BudgetPricingMode;
  estimated_cost: number | null;
  agreed_cost: number | null;
  per_head_price: number | null;
  expected_heads: number | null;
  minimum_spend: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  is_booked: boolean;
  created_at: string;
  updated_at: string;
};

// A priced component of a quote. 'fixed' quantity is a literal count; 'per_head'
// quantity is the expected head count for planning, while the live actual
// recalculates from the confirmed-attending guest count.
export type BudgetLineQuantityMode = 'fixed' | 'per_head';

export type BudgetLineItem = {
  id: string;
  item_id: string;
  label: string;
  quantity_mode: BudgetLineQuantityMode;
  unit_price: number;
  quantity: number | null;
  sort_order: number;
  created_at: string;
};

export type BudgetPayment = {
  id: string;
  item_id: string;
  label: string;
  amount: number;
  due_date: string | null;
  paid_date: string | null;
  created_at: string;
};

export type BudgetSettings = {
  id: number;
  total_budget: number;
  updated_at: string;
};

// ── Day-of run sheet (admin-only tables; share page validates its token server-side) ──

export type RunsheetSection = {
  id: string;
  title: string;
  day_date: string | null;
  display_order: number;
  created_at: string;
};

export type RunsheetItem = {
  id: string;
  section_id: string;
  title: string;
  description: string | null;
  location: string | null;
  owner: string | null;
  start_time: string | null; // 'HH:MM:SS'
  end_time: string | null;
  vendor_ids: string[]; // budget_items ids, resolved app-side
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type RunsheetSettings = {
  id: number;
  share_token: string | null;
  share_enabled: boolean;
  updated_at: string;
};

export const BUDGET_CATEGORIES = [
  'Venue',
  'Catering',
  'Beverage',
  'Photography',
  'Videography',
  'Flowers',
  'Music',
  'Attire',
  'Beauty',
  'Ceremony',
  'Stationery',
  'Cake',
  'Decor',
  'Transport',
  'Accommodation',
  'Rings',
  'Honeymoon',
  'Other',
] as const;

export async function getSettings(): Promise<Settings> {
  // settings has no anon-SELECT RLS policy — the anon client silently returns
  // zero rows (no error), so this must use the service-role client.
  const { data, error } = await supabaseServer.from('settings').select('key, value');
  if (error) {
    console.error('[getSettings] Failed to fetch settings, falling back to DEFAULT_SETTINGS:', error.message);
    return DEFAULT_SETTINGS;
  }
  if (!data || data.length === 0) {
    console.warn('[getSettings] Settings table returned no rows, falling back to DEFAULT_SETTINGS');
    return DEFAULT_SETTINGS;
  }
  const map = Object.fromEntries(data.map((row: { key: string; value: unknown }) => [row.key, row.value]));
  return { ...DEFAULT_SETTINGS, ...map } as Settings;
}
