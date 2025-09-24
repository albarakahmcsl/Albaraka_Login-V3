// src/lib/membersApi.ts
import type { Member } from '../types/member'
import type { AccountType } from '../types/index'

// You can replace this with your real backend URL
const BASE_URL = '/api'

export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// ---------------- MEMBERS API ----------------
async function getMembers(): Promise<{ members: Member[] }> {
  const res = await fetch(`${BASE_URL}/members`)
  if (!res.ok) throw new ApiError('Failed to fetch members')
  return res.json()
}

async function createMember(memberData: Omit<Member, 'id'>): Promise<Member> {
  const res = await fetch(`${BASE_URL}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(memberData),
  })
  if (!res.ok) throw new ApiError('Failed to create member')
  return res.json()
}

async function updateMember(memberId: string, memberData: Partial<Member>): Promise<Member> {
  const res = await fetch(`${BASE_URL}/members/${memberId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(memberData),
  })
  if (!res.ok) throw new ApiError('Failed to update member')
  return res.json()
}

async function deleteMember(memberId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/members/${memberId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new ApiError('Failed to delete member')
}

// Export as object to match your current imports
export const membersApi = {
  getMembers,
  createMember,
  updateMember,
  deleteMember,
}

// ---------------- ACCOUNT TYPES API ----------------
async function getAccountTypes(): Promise<{ account_types: AccountType[] }> {
  const res = await fetch(`${BASE_URL}/account-types`)
  if (!res.ok) throw new ApiError('Failed to fetch account types')
  return res.json()
}

export const accountTypesApi = {
  getAccountTypes,
}
