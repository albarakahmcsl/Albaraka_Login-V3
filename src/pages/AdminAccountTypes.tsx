import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryClient'
import { Plus, Search, Edit, Trash2, Layers, CheckCircle, XCircle, DollarSign, Percent } from 'lucide-react'
import { FileText } from 'lucide-react'
import { accountTypesApi, bankAccountsApi, ApiError } from '../lib/dataFetching'
import type { AccountType, CreateAccountTypeData, UpdateAccountTypeData, BankAccount } from '../types'

export function AdminAccountTypes() {
  const queryClient = useQueryClient()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Clear messages after 5 seconds
  React.useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccess(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  // Fetch account types and bank accounts
  const { data: accountTypesData, isLoading: accountTypesLoading } = useQuery({
    queryKey: queryKeys.accountTypes(),
    queryFn: accountTypesApi.getAccountTypes,
  })

  const { data: bankAccountsData } = useQuery({
    queryKey: queryKeys.bankAccounts(),
    queryFn: bankAccountsApi.getBankAccounts,
  })

  // Mutations for account type operations
  const createAccountTypeMutation = useMutation({
    mutationFn: accountTypesApi.createAccountType,
    onSuccess: () => {
      setSuccess('Account type created successfully')
      setError(null)
      setShowCreateModal(false)
      queryClient.invalidateQueries({ queryKey: queryKeys.accountTypes() })
    },
    onError: (error) => {
      setError(error instanceof ApiError ? error.message : 'Failed to create account type')
      setSuccess(null)
    },
  })

  const updateAccountTypeMutation = useMutation({
    mutationFn: ({ accountTypeId, accountTypeData }: { accountTypeId: string; accountTypeData: UpdateAccountTypeData }) =>
      accountTypesApi.updateAccountType(accountTypeId, accountTypeData),
    onSuccess: () => {
      setSuccess('Account type updated successfully')
      setError(null)
      setShowEditModal(false)
      setSelectedAccountType(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.accountTypes() })
    },
    onError: (error) => {
      setError(error instanceof ApiError ? error.message : 'Failed to update account type')
      setSuccess(null)
    },
  })

  const deleteAccountTypeMutation = useMutation({
    mutationFn: accountTypesApi.deleteAccountType,
    onSuccess: () => {
      setSuccess('Account type deleted successfully')
      setError(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.accountTypes() })
    },
    onError: (error) => {
      setError(error instanceof ApiError ? error.message : 'Failed to delete account type')
      setSuccess(null)
    },
  })

  const handleCreateAccountType = (accountTypeData: CreateAccountTypeData) => {
    createAccountTypeMutation.mutate(accountTypeData)
  }

  const handleUpdateAccountType = (accountTypeData: UpdateAccountTypeData) => {
    if (!selectedAccountType) return
    updateAccountTypeMutation.mutate({ accountTypeId: selectedAccountType.id, accountTypeData })
  }

  const handleDeleteAccountType = (accountTypeId: string) => {
    if (!confirm('Are you sure you want to delete this account type? This action cannot be undone.')) return
    deleteAccountTypeMutation.mutate(accountTypeId)
  }

  const accountTypes = accountTypesData?.account_types || []
  const bankAccounts = bankAccountsData?.bank_accounts || []
  const loading = accountTypesLoading || createAccountTypeMutation.isPending || updateAccountTypeMutation.isPending || deleteAccountTypeMutation.isPending

  const filteredAccountTypes = accountTypes.filter(accountType =>
    accountType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (accountType.description && accountType.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (accountType.bank_account?.name && accountType.bank_account.name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6 pt-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Layers className="h-7 w-7 text-emerald-600 mr-2" />
            Account Type Management
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Configure Islamic finance account types with specific rules and properties
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Account Type
        </button>
      </div>

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
          placeholder="Search account types..."
        />
      </div>

      {/* Account Types Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : filteredAccountTypes.length === 0 ? (
          <div className="text-center py-12">
            <Layers className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No account types</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No account types match your search.' : 'Get started by creating a new account type.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account Type
                </button>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredAccountTypes.map((accountType) => (
              <li key={accountType.id}>
                <div className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12">
                        <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                          <Layers className="h-6 w-6 text-emerald-600" />
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center">
                          <div className="text-lg font-medium text-gray-900">
                            {accountType.name}
                          </div>
                          <div className="ml-3 flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              accountType.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {accountType.is_active ? 'Active' : 'Inactive'}
                            </span>
                            {accountType.is_member_account && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Member Account
                              </span>
                            )}
                            {accountType.can_take_loan && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Loan Eligible
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {accountType.description || 'No description'}
                        </div>
                        <div className="text-sm text-gray-600 mt-2 grid grid-cols-2 gap-4">
                          <div>
                            <span className="font-medium">Bank Account:</span> {accountType.bank_account?.name}
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="font-medium">Processing Fee:</span> MUR {accountType.processing_fee}
                          </div>
                          <div className="flex items-center">
                            <Percent className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="font-medium">Dividend Rate:</span> {accountType.dividend_rate}%
                          </div>
                          <div className="col-span-2">
                            <div className="flex items-start">
                              <FileText className="h-4 w-4 text-gray-400 mr-1 mt-0.5" />
                              <div>
                                <span className="font-medium">Required Documents:</span>
                                {accountType.documents_required && accountType.documents_required.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {accountType.documents_required.map((doc, index) => (
                                      <span
                                        key={index}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                      >
                                        {doc}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-500 text-sm"> None specified</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedAccountType(accountType)
                          setShowEditModal(true)
                        }}
                        className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        title="Edit account type"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAccountType(accountType.id)}
                        className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        title="Delete account type"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateAccountTypeModal
          bankAccounts={bankAccounts}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateAccountType}
        />
      )}
      {showEditModal && selectedAccountType && (
        <EditAccountTypeModal
          accountType={selectedAccountType}
          bankAccounts={bankAccounts}
          onClose={() => {
            setShowEditModal(false)
            setSelectedAccountType(null)
          }}
          onSubmit={handleUpdateAccountType}
        />
      )}
    </div>
  )
}

// Create Account Type Modal Component
function CreateAccountTypeModal({ 
  bankAccounts,
  onClose, 
  onSubmit 
}: { 
  bankAccounts: BankAccount[]
  onClose: () => void
  onSubmit: (accountTypeData: CreateAccountTypeData) => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bank_account_id: '',
    processing_fee: 0,
    is_member_account: false,
    can_take_loan: false,
    dividend_rate: 0,
    is_active: true,
    documents_required_text: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.bank_account_id) {
      return
    }
    
    // Parse documents from comma-separated text
    const documentsArray = formData.documents_required_text
      .split(',')
      .map(doc => doc.trim())
      .filter(doc => doc.length > 0)
    
    onSubmit({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      bank_account_id: formData.bank_account_id,
      processing_fee: formData.processing_fee,
      is_member_account: formData.is_member_account,
      can_take_loan: formData.can_take_loan,
      dividend_rate: formData.dividend_rate,
      is_active: formData.is_active,
      documents_required: documentsArray
    })
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Account Type</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Type Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="e.g., Hajj Account, Savings Account"
                maxLength={100}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                rows={3}
                placeholder="Describe the purpose and features of this account type"
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Associated Bank Account</label>
              <select
                required
                value={formData.bank_account_id}
                onChange={(e) => setFormData(prev => ({ ...prev, bank_account_id: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Select a bank account</option>
                {bankAccounts.map((bankAccount) => (
                  <option key={bankAccount.id} value={bankAccount.id}>
                    {bankAccount.name} ({bankAccount.account_number})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Processing Fee (MUR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.processing_fee}
                  onChange={(e) => setFormData(prev => ({ ...prev, processing_fee: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Dividend Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.dividend_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dividend_rate: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Required Documents</label>
              <textarea
                value={formData.documents_required_text}
                onChange={(e) => setFormData(prev => ({ ...prev, documents_required_text: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                rows={3}
                placeholder="Enter required documents separated by commas (e.g., ID Card, Birth Certificate, Proof of Address)"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate multiple documents with commas. These will be required when opening this account type.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_member_account"
                  checked={formData.is_member_account}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_member_account: e.target.checked }))}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="is_member_account" className="ml-2 text-sm text-gray-700">
                  <span className="font-medium">Member Account</span>
                  <span className="text-gray-500 block">Account holders are considered institution members</span>
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="can_take_loan"
                  checked={formData.can_take_loan}
                  onChange={(e) => setFormData(prev => ({ ...prev, can_take_loan: e.target.checked }))}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="can_take_loan" className="ml-2 text-sm text-gray-700">
                  <span className="font-medium">Loan Eligible</span>
                  <span className="text-gray-500 block">Account holders can apply for loans</span>
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  <span className="font-medium">Active</span>
                  <span className="text-gray-500 block">Account type is available for new accounts</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!formData.name.trim() || !formData.bank_account_id}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Account Type
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Edit Account Type Modal Component
function EditAccountTypeModal({ 
  accountType,
  bankAccounts,
  onClose, 
  onSubmit 
}: { 
  accountType: AccountType
  bankAccounts: BankAccount[]
  onClose: () => void
  onSubmit: (accountTypeData: UpdateAccountTypeData) => void
}) {
  const [formData, setFormData] = useState({
    name: accountType.name,
    description: accountType.description || '',
    bank_account_id: accountType.bank_account_id,
    processing_fee: accountType.processing_fee,
    is_member_account: accountType.is_member_account,
    can_take_loan: accountType.can_take_loan,
    dividend_rate: accountType.dividend_rate,
    is_active: accountType.is_active,
    documents_required_text: (accountType.documents_required || []).join(', ')
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.bank_account_id) {
      return
    }
    
    // Parse documents from comma-separated text
    const documentsArray = formData.documents_required_text
      .split(',')
      .map(doc => doc.trim())
      .filter(doc => doc.length > 0)
    
    onSubmit({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      bank_account_id: formData.bank_account_id,
      processing_fee: formData.processing_fee,
      is_member_account: formData.is_member_account,
      can_take_loan: formData.can_take_loan,
      dividend_rate: formData.dividend_rate,
      is_active: formData.is_active,
      documents_required: documentsArray
    })
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Account Type</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Type Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                maxLength={100}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                rows={3}
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Associated Bank Account</label>
              <select
                required
                value={formData.bank_account_id}
                onChange={(e) => setFormData(prev => ({ ...prev, bank_account_id: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Select a bank account</option>
                {bankAccounts.map((bankAccount) => (
                  <option key={bankAccount.id} value={bankAccount.id}>
                    {bankAccount.name} ({bankAccount.account_number})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Processing Fee (MUR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.processing_fee}
                  onChange={(e) => setFormData(prev => ({ ...prev, processing_fee: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Dividend Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.dividend_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dividend_rate: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Required Documents</label>
              <textarea
                value={formData.documents_required_text}
                onChange={(e) => setFormData(prev => ({ ...prev, documents_required_text: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                rows={3}
                maxLength={500}
                placeholder="Enter required documents separated by commas"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate multiple documents with commas. These will be required when opening this account type.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit_is_member_account"
                  checked={formData.is_member_account}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_member_account: e.target.checked }))}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="edit_is_member_account" className="ml-2 text-sm text-gray-700">
                  <span className="font-medium">Member Account</span>
                  <span className="text-gray-500 block">Account holders are considered institution members</span>
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit_can_take_loan"
                  checked={formData.can_take_loan}
                  onChange={(e) => setFormData(prev => ({ ...prev, can_take_loan: e.target.checked }))}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="edit_can_take_loan" className="ml-2 text-sm text-gray-700">
                  <span className="font-medium">Loan Eligible</span>
                  <span className="text-gray-500 block">Account holders can apply for loans</span>
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="edit_is_active" className="ml-2 text-sm text-gray-700">
                  <span className="font-medium">Active</span>
                  <span className="text-gray-500 block">Account type is available for new accounts</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!formData.name.trim() || !formData.bank_account_id}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Account Type
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}