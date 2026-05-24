-- Seed default options for all option tables
-- Admin can add/edit/remove these at any time via the Options Manager

INSERT INTO flavor_options (name, sort_order) VALUES
  ('Chocolate Ganache', 1),
  ('Vanilla', 2),
  ('Red Velvet', 3),
  ('Lotus Biscoff', 4),
  ('Caramel', 5),
  ('Lemon', 6),
  ('Strawberry', 7),
  ('Pistachio', 8),
  ('Other', 99)
ON CONFLICT DO NOTHING;

INSERT INTO size_options (name, sort_order) VALUES
  ('6 inch', 1),
  ('8 inch', 2),
  ('10 inch', 3),
  ('1.5 kg', 4),
  ('3 kg', 5),
  ('2 Tier', 6),
  ('3 Tier', 7),
  ('Custom', 99)
ON CONFLICT DO NOTHING;

INSERT INTO occasion_options (name, sort_order) VALUES
  ('Birthday', 1),
  ('Wedding', 2),
  ('Anniversary', 3),
  ('Graduation', 4),
  ('Baby Shower', 5),
  ('Eid', 6),
  ('Valentine''s Day', 7),
  ('Corporate', 8),
  ('Other', 99)
ON CONFLICT DO NOTHING;

INSERT INTO theme_options (name, sort_order) VALUES
  ('No Theme', 1),
  ('Floral', 2),
  ('Minimalist', 3),
  ('Elegant', 4),
  ('Fun / Colorful', 5),
  ('Character', 6),
  ('Rustic', 7),
  ('Vintage', 8),
  ('Custom', 99)
ON CONFLICT DO NOTHING;

INSERT INTO decoration_style_options (name, sort_order) VALUES
  ('Buttercream', 1),
  ('Fondant', 2),
  ('Semi-Naked', 3),
  ('Drip', 4),
  ('Mirror Glaze', 5),
  ('Other', 99)
ON CONFLICT DO NOTHING;
