/*
  # Create account types table for Islamic finance

  1. New Tables
    - `account_types`
      - `id` (uuid, primary key)
      - `name` (text, unique) - e.g., "Hajj Account", "Savings Account"
      - `description` (text, optional) - Description of the account type
      - `bank_account_id` (uuid, foreign key) - Associated bank account
      - `processing_fee` (decimal) - Fee charged for transactions
      - `is_member_account` (boolean) - Whether holders are considered "members"
      - `can_take_loan` (boolean) - Whether account holders can take loans
      - `dividend_rate` (decimal) - Annual dividend rate percentage
      - `is_active` (boolean) - Whether this account type is currently available
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `account_types` table
    - Add policy for admins to manage all account types
    - Add policy for authenticated users to read active account types

  3. Indexes
    - Index on name for fast lookups
    - Index on bank_account_id for efficient joins
    - Index on is_active for filtering active types
*/

CREATE TABLE IF NOT EXISTS account_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  bank_account_id uuid NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
  processing_fee decimal(10,2) DEFAULT 0.00,
  is_member_account boolean DEFAULT false,
  can_take_loan boolean DEFAULT false,
  dividend_rate decimal(5,2) DEFAULT 0.00,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE account_types ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage account types"
  ON account_types
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Users can read active account types"
  ON account_types
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_types_name ON account_types(name);
CREATE INDEX IF NOT EXISTS idx_account_types_bank_account_id ON account_types(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_account_types_is_active ON account_types(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_account_types_is_member_account ON account_types(is_member_account) WHERE is_member_account = true;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'update_account_types_updated_at'
  ) THEN
    CREATE TRIGGER update_account_types_updated_at
      BEFORE UPDATE ON account_types
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;