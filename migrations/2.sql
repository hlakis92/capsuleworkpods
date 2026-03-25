
CREATE TABLE pods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  price_per_hour REAL NOT NULL,
  amenities TEXT,
  image_url TEXT,
  is_out_of_service BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pods_location_id ON pods(location_id);
CREATE INDEX idx_pods_slug ON pods(slug);
CREATE INDEX idx_pods_type ON pods(type);
