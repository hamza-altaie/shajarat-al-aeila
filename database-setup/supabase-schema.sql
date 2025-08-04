-- Supabase Database Schema for Family Tree Application
-- Execute this script in Supabase SQL Editor to set up the database

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  birth_date DATE,
  profile_picture TEXT,
  is_family_root BOOLEAN DEFAULT false,
  last_login TIMESTAMP WITH TIME ZONE,
  last_active TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create family_members table
CREATE TABLE IF NOT EXISTS family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  father_name TEXT NOT NULL,
  grandfather_name TEXT NOT NULL,
  surname TEXT NOT NULL,
  birthdate DATE,
  relation TEXT NOT NULL,
  parent_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  avatar TEXT,
  manual_parent_name TEXT,
  linked_parent_uid TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
CREATE INDEX IF NOT EXISTS idx_family_members_user_uid ON family_members(user_uid);
CREATE INDEX IF NOT EXISTS idx_family_members_parent_id ON family_members(parent_id);
CREATE INDEX IF NOT EXISTS idx_family_members_linked_parent ON family_members(linked_parent_uid);

-- Full text search indexes (for advanced search functionality)
CREATE INDEX IF NOT EXISTS idx_family_members_search ON family_members 
  USING gin(to_tsvector('arabic', 
    coalesce(first_name, '') || ' ' || 
    coalesce(father_name, '') || ' ' || 
    coalesce(grandfather_name, '') || ' ' || 
    coalesce(surname, '')
  ));

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (uid = current_setting('app.current_user_uid', true));

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (uid = current_setting('app.current_user_uid', true));

CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT WITH CHECK (uid = current_setting('app.current_user_uid', true));

-- RLS Policies for family_members table
CREATE POLICY "Users can view their own family members" ON family_members
  FOR SELECT USING (user_uid = current_setting('app.current_user_uid', true));

CREATE POLICY "Users can insert their own family members" ON family_members
  FOR INSERT WITH CHECK (user_uid = current_setting('app.current_user_uid', true));

CREATE POLICY "Users can update their own family members" ON family_members
  FOR UPDATE USING (user_uid = current_setting('app.current_user_uid', true));

CREATE POLICY "Users can delete their own family members" ON family_members
  FOR DELETE USING (user_uid = current_setting('app.current_user_uid', true));

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON family_members TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_members_updated_at 
  BEFORE UPDATE ON family_members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Database schema created successfully! 🎉' as message;
