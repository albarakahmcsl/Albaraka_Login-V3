// ---------------- MEMBERS TYPES START ----------------
export type Gender = 'male' | 'female' | 'other';
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed' | 'other';

// Document checklist type
export interface DocumentChecklist {
  birthCertificate: boolean;
  idCopy: boolean;
  applicationFeePaid: boolean;
  [key: string]: boolean; // for future documents
}

// Account type
export interface AccountType {
  id: string;
  name: string;
  processingFee: number; // in your currency
}

// Member interface
export interface Member {
  id: string;
  name: string;
  address: string;
  dob: string; // ISO date string
  gender: Gender;
  email: string;
  phone: string;
  idCardNumber: string;
  age: number;
  occupation: string;
  maritalStatus: MaritalStatus;
  accountTypeId: string;
  documents: DocumentChecklist;
  createdAt: string;
  updatedAt: string;
}

// Payload for creating a member
export interface CreateMemberData {
  name: string;
  address: string;
  dob: string;
  gender: Gender;
  email: string;
  phone: string;
  idCardNumber: string;
  age: number;
  occupation: string;
  maritalStatus: MaritalStatus;
  accountTypeId: string;
  documents: DocumentChecklist;
}

// Payload for updating a member
export interface UpdateMemberData extends Partial<CreateMemberData> {}
// ---------------- MEMBERS TYPES END ----------------
