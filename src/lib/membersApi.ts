// src/lib/membersApi.ts
import { Member } from '../types/member'

const API_BASE_URL =  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

export async function createMember(newMember: Omit<Member, 'id'>): Promise<Member> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newMember),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to create member')
  }

  return response.json()
}

// Optional: other API functions for members
export async function getMembers(): Promise<Member[]> {
  const response = await fetch(BASE_URL)
  if (!response.ok) throw new Error('Failed to fetch members')
  return response.json()
}
