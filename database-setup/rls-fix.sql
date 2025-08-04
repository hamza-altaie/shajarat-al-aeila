-- Fix for RLS policies to work with Firebase authentication
-- Execute this in Supabase SQL Editor to fix authentication issues

-- Create function to set current user UID for RLS
CREATE OR REPLACE FUNCTION set_current_user_uid(user_uid text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_uid', user_uid, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION set_current_user_uid(text) TO anon, authenticated;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
DROP POLICY IF EXISTS "Users can view their own family members" ON family_members;
DROP POLICY IF EXISTS "Users can insert their own family members" ON family_members;
DROP POLICY IF EXISTS "Users can update their own family members" ON family_members;
DROP POLICY IF EXISTS "Users can delete their own family members" ON family_members;

-- Create more permissive policies for testing (you can tighten these later)
CREATE POLICY "Allow all operations on users" ON users
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on family_members" ON family_members
  FOR ALL USING (true);

-- Alternative: More secure policies using the function
-- Uncomment these and comment out the permissive policies above once testing is complete

/*
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
*/

SELECT 'RLS policies updated successfully! 🎉' as message;
