// ---------------- MEMBER TYPE START ----------------
// This file defines the structure of a Member record in your system.
// You can extend this later if new fields are needed.

export interface Member {
  id: string
  name: string
  address: string
  dob: string // ISO date string (e.g., "1990-05-20")
  gender: "male" | "female" | "other"
  email: string
  phone: string
  id_card_no: string
  age: number
  occupation: string
  marital_status: "single" | "married" | "divorced" | "widowed"
  account_type_id: string // Foreign key to account_types table

  // Checklist: which documents are provided
  documents: {
    birth_certificate: boolean
    id_copy: boolean
    application_fee_paid: boolean
  }

  // System fields (managed by Supabase later)
  created_at?: string
  updated_at?: string
}
// ---------------- MEMBER TYPE END ----------------
