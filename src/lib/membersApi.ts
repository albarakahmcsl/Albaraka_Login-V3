// src/lib/membersApi.ts
import { Member, CreateMemberData, UpdateMemberData, AccountType } from '../types/members'

// ---------------- API ERROR CLASS ----------------
export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// ---------------- API ENDPOINTS ----------------
// Replace this with your actual backend URL
const BASE_URL = '/api/members'

// ---------------- MEMBERS API ----------------
export const membersApi = {
  getMembers: async (): Promise<{ members: Member[] }> => {
    const res = await fetch(`${BASE_URL}`)
    if (!res.ok) throw new ApiError('Failed to fetch members')
    return res.json()
  },

  createMember: async (data: CreateMemberData): Promise<Member> => {
    const res = await fetch(`${BASE_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new ApiError('Failed to create member')
    return res.json()
  },

  updateMember: async (memberId: string, data: UpdateMemberData): Promise<Member> => {
    const res = await fetch(`${BASE_URL}/${memberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new ApiError('Failed to update member')
    return res.json()
  },
}

// ---------------- ACCOUNT TYPES API ----------------
export const accountTypesApi = {
  getAccountTypes: async (): Promise<{ account_types: AccountType[] }> => {
    const res = await fetch('/api/account-types') // adjust endpoint if different
    if (!res.ok) throw new ApiError('Failed to fetch account types')
    return res.json()
  },
}
