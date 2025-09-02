export interface BankAccount {
  id: string;
  name: string;
  account_number: string;
  created_at: string;
}

export interface CreateBankAccountData {
  name: string;
  account_number: string;
}

export interface UpdateBankAccountData {
  name?: string;
  account_number?: string;
}

export interface AccountType {
  id: string;
  name: string;
  description: string | null;
  bank_account_id: string;
  processing_fee: number;
  is_member_account: boolean;
  can_take_loan: boolean;
  dividend_rate: number;
  is_active: boolean;
  documents_required: string[];
  documents_required: string[];
  created_at: string;
  updated_at: string;
  bank_account?: {
    id: string;
    name: string;
    account_number: string;
  };
}

export interface CreateAccountTypeData {
  name: string;
  description?: string;
  bank_account_id: string;
  processing_fee?: number;
  is_member_account?: boolean;
  can_take_loan?: boolean;
  dividend_rate?: number;
  is_active?: boolean;
  documents_required?: string[];
  documents_required?: string[];
}

export interface UpdateAccountTypeData {
  name?: string;
  description?: string;
  bank_account_id?: string;
  processing_fee?: number;
  is_member_account?: boolean;
  can_take_loan?: boolean;
  dividend_rate?: number;
  is_active?: boolean;
  documents_required?: string[];
  documents_required?: string[];
}