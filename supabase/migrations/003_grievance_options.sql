ALTER TABLE public.citizen_reports
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS complaint_type text NOT NULL DEFAULT 'public_place',
  ADD COLUMN IF NOT EXISTS waste_type text NOT NULL DEFAULT 'mixed';
