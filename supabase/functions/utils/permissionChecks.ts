import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Check if a user has the required permission to perform an action on a resource
 * This function handles both admin/director roles (which have all permissions) 
 * and granular permission checks for specific roles
 */
export async function hasRequiredPermission(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  try {
    // Fetch user's roles and permissions in a single query
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        roles(
          name,
          role_permissions(
            permissions(
              resource,
              action
            )
          )
        )
      `)
      .eq('user_id', userId)

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError)
      return false
    }

    if (!userRoles || userRoles.length === 0) {
      console.log('User has no roles assigned')
      return false
    }

    // Check if user has admin or director role (these have all permissions)
    const hasAdminRole = userRoles.some(ur => 
      ur.roles?.name === 'admin' || ur.roles?.name === 'director'
    )

    if (hasAdminRole) {
      console.log('User has admin/director role - access granted')
      return true
    }

    // Check for specific permission
    const hasSpecificPermission = userRoles.some(ur =>
      ur.roles?.role_permissions?.some(rp =>
        rp.permissions?.resource === resource && rp.permissions?.action === action
      )
    )

    if (hasSpecificPermission) {
      console.log(`User has specific permission: ${resource}.${action}`)
      return true
    }

    console.log(`User lacks required permission: ${resource}.${action}`)
    return false

  } catch (error) {
    console.error('Error checking permissions:', error)
    return false
  }
}

/**
 * Authenticate request and check permissions
 * Returns the authenticated user if they have the required permission, otherwise throws an error
 */
export async function authenticateAndCheckPermission(
  req: Request,
  resource: string,
  action: string
): Promise<{ user: any; supabase: ReturnType<typeof createClient> }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Authenticate the request
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new Error('Missing authorization header')
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  
  if (authError || !user) {
    throw new Error('Invalid authorization token')
  }

  // Check if user has the required permission
  const hasPermission = await hasRequiredPermission(supabase, user.id, resource, action)
  
  if (!hasPermission) {
    throw new Error('Insufficient permissions')
  }

  return { user, supabase }
}