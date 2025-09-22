/*
  # Fix is_admin function to use correct table joins

  1. Function Updates
    - Drop existing `is_admin` function if it exists
    - Create new `is_admin` function with correct table joins
    - Function now properly joins users → user_roles → roles tables
    - Fixes "column u.role_id does not exist" error

  2. Security
    - Grant execute permissions to authenticated role
    - Function remains secure and only checks for 'admin' role

  3. Changes
    - Replaces incorrect direct join between users and roles
    - Uses proper many-to-many relationship through user_roles table
    - Maintains same function signature for compatibility
*/

-- Drop existing is_admin function if it exists
DROP FUNCTION IF EXISTS is_admin(uuid);

-- Create the corrected is_admin function
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.users u
    JOIN public.user_roles ur ON u.id = ur.user_id
    JOIN public.roles r ON ur.role_id = r.id
    WHERE u.id = user_id AND r.name = 'admin'
  );
$$;

-- Grant execute permissions to authenticated role
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;