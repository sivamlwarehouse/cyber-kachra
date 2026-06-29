ALTER TABLE public.citizen_reports
  ADD COLUMN IF NOT EXISTS citizen_text text NOT NULL DEFAULT '';
