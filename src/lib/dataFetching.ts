import { supabase, getAuthHeaders } from './supabase'
import type {
  User,
  Role,
  Permission,
  CreateUserData,
  UpdateUserData,
  CreateRoleData,
  UpdateRoleData,
  CreatePermissionData,
  UpdatePermissionData,
  PasswordValidationResult
} from '../types/auth'
import type {
  BankAccount,
  CreateBankAccountData,
  UpdateBankAccountData,
  AccountType,
  CreateAccountTypeData,
  UpdateAccountTypeData
} from '../types'

const API_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function handleResponse(response: Response) {
  const data = await response.json()
  if (!response.ok) {
    throw new ApiError(response.status, data.error || 'Request failed')
  }
  return data
}

// USER PROFILE
export const userProfileApi = {
  async fetchUserProfile(userId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        is_active,
        needs_password_reset,
        menu_access,
        sub_menu_access,
        component_access,
        created_at,
        updated_at,
        user_roles(
          roles(
            id,
            name,
            description,
            role_permissions(
              permissions(
                id,
                resource,
                action,
                description
              )
            )
          )
        )
      `)
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    const roles = data.user_roles?.map(ur => ur.roles).filter(Boolean) || []

    const allPermissions = roles.flatMap(role =>
      role.role_permissions?.map(rp => rp.permissions).filter(Boolean) || []
    )

    const uniquePermissions = allPermissions.filter((permission, index, array) =>
      array.findIndex(p => p.resource === permission.resource && p.action === permission.action) === index
    )

    return {
      ...data,
      roles,
      role_ids: roles.map(role => role.id),
      permissions: uniquePermissions
    }
  }
}

// DASHBOARD
export const dashboardApi = {
  async getRecentActivity(): Promise<any[]> {
    return [
      { id: '1', type: 'user_registered', description: 'New user registered', timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), status: 'success' },
      { id: '2', type: 'transaction_approved', description: 'Transaction approved', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), status: 'info' },
      { id: '3', type: 'report_generated', description: 'Report generated', timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), status: 'warning' },
      { id: '4', type: 'user_updated', description: 'User profile updated', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), status: 'info' }
    ]
  },

  async getStats(): Promise<any[]> {
    return [
      { name: 'Total Users', value: '2,847', change: '+4.75%', changeType: 'positive' as const },
      { name: 'Active Transactions', value: '₹1,31,42,000', change: '+8.2%', changeType: 'positive' as const },
      { name: 'Monthly Growth', value: '24.1%', change: '+0.7%', changeType: 'positive' as const },
      { name: 'Reports Generated', value: '152', change: '+4.8%', changeType: 'positive' as const }
    ]
  }
}

// USERS
export const usersApi = {
  async getUsers(): Promise<{ users: User[] }> {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/users`, { method: 'GET', headers })
    return await handleResponse(response)
  },

  async createUser(userData: CreateUserData): Promise<{ user: User }> {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/users`, { method: 'POST', headers, body: JSON.stringify(userData) })
    return await handleResponse(response)
  },

  async updateUser(userId: string, userData: UpdateUserData): Promise<{ user: User }> {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, { method: 'PUT', headers, body: JSON.stringify(userData) })
    return await handleResponse(response)
  },

  async deleteUser(userId: string): Promise<{ message: string }> {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, { method: 'DELETE', headers })
    return await handleResponse(response)
  }
}

// ROLES
export const rolesApi = {
  async getRoles(): Promise<Role[]> {
    const { data, error } = await supabase
      .from('roles')
      .select(`
        *,
        role_permissions(
          permissions(
            id,
            resource,
            action,
            description
          )
        )
      `)
      .order('name')

    if (error) throw error
    return data?.map(role => ({
      ...role,
      permissions: role.role_permissions?.map(rp => rp.permissions).filter(Boolean) || []
    })) || []
  }
}

// PERMISSIONS
export const permissionsApi = {
  async getPermissions(): Promise<Permission[]> {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/permissions`, { method: 'GET', headers })
    const result = await handleResponse(response)
    return result.permissions
  }
}

// PASSWORD
export const passwordValidationApi = {
  async validatePassword(password: string): Promise<PasswordValidationResult> {
    const response = await fetch(`${API_BASE_URL}/validate-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
    if (!response.ok) {
      const errorData = await response.json()
      throw new ApiError(response.status, errorData.message || 'Validation failed')
    }
    return await handleResponse(response) as PasswordValidationResult
  }
}

// AUTH
export const authApi = {
  async updatePassword(newPassword: string, clearNeedsPasswordReset: boolean = false): Promise<{ message: string; user: any }> {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/update-password`, { method: 'POST', headers, body: JSON.stringify({ newPassword, clearNeedsPasswordReset }) })
    return await handleResponse(response)
  }
}

// BANK ACCOUNTS
export const bankAccountsApi = {
  async getBankAccounts(): Promise<{ bank_accounts: BankAccount[] }> {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/bank-accounts`, { method: 'GET', headers })
    return await handleResponse(response)
  },
  async createBankAccount(bankAccountData: CreateBankAccountData): Promise<{ bank_account: BankAccount }> {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/bank-accounts`, { method: 'POST', headers, body: JSON.stringify(bankAccountData) })
    return await handleResponse(response)
  },
  async updateBankAccount(bankAccountId: string, bankAccountData: UpdateBankAccountData): Promise<{ bank_account: BankAccount }> {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/bank-accounts/${bankAccountId}`, { method: 'PUT', headers, body: JSON.stringify(bankAccountData) })
    return await handleResponse(response)
  },
  async deleteBankAccount(bankAccountId: string): Promise<{ message: string }> {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/bank-accounts/${bankAccountId}`, { method: 'DELETE', headers })
    return await handleResponse(response)
  }
}

// ACCOUNT TYPES
export const accountTypesApi = {
  async getAccountTypes(): Promise<{ account_types: AccountType[] }> {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/account-types`, { method: 'GET', headers })
    return await handleResponse(response)
  },
  async createAccountType(accountTypeData: CreateAccountTypeData): Promise<{ account_type: AccountType }> {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/account-types`, { method: 'POST', headers, body: JSON.stringify(accountTypeData) })
    return await handleResponse(response)
  },
  async updateAccountType(accountTypeId: string, accountTypeData: UpdateAccountTypeData): Promise<{ account_type: AccountType }> {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/account-types/${accountTypeId}`, { method: 'PUT', headers, body: JSON.stringify(accountTypeData) })
    return await handleResponse(response)
  },
  async deleteAccountType(accountTypeId: string): Promise<{ message: string }> {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/account-types/${accountTypeId}`, { method: 'DELETE', headers })
    return await handleResponse(response)
  }
}
