-- Seed locations (upsert)
INSERT INTO locations (id, name, slug, address, city, state, latitude, longitude, image_url, description, open_hours, created_at, updated_at) VALUES
('a1000000-0000-0000-0000-000000000001', 'Minneapolis-Saint Paul International Airport', 'msp-airport', '4300 Glumack Dr', 'Minneapolis', 'MN', 44.8848, -93.2223, 'https://picsum.photos/seed/msp-airport/800/500', 'Private work pods in Terminal 1 and Terminal 2. Perfect for layovers and remote work.', 'Daily 5:00 AM - 11:00 PM', NOW(), NOW()),
('a1000000-0000-0000-0000-000000000002', 'Mall of America', 'mall-of-america', '60 E Broadway', 'Bloomington', 'MN', 44.8535, -93.2422, 'https://picsum.photos/seed/mallofamerica/800/500', 'Quiet work pods in the heart of the Mall of America.', 'Mon-Sat 10:00 AM - 9:30 PM, Sun 11:00 AM - 7:00 PM', NOW(), NOW()),
('a1000000-0000-0000-0000-000000000003', 'Downtown Minneapolis', 'downtown-minneapolis', '800 Nicollet Mall', 'Minneapolis', 'MN', 44.9778, -93.2650, 'https://picsum.photos/seed/dtmpls/800/500', 'Premium pods in the heart of downtown Minneapolis.', 'Mon-Fri 7:00 AM - 8:00 PM, Sat-Sun 9:00 AM - 5:00 PM', NOW(), NOW()),
('a1000000-0000-0000-0000-000000000004', 'St. Paul Union Depot', 'st-paul-union-depot', '214 4th St E', 'Saint Paul', 'MN', 44.9472, -93.0863, 'https://picsum.photos/seed/stpaulunion/800/500', 'Historic Union Depot with modern work pods for commuters.', 'Daily 6:00 AM - 10:00 PM', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  image_url = EXCLUDED.image_url,
  description = EXCLUDED.description,
  open_hours = EXCLUDED.open_hours,
  updated_at = NOW();

-- Seed pods (upsert)
INSERT INTO pods (id, location_id, name, slug, type, price_per_hour, amenities, image_url, status, is_available, is_out_of_service, created_at, updated_at) VALUES
-- MSP Airport
('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Gate Pod A1', 'msp-gate-a1', 'standard', 15.00, ARRAY['WiFi','Power Outlets','USB Charging','Climate Control'], 'https://picsum.photos/seed/pod-msp-a1/600/400', 'available', true, false, NOW(), NOW()),
('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Executive Suite E1', 'msp-exec-e1', 'executive', 45.00, ARRAY['WiFi','Power Outlets','USB Charging','Climate Control','Privacy Screen','Noise Cancelling','Desk','Monitor'], 'https://picsum.photos/seed/pod-msp-e1/600/400', 'available', true, false, NOW(), NOW()),
('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Quiet Zone Q1', 'msp-quiet-q1', 'quiet', 20.00, ARRAY['WiFi','Power Outlets','USB Charging','Noise Cancelling','Privacy Screen'], 'https://picsum.photos/seed/pod-msp-q1/600/400', 'available', true, false, NOW(), NOW()),
('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'Premium Pod P1', 'msp-premium-p1', 'premium', 30.00, ARRAY['WiFi','Power Outlets','USB Charging','Climate Control','Desk','Monitor'], 'https://picsum.photos/seed/pod-msp-p1/600/400', 'available', true, false, NOW(), NOW()),
-- Mall of America
('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'Standard Pod S1', 'moa-standard-s1', 'standard', 15.00, ARRAY['WiFi','Power Outlets','USB Charging'], 'https://picsum.photos/seed/pod-moa-s1/600/400', 'available', true, false, NOW(), NOW()),
('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'Family Pod F1', 'moa-family-f1', 'family', 25.00, ARRAY['WiFi','Power Outlets','USB Charging','Climate Control'], 'https://picsum.photos/seed/pod-moa-f1/600/400', 'available', true, false, NOW(), NOW()),
('b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 'Premium Pod P2', 'moa-premium-p2', 'premium', 30.00, ARRAY['WiFi','Power Outlets','USB Charging','Climate Control','Desk','Privacy Screen'], 'https://picsum.photos/seed/pod-moa-p2/600/400', 'available', true, false, NOW(), NOW()),
('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000002', 'Quiet Zone Q2', 'moa-quiet-q2', 'quiet', 20.00, ARRAY['WiFi','Power Outlets','Noise Cancelling','Privacy Screen'], 'https://picsum.photos/seed/pod-moa-q2/600/400', 'available', true, false, NOW(), NOW()),
-- Downtown Minneapolis
('b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000003', 'Executive Suite E2', 'dtmpls-exec-e2', 'executive', 45.00, ARRAY['WiFi','Power Outlets','USB Charging','Climate Control','Privacy Screen','Noise Cancelling','Desk','Monitor'], 'https://picsum.photos/seed/pod-dtmpls-e2/600/400', 'available', true, false, NOW(), NOW()),
('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000003', 'Standard Pod S2', 'dtmpls-standard-s2', 'standard', 15.00, ARRAY['WiFi','Power Outlets','USB Charging'], 'https://picsum.photos/seed/pod-dtmpls-s2/600/400', 'available', true, false, NOW(), NOW()),
('b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000003', 'Premium Pod P3', 'dtmpls-premium-p3', 'premium', 35.00, ARRAY['WiFi','Power Outlets','USB Charging','Climate Control','Desk','Monitor'], 'https://picsum.photos/seed/pod-dtmpls-p3/600/400', 'available', true, false, NOW(), NOW()),
('b1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000003', 'Quiet Zone Q3', 'dtmpls-quiet-q3', 'quiet', 20.00, ARRAY['WiFi','Power Outlets','Noise Cancelling','Privacy Screen'], 'https://picsum.photos/seed/pod-dtmpls-q3/600/400', 'available', true, false, NOW(), NOW()),
('b1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000003', 'Family Pod F2', 'dtmpls-family-f2', 'family', 25.00, ARRAY['WiFi','Power Outlets','USB Charging','Climate Control'], 'https://picsum.photos/seed/pod-dtmpls-f2/600/400', 'available', true, false, NOW(), NOW()),
-- St. Paul Union Depot
('b1000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000004', 'Standard Pod S3', 'stpaul-standard-s3', 'standard', 15.00, ARRAY['WiFi','Power Outlets','USB Charging'], 'https://picsum.photos/seed/pod-stpaul-s3/600/400', 'available', true, false, NOW(), NOW()),
('b1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000004', 'Executive Suite E3', 'stpaul-exec-e3', 'executive', 45.00, ARRAY['WiFi','Power Outlets','USB Charging','Climate Control','Privacy Screen','Noise Cancelling','Desk','Monitor'], 'https://picsum.photos/seed/pod-stpaul-e3/600/400', 'available', true, false, NOW(), NOW()),
('b1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000004', 'Premium Pod P4', 'stpaul-premium-p4', 'premium', 30.00, ARRAY['WiFi','Power Outlets','USB Charging','Climate Control','Desk'], 'https://picsum.photos/seed/pod-stpaul-p4/600/400', 'available', true, false, NOW(), NOW()),
('b1000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000004', 'Quiet Zone Q4', 'stpaul-quiet-q4', 'quiet', 20.00, ARRAY['WiFi','Power Outlets','Noise Cancelling'], 'https://picsum.photos/seed/pod-stpaul-q4/600/400', 'available', true, false, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  type = EXCLUDED.type,
  price_per_hour = EXCLUDED.price_per_hour,
  amenities = EXCLUDED.amenities,
  image_url = EXCLUDED.image_url,
  status = EXCLUDED.status,
  is_available = EXCLUDED.is_available,
  is_out_of_service = EXCLUDED.is_out_of_service,
  updated_at = NOW();

-- Seed membership settings (upsert)
INSERT INTO membership_settings (id, tier, discount_percent, description, monthly_price, updated_at) VALUES
('c1000000-0000-0000-0000-000000000001', 'free', 0, 'Basic access with no discount', 0, NOW()),
('c1000000-0000-0000-0000-000000000002', 'plus', 10, '10% discount on all bookings', 9.99, NOW()),
('c1000000-0000-0000-0000-000000000003', 'pro', 20, '20% discount on all bookings', 19.99, NOW())
ON CONFLICT (tier) DO UPDATE SET
  discount_percent = EXCLUDED.discount_percent,
  description = EXCLUDED.description,
  monthly_price = EXCLUDED.monthly_price,
  updated_at = NOW();
