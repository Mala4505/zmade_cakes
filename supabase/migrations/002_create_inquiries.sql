-- Auto-update trigger function (shared across tables)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Main inquiries table
CREATE TABLE IF NOT EXISTS inquiries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer info (no account needed)
  customer_name         TEXT NOT NULL,
  customer_phone        TEXT NOT NULL,

  -- Cake details (free-text values from option tables)
  cake_size             TEXT NOT NULL,
  flavor                TEXT NOT NULL,
  occasion              TEXT NOT NULL DEFAULT '',
  theme                 TEXT NOT NULL DEFAULT '',
  decoration_style      TEXT NOT NULL,
  message_on_cake       TEXT NOT NULL DEFAULT '',
  quantity              INT NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 50),
  special_requirements  TEXT NOT NULL DEFAULT '',

  -- Event details
  event_date            DATE NOT NULL,
  pickup_time           TIME,

  -- Delivery
  delivery_type         TEXT NOT NULL DEFAULT 'pickup'
    CHECK (delivery_type IN ('pickup', 'delivery')),

  -- Status lifecycle
  status                TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'awaiting_confirmation', 'confirmed',
      'in_progress', 'ready', 'delivered', 'cancelled'
    )),

  -- Admin management fields
  admin_price           DECIMAL(8,3) CHECK (admin_price > 0),
  advance_amount        DECIMAL(8,3) CHECK (advance_amount > 0),
  advance_paid          BOOLEAN NOT NULL DEFAULT false,
  payment_method        TEXT NOT NULL DEFAULT ''
    CHECK (payment_method IN ('', 'cash', 'wamd')),
  admin_notes           TEXT NOT NULL DEFAULT '',
  priority              INT NOT NULL DEFAULT 0
    CHECK (priority IN (0, 1, 2)),

  -- Customer confirmation via unique link
  confirmation_token    UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  customer_confirmed    BOOLEAN NOT NULL DEFAULT false,
  customer_confirmed_at TIMESTAMPTZ,
  customer_comments     TEXT NOT NULL DEFAULT '',

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_event_date ON inquiries(event_date);
CREATE INDEX IF NOT EXISTS idx_inquiries_priority ON inquiries(priority DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_confirmation_token ON inquiries(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);

-- Delivery addresses (Kuwait format)
CREATE TABLE IF NOT EXISTS delivery_addresses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id  UUID NOT NULL UNIQUE REFERENCES inquiries(id) ON DELETE CASCADE,
  governorate TEXT NOT NULL CHECK (governorate IN (
    'capital', 'hawalli', 'farwaniyah', 'ahmadi', 'jahra', 'mubarak_al_kabeer'
  )),
  area        TEXT NOT NULL,
  block       TEXT NOT NULL,
  street      TEXT NOT NULL,
  house_no    TEXT NOT NULL,
  extra_notes TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_addresses ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_full_access" ON inquiries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "admin_full_access" ON delivery_addresses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public: NO direct RLS access — all public access goes through service-role route handlers
-- which validate the token in application code before querying
