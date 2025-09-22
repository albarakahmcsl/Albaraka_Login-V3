/*
  # Add user profile update policy

  1. Security Changes
    - Add RLS policy to allow authenticated users to update their own profile data
    - Users can update their own `full_name` and other non-sensitive fields
    - Policy ensures users can only modify their own records

  2. Policy Details
    - Policy Name: "Users can update own profile"
    - Target Table: `users`
    - Operations: UPDATE
    - Target Roles: authenticated
    - Conditions: User can only update their own record (auth.uid() = id)
*/

-- Add policy to allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);