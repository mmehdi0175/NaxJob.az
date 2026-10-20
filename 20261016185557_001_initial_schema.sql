/*
# İşBaza — Azerbaijani Job Portal Initial Schema

## Overview
Creates the complete database schema for an Azerbaijani job portal with employer registration, 
vacancy management, payment tracking, quota enforcement, and admin moderation.

## New Tables
1. `categories` — Job categories (IT, Maliyyə, Səhiyyə, Təhsil, etc.) — seeded with Azerbaijani categories
2. `cities` — Azerbaijani cities — seeded with major cities
3. `companies` — Company profiles linked to employer accounts (name, VÖEN, phone, description, logo URL)
4. `payments` — Payment transactions with idempotency keys to prevent duplicate processing
5. `vacancies` — Job listings with type (standard/premium), status, pricing, expiry dates
6. `vacancy_status_history` — Complete audit trail of every vacancy status change
7. `vacancy_edit_requests` — Employer-to-admin correction workflow for published vacancies
8. `admin_settings` — Configurable publication prices and free-quota rules (singleton)
9. `admin_actions` — Admin audit log for all moderation actions

## Security
- RLS enabled on every table
- Public can read published vacancies, categories, cities, and public company profiles
- Employers can CRUD only their own vacancies and company data
- Admin role (via user_role JWT claim) gets full access to management tables
- Payment and audit tables are admin-only for reads (plus owner reads own)

## Important Notes
1. Employer accounts use Supabase auth.signUp; companies row created separately and linked via user_id.
2. The `user_role` is stored in `raw_app_meta_data` (user-immutable) to distinguish employers from admins.
3. Free quota (2/month) enforced via SECURITY DEFINER function that counts free vacancies per month.
4. Vacancies auto-expire after 30 days (status changes to 'expired' via scheduled function).
5. Payments use idempotency keys to prevent duplicate processing.
*/

-- ============================================================
-- CATEGORIES (job categories)
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_az text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  icon_name text DEFAULT 'Briefcase',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CITIES (Azerbaijani cities)
-- ============================================================
CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_az text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- COMPANIES (employer company profiles)
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  voen text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  description text,
  logo_url text,
  website_url text,
  address text,
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);

-- ============================================================
-- PAYMENTS (payment transactions) — must exist before vacancies FK
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vacancy_id uuid,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'AZN',
  vacancy_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_provider text NOT NULL DEFAULT 'test',
  provider_transaction_id text,
  idempotency_key text UNIQUE NOT NULL,
  test_mode boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  confirmed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments(idempotency_key);

