import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface User {
  id: string
  email: string
  full_name: string
  role_ids?: string[]
  menu_access: string[]
  sub_menu_access: Record<string, string[]>
  component_access: string[]
  is_active: boolean
  needs_password_reset: boolean
  roles?: Array<{
    id: string
    name: string
    description: string
  }>
}

function deriveAccessFields(permissions: Array<{ resource: string; action: string }>) {
  const menuAccess: string[] = []
  const subMenuAccess: Record<string, string[]> = {}
  const componentAccess: string[] = []

  const resourceToMenuMap: Record<string, string> = {
    dashboard: 'dashboard',
    users: 'user-management',
    roles: 'role-management',
    permissions: 'permission-management',
    bank_accounts: 'bank-accounts',
    account_types: 'account-types',
    reports: 'reports',
    transactions: 'transactions',
    analytics: 'analytics',
    admin: 'admin-panel',
  }

  permissions.forEach((permission) => {
    const menuId = resourceToMenuMap[permission.resource]
    if (menuId && !menuAccess.includes(menuId)) menuAccess.push(menuId)

    if (['manage', 'create', 'access'].includes(permission.action)) {
      const componentId = `${permission.resource}-${permission.action}`
      if (!componentAccess.includes(componentId)) componentAccess.push(componentId)
    }
  })

  if (!menuAccess.includes('dashboard')) menuAccess.push('dashboard')

  return {
    menu_access: menuAccess,
    sub_menu_access: subMenuAccess,
    component_access: componentAccess,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const frontendBaseUrl = Deno.env.get('FRONTEND_BASE_URL') || 'http://localhost:5173'

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch user's roles and permissions
    const { data: userRolesData, error: userRolesError } = await supabase
      .from('user_roles')
      .select('roles(id, name, role_permissions(permissions(resource, action)))')
      .eq('user_id', user.id)

    if (userRolesError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch user roles' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userRoles = userRolesData?.map((ur) => ur.roles).filter(Boolean) || []
    const userPermissions = userRoles.flatMap((role) =>
      role.role_permissions?.flatMap((rp) => rp.permissions) || []
    )

    // Define required permission for this resource
    const requiredAccess = { resource: 'users', action: 'access' } // user-management page

    const hasAccess = userPermissions.some(
      (p) => p.resource === requiredAccess.resource && p.action === requiredAccess.action
    )

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const method = req.method

    // GET users
    if (method === 'GET' && url.pathname.endsWith('/admin-users')) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          menu_access,
          sub_menu_access,
          component_access,
          is_active,
          created_at,
          needs_password_reset,
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
        .order('created_at', { ascending: false })

      if (usersError) return new Response(JSON.stringify({ error: usersError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      const users = usersData?.map((u) => {
        const roles = u.user_roles?.map((ur) => ur.roles).filter(Boolean) || []
        const allPermissions = roles.flatMap((role) => role.role_permissions?.map((rp) => rp.permissions).filter(Boolean) || [])
        const uniquePermissions = allPermissions.filter(
          (perm, i, arr) => arr.findIndex((p) => p.resource === perm.resource && p.action === perm.action) === i
        )

        return {
          ...u,
          roles,
          role_ids: roles.map((r) => r.id),
          permissions: uniquePermissions,
        }
      }) || []

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
