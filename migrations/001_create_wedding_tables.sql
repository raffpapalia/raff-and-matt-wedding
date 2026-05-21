-- Create households table
CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  primary_email TEXT NOT NULL,
  secondary_email TEXT,
  mobile_numbers TEXT[] DEFAULT '{}',
  personal_photo_url TEXT,
  personal_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create guests table
CREATE TABLE public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  is_child BOOLEAN DEFAULT FALSE,
  dietary_requirement TEXT DEFAULT 'none' CHECK (dietary_requirement IN ('none', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'halal', 'kosher', 'nut_allergy', 'shellfish_allergy', 'other')),
  dietary_other TEXT,
  rsvp_status TEXT DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'attending', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create phases table
CREATE TABLE public.phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_phase TEXT NOT NULL CHECK (current_phase IN ('save_the_date', 'invitation', 'pre_wedding', 'thank_you')),
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create custom_questions table
CREATE TABLE public.custom_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('free_text', 'single_choice', 'multiple_choice', 'yes_no')),
  options TEXT[],
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create custom_answers table
CREATE TABLE public.custom_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.custom_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guest_id, question_id)
);

-- Create communications table
CREATE TABLE public.communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sms', 'email')),
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create guest_tags table
CREATE TABLE public.guest_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_households_slug ON public.households(slug);
CREATE INDEX idx_guests_household_id ON public.guests(household_id);
CREATE INDEX idx_guests_rsvp_status ON public.guests(rsvp_status);
CREATE INDEX idx_custom_questions_is_active ON public.custom_questions(is_active);
CREATE INDEX idx_custom_questions_display_order ON public.custom_questions(display_order);
CREATE INDEX idx_custom_answers_guest_id ON public.custom_answers(guest_id);
CREATE INDEX idx_custom_answers_question_id ON public.custom_answers(question_id);
CREATE INDEX idx_communications_household_id ON public.communications(household_id);
CREATE INDEX idx_guest_tags_household_id ON public.guest_tags(household_id);
CREATE INDEX idx_phases_created_at ON public.phases(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for households: Allow public read access, admin can update
CREATE POLICY "Enable read access for all users" ON public.households
  FOR SELECT USING (TRUE);

CREATE POLICY "Enable insert for authenticated users" ON public.households
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.households
  FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for guests: Allow public read access
CREATE POLICY "Enable read access for all users" ON public.guests
  FOR SELECT USING (TRUE);

CREATE POLICY "Enable insert for authenticated users" ON public.guests
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.guests
  FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for phases: Allow public read access
CREATE POLICY "Enable read access for all users" ON public.phases
  FOR SELECT USING (TRUE);

CREATE POLICY "Enable insert for authenticated users" ON public.phases
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for custom_questions: Allow public read access
CREATE POLICY "Enable read access for all users" ON public.custom_questions
  FOR SELECT USING (TRUE);

CREATE POLICY "Enable insert for authenticated users" ON public.custom_questions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.custom_questions
  FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for custom_answers: Allow public read access (for authenticated users)
CREATE POLICY "Enable read access for all users" ON public.custom_answers
  FOR SELECT USING (TRUE);

CREATE POLICY "Enable insert for authenticated users" ON public.custom_answers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.custom_answers
  FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for communications: Allow authenticated users only
CREATE POLICY "Enable read access for authenticated users" ON public.communications
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.communications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for guest_tags: Allow public read access
CREATE POLICY "Enable read access for all users" ON public.guest_tags
  FOR SELECT USING (TRUE);

CREATE POLICY "Enable insert for authenticated users" ON public.guest_tags
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON public.households
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON public.guests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_questions_updated_at BEFORE UPDATE ON public.custom_questions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_answers_updated_at BEFORE UPDATE ON public.custom_answers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
