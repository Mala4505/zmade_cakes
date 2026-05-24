CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id      UUID NOT NULL UNIQUE REFERENCES inquiries(id) ON DELETE CASCADE,
  tracking_token  UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status          TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'in_progress', 'ready', 'delivered', 'cancelled')),
  final_price     DECIMAL(8,3) NOT NULL CHECK (final_price > 0),
  delivery_type   TEXT NOT NULL CHECK (delivery_type IN ('pickup', 'delivery')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON orders(tracking_token);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_full_access" ON orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public: no direct RLS access — route handlers use service role key with token validation
