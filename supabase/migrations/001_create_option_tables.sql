-- Option tables for admin-managed dropdown values
-- Each table is identical in structure. Admin can CRUD these freely.

CREATE TABLE IF NOT EXISTS flavor_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS size_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS occasion_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS theme_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS decoration_style_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: authenticated (admin) can do everything; anon can read active options
ALTER TABLE flavor_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE size_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE occasion_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE decoration_style_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access" ON flavor_options FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_read_active" ON flavor_options FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "admin_full_access" ON size_options FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_read_active" ON size_options FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "admin_full_access" ON occasion_options FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_read_active" ON occasion_options FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "admin_full_access" ON theme_options FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_read_active" ON theme_options FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "admin_full_access" ON decoration_style_options FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_read_active" ON decoration_style_options FOR SELECT TO anon USING (is_active = true);
