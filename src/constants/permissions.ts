/**
 * Centralized permission definitions for the system
 * This file serves as the single source of truth for all available resources and actions
 * When adding new features/pages, update this file to make permissions available in the UI
 */

export interface PermissionDefinition {
  resource: string
  action: string
  description: string
  category: string
}

export interface ResourceDefinition {
  name: string
  label: string
  description: string
  category: string
  actions: Array<{
    name: string
    label: string
    description: string
  }>
}

// Universal CRUD actions that can be applied to any resource
export const UNIVERSAL_CRUD_ACTIONS = [
  { name: 'read', label: 'Read', description: 'View and read information' },
  { name: 'create', label: 'Create', description: 'Create new records' },
  { name: 'update', label: 'Update', description: 'Modify existing records' },
  { name: 'delete', label: 'Delete', description: 'Remove records from the system' },
  { name: 'manage', label: 'Manage', description: 'Full management capabilities (all actions)' },
  { name: 'view', label: 'View', description: 'View detailed information and reports' },
  { name: 'other', label: 'Other', description: 'Other specialized actions' },
]

// Resources that should only use their specific actions (no universal actions)
const UI_SPECIFIC_RESOURCES = ['ui_menu', 'ui_component']

// Define all available resources and their actions
export const PERMISSION_RESOURCES: ResourceDefinition[] = [
  // Core System Resources
  {
    name: 'dashboard',
    label: 'Dashboard',
    description: 'Main dashboard and overview pages',
    category: 'Core System',
    actions: [
      { name: 'access', label: 'Access', description: 'View dashboard and overview information' },
      { name: 'view_stats', label: 'View Statistics', description: 'View dashboard statistics and metrics' },
    ]
  },
  {
    name: 'admin',
    label: 'Administration',
    description: 'Administrative functions and panels',
    category: 'Core System',
    actions: [
      { name: 'access', label: 'Access', description: 'Access administrative panels and functions' },
    ]
  },

  // User Management Resources
  {
    name: 'users',
    label: 'Users',
    description: 'User accounts and profiles',
    category: 'User Management',
    actions: [
      { name: 'activate', label: 'Activate', description: 'Activate or deactivate user accounts' },
      { name: 'reset_password', label: 'Reset Password', description: 'Force password reset for users' },
    ]
  },
  {
    name: 'roles',
    label: 'Roles',
    description: 'User roles and role assignments',
    category: 'User Management',
    actions: [
      { name: 'assign', label: 'Assign', description: 'Assign roles to users' },
    ]
  },
  {
    name: 'permissions',
    label: 'Permissions',
    description: 'System permissions and access control',
    category: 'User Management',
    actions: [
      // No specific actions - will use universal CRUD actions
    ]
  },

  // Financial Resources
  {
    name: 'bank_accounts',
    label: 'Bank Accounts',
    description: 'Bank account management',
    category: 'Financial Management',
    actions: [
      // No specific actions - will use universal CRUD actions
    ]
  },
  {
    name: 'account_types',
    label: 'Account Types',
    description: 'Islamic finance account type configurations',
    category: 'Financial Management',
    actions: [
      { name: 'configure', label: 'Configure', description: 'Configure account type rules and properties' },
    ]
  },
  {
    name: 'transactions',
    label: 'Transactions',
    description: 'Financial transactions and transfers',
    category: 'Financial Management',
    actions: [
      { name: 'approve', label: 'Approve', description: 'Approve pending transactions' },
      { name: 'reject', label: 'Reject', description: 'Reject pending transactions' },
    ]
  },

  // Reporting Resources
  {
    name: 'reports',
    label: 'Reports',
    description: 'System reports and analytics',
    category: 'Reporting & Analytics',
    actions: [
      { name: 'export', label: 'Export', description: 'Export reports to various formats' },
      { name: 'schedule', label: 'Schedule', description: 'Schedule automated report generation' },
    ]
  },
  {
    name: 'analytics',
    label: 'Analytics',
    description: 'Business intelligence and data analytics',
    category: 'Reporting & Analytics',
    actions: [
      { name: 'export', label: 'Export', description: 'Export analytics data' },
    ]
  },

  // Customer Management Resources (Future)
  {
    name: 'customers',
    label: 'Customers',
    description: 'Customer accounts and profiles',
    category: 'Customer Management',
    actions: [
      { name: 'kyc', label: 'KYC Management', description: 'Manage Know Your Customer processes' },
    ]
  },
  {
    name: 'loans',
    label: 'Loans',
    description: 'Islamic finance loan products and applications',
    category: 'Financial Products',
    actions: [
      { name: 'approve', label: 'Approve', description: 'Approve loan applications' },
      { name: 'reject', label: 'Reject', description: 'Reject loan applications' },
    ]
  },
  {
    name: 'investments',
    label: 'Investments',
    description: 'Sharia-compliant investment products',
    category: 'Financial Products',
    actions: [
      // No specific actions - will use universal CRUD actions
    ]
  },

  // System Configuration Resources
  {
    name: 'settings',
    label: 'System Settings',
    description: 'System configuration and settings',
    category: 'System Configuration',
    actions: [
      // No specific actions - will use universal CRUD actions
    ]
  },
  {
    name: 'audit_logs',
    label: 'Audit Logs',
    description: 'System audit trails and logs',
    category: 'System Configuration',
    actions: [
      { name: 'export', label: 'Export', description: 'Export audit logs for compliance' },
    ]
  },

  // UI/Navigation Resources
  {
    name: 'ui_menu',
    label: 'UI Menu',
    description: 'User interface menu access',
    category: 'User Interface',
    actions: [
      { name: 'dashboard', label: 'Dashboard Menu', description: 'Access to dashboard menu item' },
      { name: 'admin', label: 'Admin Menu', description: 'Access to admin menu items' },
      { name: 'reports', label: 'Reports Menu', description: 'Access to reports menu item' },
      { name: 'transactions', label: 'Transactions Menu', description: 'Access to transactions menu item' },
      { name: 'analytics', label: 'Analytics Menu', description: 'Access to analytics menu item' },
      { name: 'settings', label: 'Settings Menu', description: 'Access to settings menu item' },
    ]
  },
  {
    name: 'ui_component',
    label: 'UI Component',
    description: 'User interface component access',
    category: 'User Interface',
    actions: [
      { name: 'user_profile', label: 'User Profile', description: 'Access to user profile components' },
      { name: 'admin_panel', label: 'Admin Panel', description: 'Access to admin panel components' },
      { name: 'financial_widgets', label: 'Financial Widgets', description: 'Access to financial dashboard widgets' },
    ]
  },
]

