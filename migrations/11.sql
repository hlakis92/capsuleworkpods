-- Grant admin to user by direct update
UPDATE user_profiles SET is_admin = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = '019c9cc6-17b6-7caf-a244-10bdbf808d06';
