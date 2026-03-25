ALTER TABLE membership_settings ADD COLUMN monthly_price INTEGER DEFAULT 0;

UPDATE membership_settings SET monthly_price = 0 WHERE tier = 'free';
UPDATE membership_settings SET monthly_price = 999 WHERE tier = 'plus';
UPDATE membership_settings SET monthly_price = 1999 WHERE tier = 'pro';