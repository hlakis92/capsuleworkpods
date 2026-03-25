
CREATE TABLE locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  image_url TEXT,
  description TEXT,
  open_hours TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_locations_slug ON locations(slug);
CREATE INDEX idx_locations_city ON locations(city);
