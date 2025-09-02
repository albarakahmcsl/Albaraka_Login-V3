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