// Path: src/pages/members/NewMemberPage.tsx
import React, { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { membersApi, accountTypesApi, ApiError } from '../../lib/dataFetching'
import { queryKeys } from '../../lib/queryClient'
import { Member, CreateMemberData } from '../../types/member'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function NewMemberPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<CreateMemberData>({
    name: '',
    address: '',
    dob: '',
    gender: '',
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

  // Fetch account types for dropdown
  const { data: accountTypesData, isLoading: accountTypesLoading } = useQuery({
    queryKey: queryKeys.accountTypes(),
    queryFn: accountTypesApi.getAccountTypes,
  })

  const createMemberMutation = useMutation({
    mutationFn: (data: CreateMemberData) => membersApi.createMember(data),
    onSuccess: (member: Member) => {
      setSuccess('Member created successfully')
      setError(null)
      // Navigate to member detail page after creation
      navigate(`/members/${member.id}`)
    },
    onError: (error) => {
      setError(error instanceof ApiError ? error.message : 'Failed to create member')
      setSuccess(null)
    },
  })

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccess(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMemberMutation.mutate(formData)
  }

  return (
    <div className="space-y-6 pt-24">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center">
        <Plus className="h-7 w-7 text-emerald-600 mr-2" />
        Create New Member
      </h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-md shadow-md">
        {/* Personal Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <input
              type="date"
              required
              value={formData.dob}
              onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <select
              required
              value={formData.gender}
              onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">ID Card Number</label>
            <input
              type="text"
              required
              value={formData.idCardNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, idCardNumber: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Age</label>
            <input
              type="number"
              required
              value={formData.age}
              onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Occupation</label>
            <input
              type="text"
              value={formData.occupation}
              onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Marital Status</label>
            <select
              value={formData.maritalStatus}
              onChange={(e) => setFormData(prev => ({ ...prev, maritalStatus: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select Status</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Account Type</label>
            <select
              required
              value={formData.accountTypeId}
              onChange={(e) => setFormData(prev => ({ ...prev, accountTypeId: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select Account Type</option>
              {accountTypesData?.account_types?.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} (Fee: {type.processingFee})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Documents Checklist */}
        <div className="pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Required Documents</h3>
          <div className="space-y-2">
            <label className="inline-flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.documents.birthCertificate}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  documents: { ...prev.documents, birthCertificate: e.target.checked }
                }))}
                className="form-checkbox h-5 w-5 text-emerald-600"
              />
              <span>Birth Certificate</span>
            </label>
            <label className="inline-flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.documents.idCopy}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  documents: { ...prev.documents, idCopy: e.target.checked }
                }))}
                className="form-checkbox h-5 w-5 text-emerald-600"
              />
              <span>Copy of ID</span>
            </label>
            <label className="inline-flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.documents.applicationFeePaid}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  documents: { ...prev.documents, applicationFeePaid: e.target.checked }
                }))}
                className="form-checkbox h-5 w-5 text-emerald-600"
              />
              <span>Application Fee Paid</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6">
          <button
            type="button"
            onClick={() => navigate('/members')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMemberMutation.isLoading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
          >
            {createMemberMutation.isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
