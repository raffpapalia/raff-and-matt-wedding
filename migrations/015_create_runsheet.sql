-- 015: Day-of run sheet — sections, items, and share-link settings.
--
-- Sections group items (Getting Ready, Ceremony, Reception…) and may carry an
-- optional date so the canvas can span multiple days. Items auto-sort by
-- start_time (nulls last) then display_order. vendor_ids holds budget_items
-- ids resolved app-side (single-admin tool; dangling ids are filtered client-side).
--
-- Like the budget tables: RLS enabled with NO policies — service-role only.
-- The public share page validates its token server-side, so no anon access.

-- ── runsheet_sections ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.runsheet_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  day_date DATE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── runsheet_items ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.runsheet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.runsheet_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  owner TEXT,
  start_time TIME,
  end_time TIME,
  vendor_ids UUID[] NOT NULL DEFAULT '{}',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS runsheet_items_section_id_idx ON public.runsheet_items(section_id);

CREATE TRIGGER update_runsheet_items_updated_at BEFORE UPDATE ON public.runsheet_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── runsheet_settings: single row (id = 1) for the vendor share link ─────────
CREATE TABLE IF NOT EXISTS public.runsheet_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  share_token TEXT,
  share_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.runsheet_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── budget suppliers gain optional contact details (shown on the run sheet) ──
ALTER TABLE public.budget_items
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.runsheet_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runsheet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runsheet_settings ENABLE ROW LEVEL SECURITY;
