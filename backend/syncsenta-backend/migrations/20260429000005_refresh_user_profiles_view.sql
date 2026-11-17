-- Refresh user_profiles view to include Web4 columns

DROP VIEW IF EXISTS user_profiles;

CREATE OR REPLACE VIEW user_profiles AS
SELECT * FROM users;
