
CREATE TABLE membership_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tier TEXT NOT NULL UNIQUE,
  discount_percent REAL NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO membership_settings (tier, discount_percent, description) VALUES 
  ('free', 0, 'Basic access with no discount'),
  ('plus', 10, 'Plus members enjoy 10% off all bookings'),
  ('pro', 20, 'Pro members enjoy 20% off all bookings');
