// src/lib/membersApi.ts
//import { ApiError } from './apiError' // If you have a custom ApiError class
import type { Member, CreateMemberData, UpdateMemberData, AccountType } from '../types/members'

const API_BASE = '/api' // Replace with your real backend if different

// ---------------- MEMBERS API ----------------
export const membersApi = {
  getMembers: async (): Promise<{ members: Member[] }> => {
    try {
      const res = await fetch(`${API_BASE}/members`)
      if (!res.ok) throw new ApiError('Failed to fetch members')
      return res.json()
    } catch (err: any) {
      throw new ApiError(err.message || 'Failed to fetch members')
    }
  },

  createMember: async (data: CreateMemberData): Promise<Member> => {
    try {
      const res = await fetch(`${API_BASE}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new ApiError('Failed to create member')
      return res.json()
    } catch (err: any) {
      throw new ApiError(err.message || 'Failed to create member')
    }
  },

  updateMember: async (memberId: string, data: UpdateMemberData): Promise<Member> => {
    try {
      const res = await fetch(`${API_BASE}/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new ApiError('Failed to update member')
      return res.json()
    } catch (err: any) {
      throw new ApiError(err.message || 'Failed to update member')
    }
  },
}

// ---------------- ACCOUNT TYPES API ----------------
export const accountTypesApi = {
  getAccountTypes: async (): Promise<{ account_types: AccountType[] }> => {
    try {
      const res = await fetch(`${API_BASE}/account-types`)
      if (!res.ok) throw new ApiError('Failed to fetch account types')
      return res.json()
    } catch (err: any) {
      throw new ApiError(err.message || 'Failed to fetch account types')
    }
  },
}
