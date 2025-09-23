import type { User } from '../types/auth'

// Cache for permission checks to avoid repeated calculations
const permissionCache = new Map<string, boolean>()
const CACHE_EXPIRY = 5 * 60 * 1000 // 5 minutes
let lastCacheClean = Date.now()

// Clean expired cache entries periodically
function cleanPermissionCache() {
  const now = Date.now()
  if (now - lastCacheClean > CACHE_EXPIRY) {
    permissionCache.clear()
    lastCacheClean = now
  }
}

// Generate cache key for permission checks
function getCacheKey(userId: string, resource: string, action: string): string {
  return `${userId}:${resource}:${action}`
}

// Flatten all permissions from roles
function getAllPermissions(user: User | null): Array<{ resource: string; action: string }> {
  if (!user || !user.roles) return []
  const perms = user.roles.flatMap(role =>
    role.role_permissions?.map(rp => rp.permissions).filter(Boolean) || []
  )
  // Remove duplicates
  const uniquePerms: Array<{ resource: string; action: string }> = []
  perms.forEach(p => {
    if (!uniquePerms.find(up => up.resource === p.resource && up.action === p.action)) {
      uniquePerms.push(p)
    }
  })
  return uniquePerms
}

export function hasPermission(user: User | null, resource: string, action: string): boolean {
  if (!user || !user.is_active) return false

  cleanPermissionCache()
  const cacheKey = getCacheKey(user.id, resource, action)
  if (permissionCache.has(cacheKey)) {
    return permissionCache.get(cacheKey)!
  }

  // Admin override
  if (user.roles?.some(r => r.name.toLowerCase() === 'admin')) {
    permissionCache.set(cacheKey, true)
    return true
  }

  const allPerms = getAllPermissions(user)
  const hasAccess = allPerms.some(p => p.resource === resource && p.action === action)

  permissionCache.set(cacheKey, hasAccess)
  return hasAccess
}

export function hasMenuAccess(user: User | null, menuId: string): boolean {
  if (!user || !user.is_active) return false
  return user.menu_access?.includes(menuId) ?? false
}

export function hasSubMenuAccess(user: User | null, menuId: string, subMenuId: string): boolean {
  if (!user || !user.is_active) return false
  return user.sub_menu_access?.[menuId]?.includes(subMenuId) ?? false
}

export function hasComponentAccess(user: User | null, componentId: string): boolean {
  if (!user || !user.is_active) return false
  return user.component_access?.includes(componentId) ?? false
}

export function isAdmin(user: User | null): boolean {
  if (!user || !user.is_active) return false
  return user.roles?.some(r => r.name.toLowerCase() === 'admin') ?? false
}

export function canAccessAdminPanel(user: User | null): boolean {
  return hasPermission(user, 'admin', 'access')
}

// Clear permission cache when user data changes
export function clearPermissionCache(): void {
  permissionCache.clear()
  lastCacheClean = Date.now()
}
