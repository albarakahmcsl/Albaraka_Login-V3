/*
  # Add documents required field to account types

  1. Schema Changes
    - Add `documents_required` column to `account_types` table
    - Column type: JSONB array to store list of required documents
    - Default value: empty array for existing records

  2. Features
    - Configurable document requirements per account type
    - Support for multiple document types (ID, Birth Certificate, etc.)
    - Flexible storage for future document types

  3. Examples
    - Hajj Account: ["ID Card"]
    - Savings Account: ["ID Card", "Birth Certificate", "Proof of Address"]
    - Multiplier Account: ["ID Card", "Income Certificate"]
*/

-- Add documents_required column to account_types table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_types' AND column_name = 'documents_required'
  ) THEN
    ALTER TABLE account_types ADD COLUMN documents_required jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add index for efficient querying of document requirements
CREATE INDEX IF NOT EXISTS idx_account_types_documents_required 
ON account_types USING gin (documents_required);

-- Add comment for documentation
COMMENT ON COLUMN account_types.documents_required IS 'Array of required documents for opening this account type (e.g., ["ID Card", "Birth Certificate"])';