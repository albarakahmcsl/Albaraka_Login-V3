import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "../../lib/queryClient"
import { membersApi, accountTypesApi, ApiError } from "../../lib/dataFetching"
import { Member, CreateMemberData, AccountType } from "../../types"
import { Plus, User, FileText } from "lucide-react"

export default function NewMemberPage() {
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState<CreateMemberData>({
    name: "",
    address: "",
    dob: "",
    gender: "",
    email: "",
    phone: "",
    idCardNumber: "",
    age: "",
    occupation: "",
    maritalStatus: "",
    accountTypeId: "",
    documents: {
      birthCertificate: false,
      idCopy: false,
      applicationFeePaid: false,
    },
  })

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch account types
  const { data: accountTypes = [] } = useQuery<AccountType[]>({
    queryKey: queryKeys.accountTypes(),
    queryFn: accountTypesApi.getAccountTypes,
  })

  const createMemberMutation = useMutation({
    mutationFn: (data: CreateMemberData) => membersApi.createMember(data),
    onSuccess: () => {
      setSuccess("Member created successfully")
      setError(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.members() })
      setFormData({
        name: "",
        address: "",
        dob: "",
        gender: "",
        email: "",
        phone: "",
        idCardNumber: "",
        age: "",
        occupation: "",
        maritalStatus: "",
        accountTypeId: "",
        documents: {
          birthCertificate: false,
          idCopy: false,
          applicationFeePaid: false,
        },
      })
    },
    onError: (error) => {
      setError(error instanceof ApiError ? error.message : "Failed to create member")
      setSuccess(null)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMemberMutation.mutate(formData)
  }

  const handleCheckboxChange = (field: keyof typeof formData.documents) => {
    setFormData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: !prev.documents[field],
      },
    }))
  }

  return (
    <div className="pt-24 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center">
        <User className="h-7 w-7 text-emerald-600 mr-2" />
        Create New Member
      </h1>
      <p className="text-gray-600">Fill out the member's details below.</p>

      {error && <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 rounded p-4 text-green-800">{success}</div>}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-md p-6 space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
              className="mt-1 block w-full border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              required
              className="mt-1 block w-full border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              required
              className="mt-1 block w-full border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <input
              type="date"
              value={formData.dob}
              onChange={(e) => setFormData((prev) => ({ ...prev, dob: e.target.value }))}
              required
              className="mt-1 block w-full border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))}
              required
              className="mt-1 block w-full border-gray-300 rounded-md"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">ID Card Number</label>
            <input
              type="text"
              value={formData.idCardNumber}
              onChange={(e) => setFormData((prev) => ({ ...prev, idCardNumber: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Age</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData((prev) => ({ ...prev, age: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Occupation</label>
            <input
              type="text"
              value={formData.occupation}
              onChange={(e) => setFormData((prev) => ({ ...prev, occupation: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Marital Status</label>
            <select
              value={formData.maritalStatus}
              onChange={(e) => setFormData((prev) => ({ ...prev, maritalStatus: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md"
            >
              <option value="">Select Status</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Membership Account Type</label>
            <select
              value={formData.accountTypeId}
              onChange={(e) => setFormData((prev) => ({ ...prev, accountTypeId: e.target.value }))}
              required
              className="mt-1 block w-full border-gray-300 rounded-md"
            >
              <option value="">Select Account Type</option>
              {accountTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} (Fee: {type.processingFee})
                </option>
              ))}
            </select>
          </div>

          {/* Documents Checklist */}
          <div className="md:col-span-2 space-y-2 mt-2">
            <p className="text-sm font-medium text-gray-700">Documents Provided</p>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.documents.birthCertificate}
                  onChange={() => handleCheckboxChange("birthCertificate")}
                  className="rounded border-gray-300"
                />
                <span>Birth Certificate</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.documents.idCopy}
                  onChange={() => handleCheckboxChange("idCopy")}
                  className="rounded border-gray-300"
                />
                <span>ID Copy</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.documents.applicationFeePaid}
                  onChange={() => handleCheckboxChange("applicationFeePaid")}
                  className="rounded border-gray-300"
                />
                <span>Application Fee Paid</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="submit"
            disabled={createMemberMutation.isPending}
            className="px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4 inline mr-1" />
            Create Member
          </button>
        </div>
      </form>
    </div>
  )
}
