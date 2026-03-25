
-- Seed locations
INSERT INTO locations (slug, name, address, city, state, lat, lng, image_url, description, open_hours) VALUES
('msp-airport', 'MSP Airport Terminal 1', '4300 Glumack Dr', 'Minneapolis', 'MN', 44.8848, -93.2223, 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80', 'Rest between flights at Minneapolis-Saint Paul International Airport. Located in Terminal 1, Concourse G after security for easy access during layovers.', '5:00 AM - 12:00 AM'),
('downtown-mpls', 'Downtown Minneapolis', '50 S 6th Street', 'Minneapolis', 'MN', 44.9778, -93.2650, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80', 'Located in the heart of downtown Minneapolis near the Skyway system. Perfect for business travelers and remote workers seeking a quiet, productive space.', '24/7'),
('mall-of-america', 'Mall of America', '60 E Broadway', 'Bloomington', 'MN', 44.8549, -93.2422, 'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=800&q=80', 'Take a break from shopping at America''s largest mall. Our pods offer a quiet escape in the midst of all the excitement.', '10:00 AM - 9:00 PM'),
('st-paul', 'St. Paul Union Depot', '214 4th Street E', 'St. Paul', 'MN', 44.9480, -93.0860, 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80', 'Historic Union Depot meets modern comfort. Perfect for light rail commuters and visitors exploring downtown St. Paul.', '6:00 AM - 10:00 PM'),
('rochester', 'Rochester Mayo Clinic Area', '125 1st Avenue SW', 'Rochester', 'MN', 44.0234, -92.4631, 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80', 'Peaceful rest pods near Mayo Clinic. Ideal for patients, families, and medical professionals seeking a quiet space to recharge.', '24/7');

-- Seed pods for MSP Airport (location_id = 1)
INSERT INTO pods (location_id, slug, name, type, price_per_hour, amenities, image_url, is_out_of_service) VALUES
(1, 'sky-pod-1', 'Sky Pod 1', 'premium', 22, '["WiFi", "USB Charging", "Reading Light", "Climate Control", "Noise Cancellation"]', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80', 0),
(1, 'sky-pod-2', 'Sky Pod 2', 'premium', 22, '["WiFi", "USB Charging", "Reading Light", "Climate Control", "Noise Cancellation"]', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80', 0),
(1, 'executive-suite-1', 'Executive Suite 1', 'executive', 35, '["WiFi", "USB Charging", "Reading Light", "Climate Control", "Noise Cancellation", "Shower Access", "Lounge Chair"]', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80', 0);

-- Seed pods for Downtown Minneapolis (location_id = 2)
INSERT INTO pods (location_id, slug, name, type, price_per_hour, amenities, image_url, is_out_of_service) VALUES
(2, 'pod-a1', 'Pod A1', 'standard', 12, '["WiFi", "USB Charging", "Reading Light"]', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', 0),
(2, 'pod-a2', 'Pod A2', 'standard', 12, '["WiFi", "USB Charging", "Reading Light"]', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', 0),
(2, 'pod-b1', 'Pod B1', 'premium', 18, '["WiFi", "USB Charging", "Reading Light", "Climate Control", "Sound System"]', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80', 0),
(2, 'pod-c1', 'Pod C1', 'executive', 28, '["WiFi", "USB Charging", "Reading Light", "Climate Control", "Sound System", "Monitor", "Privacy Glass"]', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80', 1);

-- Seed pods for Mall of America (location_id = 3)
INSERT INTO pods (location_id, slug, name, type, price_per_hour, amenities, image_url, is_out_of_service) VALUES
(3, 'rest-pod-1', 'Rest Pod 1', 'standard', 14, '["WiFi", "USB Charging", "Reading Light", "Climate Control"]', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', 0),
(3, 'rest-pod-2', 'Rest Pod 2', 'standard', 14, '["WiFi", "USB Charging", "Reading Light", "Climate Control"]', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', 0),
(3, 'premium-pod-1', 'Premium Pod 1', 'premium', 20, '["WiFi", "USB Charging", "Reading Light", "Climate Control", "Sound System", "Massage Chair"]', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80', 0);

-- Seed pods for St. Paul Union Depot (location_id = 4)
INSERT INTO pods (location_id, slug, name, type, price_per_hour, amenities, image_url, is_out_of_service) VALUES
(4, 'work-pod-1', 'Work Pod 1', 'standard', 12, '["WiFi", "USB Charging", "Desk", "Ergonomic Chair"]', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', 0),
(4, 'work-pod-2', 'Work Pod 2', 'standard', 12, '["WiFi", "USB Charging", "Desk", "Ergonomic Chair"]', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', 0),
(4, 'focus-room-1', 'Focus Room 1', 'premium', 22, '["WiFi", "USB Charging", "Desk", "Ergonomic Chair", "4K Monitor", "Keyboard", "Standing Desk Option"]', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80', 0);

-- Seed pods for Rochester Mayo Clinic Area (location_id = 5)
INSERT INTO pods (location_id, slug, name, type, price_per_hour, amenities, image_url, is_out_of_service) VALUES
(5, 'comfort-pod-1', 'Comfort Pod 1', 'standard', 10, '["WiFi", "USB Charging", "Reading Light", "Blackout Blinds"]', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', 0),
(5, 'comfort-pod-2', 'Comfort Pod 2', 'standard', 10, '["WiFi", "USB Charging", "Reading Light", "Blackout Blinds"]', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', 0),
(5, 'wellness-pod-1', 'Wellness Pod 1', 'premium', 18, '["WiFi", "USB Charging", "Reading Light", "Climate Control", "White Noise", "Aromatherapy"]', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80', 0),
(5, 'wellness-pod-2', 'Wellness Pod 2', 'premium', 18, '["WiFi", "USB Charging", "Reading Light", "Climate Control", "White Noise", "Aromatherapy"]', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80', 0);
