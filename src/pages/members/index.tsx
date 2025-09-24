import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { getMembers } from "../../lib/membersApi"
import { Member } from "../../types/member"

export default function MembersPage() {
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["members"],
    queryFn: getMembers,
  })

  const [searchTerm, setSearchTerm] = useState("")

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 pt-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Members</h1>
        <Link to="/members/new">
          <button className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700">
            Create New Member
          </button>
        </Link>
      </div>

      <input
        type="text"
        placeholder="Search members..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="border border-gray-300 rounded px-3 py-2 w-full max-w-md"
      />

      {isLoading ? (
        <p>Loading members...</p>
      ) : filteredMembers.length === 0 ? (
        <p>No members found.</p>
      ) : (
        <table className="w-full border mt-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="p-2">{m.name}</td>
                <td className="p-2">{m.email}</td>
                <td className="p-2">
                  <Link
                    to={`/members/${m.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View/Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
