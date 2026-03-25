-- Grant admin privileges to user in production
INSERT INTO user_profiles (user_id, membership_tier, is_admin, created_at, updated_at)
VALUES ('019c9cc6-17b6-7caf-a244-10bdbf808d06', 'free', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(user_id) DO UPDATE SET is_admin = 1, updated_at = CURRENT_TIMESTAMP;
