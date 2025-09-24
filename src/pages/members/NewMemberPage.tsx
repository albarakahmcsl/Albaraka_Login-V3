// src/pages/members/NewMemberPage.tsx
import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createMember } from '../../lib/membersApi'
import { accountTypesApi } from '../../lib/dataFetching'
import type { Member } from '../../types/member'
import type { AccountType } from '../../types/accountType'

export default function NewMemberPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [formData, setFormData] = useState<Omit<Member, 'id'>>({
    name: '',
    dob: '',
    gender: '',
    address: '',
    email: '',
    phone: '',
    idCardNumber: '',
    age: '',
    occupation: '',
    maritalStatus: '',
    accountTypeId: '',
    documents: {
      birthCertificate: false,
      idCopy: false,
      applicationFeePaid: false,
    },
  })

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch account types
  const { data: accountTypesData } = useQuery({
    queryKey: ['accountTypes'],
    queryFn: accountTypesApi.getAccountTypes,
  })
  const accountTypes: AccountType[] = accountTypesData?.account_types || []

  // React Query mutation
  const createMemberMutation = useMutation({
    mutationFn: (newMember: Omit<Member, 'id'>) => createMember(newMember),
    onSuccess: () => {
      setSuccess('Member created successfully!')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setTimeout(() => navigate('/members'), 1000)
    },
    onError: (err: any) => {
      setError(err?.message || 'Failed to create member.')
      setSuccess(null)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMemberMutation.mutate(formData)
  }

  return (
    <div className="max-w-3xl mx-auto pt-24">
      <h1 className="text-2xl font-bold mb-4">Create New Member</h1>

      {error && <div className="bg-red-50 border border-red-200 p-4 rounded mb-4 text-red-800">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 p-4 rounded mb-4 text-green-800">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
          <input
            type="date"
            required
            value={formData.dob}
            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Gender</label>
          <select
            required
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <input
            type="text"
            required
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* ID Card Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700">ID Card Number</label>
          <input
            type="text"
            required
            value={formData.idCardNumber}
            onChange={(e) => setFormData({ ...formData, idCardNumber: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Age */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Age</label>
          <input
            type="number"
            required
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Occupation */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Occupation</label>
          <input
            type="text"
            required
            value={formData.occupation}
            onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Marital Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Marital Status</label>
          <input
            type="text"
            required
            value={formData.maritalStatus}
            onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Account Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Account Type</label>
          <select
            required
            value={formData.accountTypeId}
            onChange={(e) => setFormData({ ...formData, accountTypeId: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Select Account Type</option>
            {accountTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} - Fee: {type.processingFee}
              </option>
            ))}
          </select>
        </div>

        {/* Required Documents */}
        <div className="pt-2">
          <p className="font-medium text-gray-700 mb-1">Required Documents:</p>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.documents.birthCertificate}
              onChange={(e) =>
                setFormData({ ...formData, documents: { ...formData.documents, birthCertificate: e.target.checked } })
              }
            />
            <span>Birth Certificate</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.documents.idCopy}
              onChange={(e) =>
                setFormData({ ...formData, documents: { ...formData.documents, idCopy: e.target.checked } })
              }
            />
            <span>ID Copy</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.documents.applicationFeePaid}
              onChange={(e) =>
                setFormData({ ...formData, documents: { ...formData.documents, applicationFeePaid: e.target.checked } })
              }
            />
            <span>Application Fee Paid</span>
          </label>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={createMemberMutation.isLoading}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMemberMutation.isLoading ? 'Creating...' : 'Create Member'}
          </button>
        </div>
      </form>
    </div>
  )
}
