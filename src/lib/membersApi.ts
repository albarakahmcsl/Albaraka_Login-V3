// ---------------- MEMBERS API START ----------------
// Temporary in-memory API for members. 
// Later, replace with Supabase integration.

import { Member } from "../types/member"

// Fake store (reset when app reloads)
let members: Member[] = []

// Utility to generate random IDs for test
function generateId() {
  return Math.random().toString(36).substring(2, 10)
}

// Fetch all members
export async function getMembers(): Promise<Member[]> {
  return members
}

// Fetch single member by ID
export async function getMemberById(id: string): Promise<Member | null> {
  return members.find((m) => m.id === id) || null
}

// Create new member
export async function createMember(data: Omit<Member, "id">): Promise<Member> {
  const newMember: Member = { id: generateId(), ...data }
  members.push(newMember)
  return newMember
}

// Update existing member
export async function updateMember(
  id: string,
  data: Partial<Member>
): Promise<Member | null> {
  const index = members.findIndex((m) => m.id === id)
  if (index === -1) return null
  members[index] = { ...members[index], ...data }
  return members[index]
}

// Delete member
export async function deleteMember(id: string): Promise<boolean> {
  const index = members.findIndex((m) => m.id === id)
  if (index === -1) return false
  members.splice(index, 1)
  return true
}
// ---------------- MEMBERS API END ----------------
