/*
  # Update dividend rate to boolean eligibility

  1. Schema Changes
    - Rename `dividend_rate` column to `is_dividend_eligible`
    - Change data type from numeric to boolean
    - Set default value to false

  2. Data Migration
    - Convert existing numeric dividend rates to boolean values
    - Rates > 0 become true, rates = 0 become false

  3. Index Updates
    - Update any indexes that reference the old column name
*/

-- First, add the new boolean column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_types' AND column_name = 'is_dividend_eligible'
  ) THEN
    ALTER TABLE account_types ADD COLUMN is_dividend_eligible boolean DEFAULT false;
  END IF;
END $$;

-- Migrate existing data: convert dividend_rate > 0 to true, otherwise false
UPDATE account_types 
SET is_dividend_eligible = (dividend_rate > 0)
WHERE is_dividend_eligible IS NULL;

-- Drop the old dividend_rate column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_types' AND column_name = 'dividend_rate'
  ) THEN
    ALTER TABLE account_types DROP COLUMN dividend_rate;
  END IF;
END $$;

-- Add index for the new boolean column
CREATE INDEX IF NOT EXISTS idx_account_types_is_dividend_eligible 
ON account_types (is_dividend_eligible) 
WHERE (is_dividend_eligible = true);