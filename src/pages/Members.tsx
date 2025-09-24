// src/pages/Members.tsx
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryClient'
import { Plus, Search, Edit } from 'lucide-react'
import type { Member, CreateMemberData, UpdateMemberData, AccountType } from '../types/members'
import { membersApi, accountTypesApi, ApiError } from '../lib/membersApi'

export function MembersPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  React.useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccess(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: queryKeys.members(),
    queryFn: membersApi.getMembers,
  })

  const { data: accountTypesData } = useQuery({
    queryKey: queryKeys.accountTypes(),
    queryFn: accountTypesApi.getAccountTypes,
  })

  const createMemberMutation = useMutation({
    mutationFn: membersApi.createMember,
    onSuccess: () => {
      setSuccess('Member created successfully')
      setError(null)
      setShowCreateModal(false)
      queryClient.invalidateQueries({ queryKey: queryKeys.members() })
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to create member')
      setSuccess(null)
    },
  })

  const updateMemberMutation = useMutation({
    mutationFn: ({ memberId, memberData }: { memberId: string; memberData: UpdateMemberData }) =>
      membersApi.updateMember(memberId, memberData),
    onSuccess: () => {
      setSuccess('Member updated successfully')
      setError(null)
      setShowEditModal(false)
      setSelectedMember(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.members() })
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to update member')
      setSuccess(null)
    },
  })

  const handleCreateMember = (memberData: CreateMemberData) => createMemberMutation.mutate(memberData)
  const handleUpdateMember = (memberData: UpdateMemberData) => {
    if (!selectedMember) return
    updateMemberMutation.mutate({ memberId: selectedMember.id, memberData })
  }

  const members: Member[] = membersData?.members || []
  const accountTypes: AccountType[] = accountTypesData?.account_types || []

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const loading = membersLoading || createMemberMutation.isPending || updateMemberMutation.isPending

  return (
    <div className="space-y-6 pt-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">Members Management</h1>
          <p className="mt-1 text-sm text-gray-600">Manage members and their account types</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Member
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-md p-4"><p className="text-red-800">{error}</p></div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-md p-4"><p className="text-green-800">{success}</p></div>}

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="Search members..."
        />
      </div>

      {/* Members Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No members found</h3>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredMembers.map((m) => (
              <li key={m.id} className="px-4 py-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">{m.name}</span>
                  <span className="text-sm text-gray-500">{m.email}</span>
                  <span className="text-sm text-gray-500">{m.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => { setSelectedMember(m); setShowEditModal(true) }}
                    className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    title="Edit member"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateEditMemberModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateMember}
          accountTypes={accountTypes}
        />
      )}
      {showEditModal && selectedMember && (
        <CreateEditMemberModal
          mode="edit"
          member={selectedMember}
          onClose={() => { setShowEditModal(false); setSelectedMember(null) }}
          onSubmit={handleUpdateMember}
          accountTypes={accountTypes}
        />
      )}
    </div>
  )
}

// ---------------- CREATE / EDIT MODAL COMBINED ----------------
function CreateEditMemberModal({
  mode,
  member,
  onClose,
  onSubmit,
  accountTypes,
}: {
  mode: 'create' | 'edit'
  member?: Member
  onClose: () => void
  onSubmit: (data: CreateMemberData | UpdateMemberData) => void
  accountTypes: AccountType[]
}) {
  const [formData, setFormData] = useState<CreateMemberData | UpdateMemberData>({
    name: member?.name || '',
    address: member?.address || '',
    dob: member?.dob || '',
    gender: member?.gender || '',
    email: member?.email || '',
    phone: member?.phone || '',
    idCardNumber: member?.idCardNumber || '',
    age: member?.age || '',
    occupation: member?.occupation || '',
    maritalStatus: member?.maritalStatus || '',
    accountTypeId: member?.accountTypeId || '',
    documents: member?.documents || {
      birthCertificate: false,
      idCopy: false,
      applicationFeePaid: false,
    },
  })

  const handleChange = (field: string, value: any) => setFormData({ ...formData, [field]: value })

  const handleCheckbox = (field: keyof typeof formData.documents, value: boolean) =>
    setFormData({ ...formData, documents: { ...formData.documents, [field]: value } })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {mode === 'create' ? 'Create New Member' : 'Edit Member'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="text"
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="block w-full border rounded px-3 py-2"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="block w-full border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Phone"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="block w-full border rounded px-3 py-2"
          />

          <select
            value={formData.accountTypeId}
            onChange={(e) => handleChange('accountTypeId', e.target.value)}
            className="block w-full border rounded px-3 py-2"
            required
          >
            <option value="">Select Account Type</option>
            {accountTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} - Fee: {type.processingFee}
              </option>
            ))}
          </select>

          {/* Document Checklist */}
          {(['birthCertificate', 'idCopy', 'applicationFeePaid'] as const).map((field) => (
            <label key={field} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.documents[field]}
                onChange={(e) => handleCheckbox(field, e.target.checked)}
                className="mr-2"
              />
              {field === 'birthCertificate'
                ? 'Birth Certificate'
                : field === 'idCopy'
                ? 'ID Copy'
                : 'Application Fee Paid'}
            </label>
          ))}

          <div className="flex justify-end space-x-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-md">
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-md text-white ${mode === 'create' ? 'bg-emerald-600' : 'bg-blue-600'}`}
            >
              {mode === 'create' ? 'Create Member' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
