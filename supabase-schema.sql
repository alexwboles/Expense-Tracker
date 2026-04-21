-- ═══════════════════════════════════════════════
--  SUPABASE SCHEMA — Boles West Run Ranch
--  Expense Tracker Database Setup
-- ═══════════════════════════════════════════════

-- ─── USERS TABLE ───
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'worker'
              CHECK (role IN ('owner', 'manager', 'worker', 'accountant')),
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'inactive')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── EXPENSES TABLE ───
CREATE TABLE IF NOT EXISTS public.expenses (
  id              TEXT PRIMARY KEY,
  date            DATE NOT NULL,
  vendor          TEXT,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  category        TEXT,
  subcategory     TEXT,
  tax_line        TEXT,
  payment_method  TEXT DEFAULT 'card',
  check_number    TEXT,
  description     TEXT,
  tags            TEXT,
  receipt_url     TEXT,
  receipt_path    TEXT,
  user_id         UUID REFERENCES public.users(id),
  user_name       TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_expenses_date     ON public.expenses (date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses (category);
CREATE INDEX IF NOT EXISTS idx_expenses_tax_line ON public.expenses (tax_line);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor   ON public.expenses (vendor);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id  ON public.expenses (user_id);

-- ─── CUSTOM CATEGORIES TABLE ───
CREATE TABLE IF NOT EXISTS public.custom_categories (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  icon            TEXT DEFAULT '📎',
  color           TEXT DEFAULT '#9ca3af',
  default_tax_line TEXT,
  subcategories   JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── SETTINGS TABLE ───
CREATE TABLE IF NOT EXISTS public.settings (
  id                  TEXT PRIMARY KEY DEFAULT 'main',
  farm_name           TEXT DEFAULT 'Boles West Run Ranch',
  ein                 TEXT,
  fiscal_year_start   INTEGER DEFAULT 1,
  default_payment     TEXT DEFAULT 'card',
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings row
INSERT INTO public.settings (id, farm_name)
VALUES ('main', 'Boles West Run Ranch')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════
--  ROW LEVEL SECURITY (RLS)
--  Ensures users can only access their farm's data
-- ═══════════════════════════════════════════════

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Users: authenticated users can read all, update own
CREATE POLICY "Users can view all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Expenses: all authenticated users can CRUD
CREATE POLICY "Authenticated users can view all expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert expenses"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update expenses"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete expenses"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (true);

-- Custom Categories: all authenticated can CRUD
CREATE POLICY "Authenticated users can manage categories"
  ON public.custom_categories FOR ALL
  TO authenticated
  USING (true);

-- Settings: all authenticated can read/update
CREATE POLICY "Authenticated users can manage settings"
  ON public.settings FOR ALL
  TO authenticated
  USING (true);

-- ═══════════════════════════════════════════════
--  STORAGE BUCKET FOR RECEIPTS
-- ═══════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload receipts
CREATE POLICY "Authenticated users can upload receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'receipts');

-- Allow public read access to receipts
CREATE POLICY "Public can view receipts"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'receipts');

-- Allow authenticated users to delete own receipts
CREATE POLICY "Authenticated users can delete receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'receipts');

-- ═══════════════════════════════════════════════
--  REALTIME — Enable for multi-user live sync
-- ═══════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;

-- ═══════════════════════════════════════════════
--  AUTO-UPDATE updated_at TRIGGER
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