-- ============================================================
-- VACANCIES (job listings)
-- ============================================================
CREATE TABLE IF NOT EXISTS vacancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  city_id uuid REFERENCES cities(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  requirements text,
  responsibilities text,
  salary_min numeric(10,2),
  salary_max numeric(10,2),
  salary_currency text NOT NULL DEFAULT 'AZN',
  salary_visible boolean NOT NULL DEFAULT true,
  employment_type text NOT NULL DEFAULT 'Tam ştat',
  experience_min int DEFAULT 0,
  education text,
  contact_person text,
  contact_email text,
  contact_phone text,
  vacancy_type text NOT NULL DEFAULT 'standard',
  status text NOT NULL DEFAULT 'draft',
  is_paid boolean NOT NULL DEFAULT false,
  is_free_quota boolean NOT NULL DEFAULT false,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  published_at timestamptz,
  expires_at timestamptz,
  views_count int NOT NULL DEFAULT 0,
  admin_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vacancies_company_id ON vacancies(company_id);
CREATE INDEX IF NOT EXISTS idx_vacancies_category_id ON vacancies(category_id);
CREATE INDEX IF NOT EXISTS idx_vacancies_city_id ON vacancies(city_id);
CREATE INDEX IF NOT EXISTS idx_vacancies_status ON vacancies(status);
CREATE INDEX IF NOT EXISTS idx_vacancies_vacancy_type ON vacancies(vacancy_type);
CREATE INDEX IF NOT EXISTS idx_vacancies_published_at ON vacancies(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_vacancies_expires_at ON vacancies(expires_at);

-- Add FK from payments to vacancies (circular reference)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payments_vacancy_id_fkey' AND table_name = 'payments'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_vacancy_id_fkey 
      FOREIGN KEY (vacancy_id) REFERENCES vacancies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- VACANCY STATUS HISTORY (audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS vacancy_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id uuid NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_role text NOT NULL DEFAULT 'employer',
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vacancy_status_history_vacancy_id ON vacancy_status_history(vacancy_id);

-- ============================================================
-- VACANCY EDIT REQUESTS (employer-to-admin correction workflow)
-- ============================================================
CREATE TABLE IF NOT EXISTS vacancy_edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id uuid NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL DEFAULT 'correction',
  requested_changes text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_response text,
  handled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_vacancy_edit_requests_vacancy_id ON vacancy_edit_requests(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_vacancy_edit_requests_status ON vacancy_edit_requests(status);

-- ============================================================
-- ADMIN SETTINGS (configurable prices and quotas — singleton row)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_vacancy_price numeric(10,2) NOT NULL DEFAULT 15.00,
  premium_vacancy_price numeric(10,2) NOT NULL DEFAULT 20.00,
  vacancy_duration_days int NOT NULL DEFAULT 30,
  free_quota_per_month int NOT NULL DEFAULT 2,
  payment_test_mode boolean NOT NULL DEFAULT true,
  payment_provider text NOT NULL DEFAULT 'test',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO admin_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM admin_settings);

-- ============================================================
-- ADMIN ACTIONS (audit log)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_type text,
  target_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at DESC);

-- ============================================================
-- TRIGGER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_companies_updated_at ON companies;
CREATE TRIGGER trigger_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_vacancies_updated_at ON vacancies;
CREATE TRIGGER trigger_vacancies_updated_at BEFORE UPDATE ON vacancies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_admin_settings_updated_at ON admin_settings;
CREATE TRIGGER trigger_admin_settings_updated_at BEFORE UPDATE ON admin_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VACANCY STATUS HISTORY TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION log_vacancy_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO vacancy_status_history (vacancy_id, old_status, new_status, changed_by, changed_by_role, note)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), 
            CASE 
              WHEN auth.jwt() ->> 'user_role' = 'admin' THEN 'admin'
              ELSE 'employer'
            END,
            COALESCE(NEW.admin_note, 'Status dəyişikliyi'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_vacancy_status_history ON vacancies;
CREATE TRIGGER trigger_vacancy_status_history AFTER UPDATE ON vacancies
  FOR EACH ROW EXECUTE FUNCTION log_vacancy_status_change();

-- ============================================================
-- AUTO-EXPIRE VACANCIES FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION expire_old_vacancies()
RETURNS int AS $$
DECLARE
  expired_count int;
BEGIN
  UPDATE vacancies 
  SET status = 'expired'
  WHERE status = 'active' 
    AND expires_at IS NOT NULL 
    AND expires_at < now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- GET EMPLOYER MONTHLY VACANCY COUNT (for quota enforcement)
-- ============================================================
CREATE OR REPLACE FUNCTION get_employer_monthly_vacancy_count(p_company_id uuid)
RETURNS int AS $$
DECLARE
  month_count int;
BEGIN
  SELECT COUNT(*) INTO month_count
  FROM vacancies
  WHERE company_id = p_company_id
    AND is_free_quota = true
    AND date_trunc('month', created_at) = date_trunc('month', now());
  RETURN month_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CHECK FREE QUOTA AVAILABILITY
-- ============================================================
CREATE OR REPLACE FUNCTION check_free_quota_available(p_company_id uuid)
RETURNS boolean AS $$
DECLARE
  quota int;
  used int;
BEGIN
  SELECT free_quota_per_month INTO quota FROM admin_settings LIMIT 1;
  SELECT get_employer_monthly_vacancy_count(p_company_id) INTO used;
  RETURN used < quota;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SEED CATEGORIES
-- ============================================================
INSERT INTO categories (name_az, slug, icon_name, sort_order) VALUES
  ('İnformasiya texnologiyaları', 'it', 'Code', 1),
  ('Maliyyə və audit', 'maliyye', 'Landmark', 2),
  ('Satış və marketinq', 'satis-ve-marketinq', 'TrendingUp', 3),
  ('İnsan resursları', 'insan-resurslari', 'Users', 4),
  ('Səhiyyə', 'sehiyye', 'HeartPulse', 5),
  ('Təhsil', 'teseil', 'GraduationCap', 6),
  ('İnşaat və memarlıq', 'insaat', 'Building', 7),
  ('Logistika və nəqliyyat', 'logistika', 'Truck', 8),
  ('İstehsalat', 'istehsalat', 'Factory', 9),
  ('Hüquq', 'huquq', 'Scale', 10),
  ('Turizm və otelçilik', 'turizm', 'Plane', 11),
  ('Restoran və ictimai iaşə', 'restoran', 'UtensilsCrossed', 12),
  ('Gözəllik və dizayn', 'gozellik', 'Palette', 13),
  ('Kənd təsərrüfatı', 'kend-teserrufati', 'Wheat', 14),
  ('Media və yayım', 'media', 'Camera', 15),
  ('Mühəndislik', 'muhandislik', 'Cog', 16),
  ('Təhlükəsizlik', 'tehlukesizlik', 'ShieldCheck', 17),
  ('Mühasibat', 'muhasibat', 'Calculator', 18),
  ('Katiblik və inzibati', 'katiblik', 'FileText', 19),
  ('Sürücülük', 'suruculuk', 'Car', 20)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED CITIES
-- ============================================================
INSERT INTO cities (name_az, slug, sort_order) VALUES
  ('Bakı', 'baki', 1),
  ('Gəncə', 'gence', 2),
  ('Sumqayıt', 'sumqayit', 3),
  ('Mingəçevir', 'mingecevir', 4),
  ('Lənkəran', 'lenkeran', 5),
  ('Naxçıvan', 'naxcivan', 6),
  ('Şirvan', 'sirvan', 7),
  ('Şamaxı', 'samaxi', 8),
  ('Quba', 'quba', 9),
  ('Xaçmaz', 'xacmaz', 10),
  ('Salyan', 'salyan', 11),
  ('Yevlax', 'yevlax', 12),
  ('Cəlilabad', 'celilabad', 13),
  ('Kürdəmir', 'kurdemir', 14),
  ('Beyləqan', 'beylaqan', 15),
  ('İsmayıllı', 'ismayilli', 16),
  ('Qəbələ', 'qebele', 17),
  ('Zaqatala', 'zaqatala', 18),
  ('Şəki', 'seki', 19),
  ('Tovuz', 'tovuz', 20),
  ('Ağdam', 'agdam', 21),
  ('Göygöl', 'goygol', 22),
  ('Ağdaş', 'agdas', 23),
  ('Bərdə', 'berde', 24),
  ('Ucar', 'ucar', 25),
  ('Sabirabad', 'sabirabad', 26),
  ('Saatlı', 'satli', 27),
  ('İmişli', 'imisli', 28),
  ('Neftçala', 'neftcala', 29),
  ('Masallı', 'masalli', 30),
  ('Hacıqabul', 'haciqabul', 31),
  ('Daşkəsən', 'daskesen', 32),
  ('Gədəbəy', 'gedebey', 33),
  ('Oğuz', 'oguz', 34),
  ('Qusar', 'qusar', 35),
  ('Siyəzən', 'siyezen', 36),
  ('Astara', 'astara', 37),
  ('Balakən', 'balaken', 38),
  ('Tərtər', 'terter', 39)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- CATEGORIES: public read
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_public_read" ON categories;
CREATE POLICY "categories_public_read" ON categories FOR SELECT
  TO anon, authenticated USING (true);

-- CITIES: public read
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cities_public_read" ON cities;
CREATE POLICY "cities_public_read" ON cities FOR SELECT
  TO anon, authenticated USING (true);

-- COMPANIES: public read for active companies, owner CRUD
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "companies_public_read" ON companies;
CREATE POLICY "companies_public_read" ON companies FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "companies_owner_select" ON companies;
CREATE POLICY "companies_owner_select" ON companies FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "companies_owner_insert" ON companies;
CREATE POLICY "companies_owner_insert" ON companies FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "companies_owner_update" ON companies;
CREATE POLICY "companies_owner_update" ON companies FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- VACANCIES: public read for active; owner sees own; admin sees all
ALTER TABLE vacancies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vacancies_public_read" ON vacancies;
CREATE POLICY "vacancies_public_read" ON vacancies FOR SELECT
  TO anon, authenticated USING (status = 'active');

DROP POLICY IF EXISTS "vacancies_owner_select" ON vacancies;
CREATE POLICY "vacancies_owner_select" ON vacancies FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = vacancies.company_id AND companies.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "vacancies_owner_insert" ON vacancies;
CREATE POLICY "vacancies_owner_insert" ON vacancies FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = vacancies.company_id AND companies.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "vacancies_owner_update" ON vacancies;
CREATE POLICY "vacancies_owner_update" ON vacancies FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = vacancies.company_id AND companies.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = vacancies.company_id AND companies.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "vacancies_admin_all" ON vacancies;
CREATE POLICY "vacancies_admin_all" ON vacancies FOR ALL
  TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');

-- PAYMENTS: owner can see/insert own, admin all
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_owner_select" ON payments;
CREATE POLICY "payments_owner_select" ON payments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = payments.company_id AND companies.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "payments_owner_insert" ON payments;
CREATE POLICY "payments_owner_insert" ON payments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = payments.company_id AND companies.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "payments_admin_all" ON payments;
CREATE POLICY "payments_admin_all" ON payments FOR ALL
  TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');

-- VACANCY STATUS HISTORY: owner + admin can read, any authenticated can insert (trigger)
ALTER TABLE vacancy_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vacancy_history_owner_read" ON vacancy_status_history;
CREATE POLICY "vacancy_history_owner_read" ON vacancy_status_history FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM vacancies v JOIN companies c ON c.id = v.company_id 
     WHERE v.id = vacancy_status_history.vacancy_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "vacancy_history_admin_read" ON vacancy_status_history;
CREATE POLICY "vacancy_history_admin_read" ON vacancy_status_history FOR SELECT
  TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin');

DROP POLICY IF EXISTS "vacancy_history_insert" ON vacancy_status_history;
CREATE POLICY "vacancy_history_insert" ON vacancy_status_history FOR INSERT
  TO authenticated WITH CHECK (true);

-- VACANCY EDIT REQUESTS: owner CRUD own, admin all
ALTER TABLE vacancy_edit_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "edit_requests_owner_read" ON vacancy_edit_requests;
CREATE POLICY "edit_requests_owner_read" ON vacancy_edit_requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = vacancy_edit_requests.company_id AND companies.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "edit_requests_owner_insert" ON vacancy_edit_requests;
CREATE POLICY "edit_requests_owner_insert" ON vacancy_edit_requests FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = vacancy_edit_requests.company_id AND companies.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "edit_requests_admin_all" ON vacancy_edit_requests;
CREATE POLICY "edit_requests_admin_all" ON vacancy_edit_requests FOR ALL
  TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');

-- ADMIN SETTINGS: public read for prices, admin writes
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_settings_public_read" ON admin_settings;
CREATE POLICY "admin_settings_public_read" ON admin_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_settings_admin_all" ON admin_settings;
CREATE POLICY "admin_settings_admin_all" ON admin_settings FOR ALL
  TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');

-- ADMIN ACTIONS: admin only
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_actions_admin_all" ON admin_actions;
CREATE POLICY "admin_actions_admin_all" ON admin_actions FOR ALL
  TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');
