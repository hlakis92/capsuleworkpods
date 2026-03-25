
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  pod_id INTEGER NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  price_base REAL NOT NULL,
  discount_percent REAL NOT NULL DEFAULT 0,
  price_final REAL NOT NULL,
  qr_token TEXT,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  stripe_session_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_pod_id ON bookings(pod_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_bookings_qr_token ON bookings(qr_token);