// Helper functions for easy access
export const getAllResources = (): Array<{ value: string; label: string; description: string; category: string }> => {
  return PERMISSION_RESOURCES.map(resource => ({
    value: resource.name,
    label: resource.label,
    description: resource.description,
    category: resource.category
  }))
}

export const getActionsForResource = (resourceName: string): Array<{ value: string; label: string; description: string }> => {
  const resource = PERMISSION_RESOURCES.find(r => r.name === resourceName)
  
  if (!resource) return []
  
  // For UI-specific resources, only return their specific actions
  if (UI_SPECIFIC_RESOURCES.includes(resourceName)) {
    return resource.actions.map(action => ({
      value: action.name,
      label: action.label,
      description: action.description
    }))
  }
  
  // For all other resources, combine specific actions with universal CRUD actions
  const specificActions = resource.actions.map(action => ({
    value: action.name,
    label: action.label,
    description: action.description
  }))
  
  const universalActions = UNIVERSAL_CRUD_ACTIONS.map(action => ({
    value: action.name,
    label: action.label,
    description: action.description
  }))
  
  // Combine and remove duplicates (specific actions take precedence)
  const allActions = [...specificActions, ...universalActions]
  const uniqueActions = allActions.filter((action, index, array) => 
    array.findIndex(a => a.value === action.value) === index
  )
  
  return uniqueActions
}

export const getPermissionDescription = (resourceName: string, actionName: string): string => {
  const resource = PERMISSION_RESOURCES.find(r => r.name === resourceName)
  
  // First check if it's a specific action for this resource
  const specificAction = resource?.actions.find(a => a.name === actionName)
  if (specificAction) {
    return specificAction.description
  }
  
  // Then check if it's a universal CRUD action
  const universalAction = UNIVERSAL_CRUD_ACTIONS.find(a => a.name === actionName)
  if (universalAction) {
    return `${universalAction.description} for ${resource?.label || resourceName}`
  }
  
  // Fallback to generic description
  return `${actionName} permission for ${resourceName}`
}

export const getResourceCategories = (): string[] => {
  const categories = new Set(PERMISSION_RESOURCES.map(r => r.category))
  return Array.from(categories).sort()
}

export const getResourcesByCategory = (): Record<string, ResourceDefinition[]> => {
  return PERMISSION_RESOURCES.reduce((acc, resource) => {
    if (!acc[resource.category]) {
      acc[resource.category] = []
    }
    acc[resource.category].push(resource)
    return acc
  }, {} as Record<string, ResourceDefinition[]>)
}

// Validation helpers
export const isValidResource = (resourceName: string): boolean => {
  return PERMISSION_RESOURCES.some(r => r.name === resourceName)
}

export const isValidAction = (resourceName: string, actionName: string): boolean => {
  const resource = PERMISSION_RESOURCES.find(r => r.name === resourceName)
  return resource ? resource.actions.some(a => a.name === actionName) : false
}

export const isValidPermission = (resourceName: string, actionName: string): boolean => {
  return isValidResource(resourceName) && isValidAction(resourceName, actionName)
}