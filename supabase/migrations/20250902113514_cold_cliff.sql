/*
  # Create bank accounts table

  1. New Tables
    - `bank_accounts`
      - `id` (uuid, primary key)
      - `name` (text, not null) - Name of the bank account
      - `account_number` (text, unique, not null) - Bank account number
      - `created_at` (timestamp with time zone, default now())

  2. Security
    - Enable RLS on `bank_accounts` table
    - Add policy for admin users to manage bank accounts
    - Only users with admin role can perform CRUD operations

  3. Notes
    - Account numbers must be unique to prevent duplicates
    - Admin-only access ensures security for financial data
*/

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  account_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Create policy for admin users to manage bank accounts
CREATE POLICY "Admins can manage bank accounts"
ON public.bank_accounts
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

-- Create index for better performance on account number lookups
CREATE INDEX IF NOT EXISTS idx_bank_accounts_account_number ON public.bank_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_name ON public.bank_accounts(name);