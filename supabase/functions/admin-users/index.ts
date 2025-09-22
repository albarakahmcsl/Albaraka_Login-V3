import { createClient } from 'npm:@supabase/supabase-js@2'
import { authenticateAndCheckPermission } from '../utils/permissionChecks.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-roles',
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

interface CreateUserData {
  email: string
  password: string
  full_name: string
  role_ids: string[]
  menu_access?: string[]
  sub_menu_access?: Record<string, string[]>
  component_access?: string[]
}

interface UpdateUserData {
  full_name: string
  role_ids: string[]
  menu_access: string[]
  sub_menu_access: Record<string, string[]>
  component_access: string[]
  is_active: boolean
  needs_password_reset?: boolean
}

function deriveAccessFields(permissions: Array<{ resource: string; action: string }>) {
  const menuAccess: string[] = []
  const subMenuAccess: Record<string, string[]> = {}
  const componentAccess: string[] = []

  permissions.forEach((permission) => {
    // Handle UI menu permissions
    if (permission.resource === 'ui_menu') {
      if (!menuAccess.includes(permission.action)) {
        menuAccess.push(permission.action)
      }
    }
    
    // Handle UI component permissions
    if (permission.resource === 'ui_component') {
      if (!componentAccess.includes(permission.action)) {
        componentAccess.push(permission.action)
      }
    }
    
    // Handle UI page permissions (also added to component access for routing)
    if (permission.resource === 'ui_page') {
      if (!componentAccess.includes(permission.action)) {
        componentAccess.push(permission.action)
      }
    }
  })

  // Ensure all users have dashboard access by default
  if (!menuAccess.includes('dashboard')) {
    menuAccess.push('dashboard')
  }

  return {
    menu_access: menuAccess,
    sub_menu_access: subMenuAccess,
    component_access: componentAccess,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // Authenticate and check permissions
    const { user, supabase } = await authenticateAndCheckPermission(req, 'users', 'manage')

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

      if (usersError) {
        return new Response(JSON.stringify({ error: usersError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

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

    // POST create user
    if (method === 'POST' && url.pathname.endsWith('/admin-users')) {
      const body: CreateUserData = await req.json()
      const { email, password, full_name, role_ids, menu_access = [], sub_menu_access = {}, component_access = [] } = body

      if (!email || !password || !full_name || !role_ids || !Array.isArray(role_ids) || role_ids.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Email, password, full name, and at least one role are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ error: 'Invalid email format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate roles exist
      const { data: validRoles, error: roleCheckError } = await supabase
        .from('roles')
        .select('id')
        .in('id', role_ids)

      if (roleCheckError || !validRoles || validRoles.length !== role_ids.length) {
        return new Response(
          JSON.stringify({ error: 'One or more invalid role IDs provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create user in auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

      if (authError) {
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create user profile in public.users
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email,
          full_name,
          menu_access,
          sub_menu_access,
          component_access,
          is_active: true,
          needs_password_reset: true // Force password change on first login
        })
        .select('*')
        .single()

      if (userError) {
        // Rollback: delete auth user
        await supabase.auth.admin.deleteUser(authUser.user.id)
        return new Response(
          JSON.stringify({ error: userError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Assign roles to user
      const userRoleInserts = role_ids.map(role_id => ({
        user_id: authUser.user.id,
        role_id
      }))

      const { error: roleAssignError } = await supabase
        .from('user_roles')
        .insert(userRoleInserts)

      if (roleAssignError) {
        // Rollback: delete user and auth user
        await supabase.from('users').delete().eq('id', authUser.user.id)
        await supabase.auth.admin.deleteUser(authUser.user.id)
        return new Response(
          JSON.stringify({ error: roleAssignError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch the created user with roles
      const { data: userWithRoles, error: fetchError } = await supabase
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
              description
            )
          )
        `)
        .eq('id', authUser.user.id)
        .single()

      if (fetchError) {
        return new Response(
          JSON.stringify({ error: fetchError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const userResponse = {
        ...userWithRoles,
        roles: userWithRoles.user_roles?.map(ur => ur.roles).filter(Boolean) || [],
        role_ids: userWithRoles.user_roles?.map(ur => ur.roles?.id).filter(Boolean) || []
      }

      return new Response(
        JSON.stringify({ user: userResponse }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT update user
    if (method === 'PUT') {
      const userId = url.pathname.split('/').pop()
      const body: UpdateUserData = await req.json()
      const { full_name, role_ids, menu_access, sub_menu_access, component_access, is_active, needs_password_reset } = body

      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!full_name || !role_ids || !Array.isArray(role_ids) || role_ids.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Full name and at least one role are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate roles exist
      const { data: validRoles, error: roleCheckError } = await supabase
        .from('roles')
        .select('id')
        .in('id', role_ids)

      if (roleCheckError || !validRoles || validRoles.length !== role_ids.length) {
        return new Response(
          JSON.stringify({ error: 'One or more invalid role IDs provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update user profile
      const { data: updatedUser, error: userError } = await supabase
        .from('users')
        .update({
          full_name,
          menu_access: menu_access || [],
          sub_menu_access: sub_menu_access || {},
          component_access: component_access || [],
          is_active,
          needs_password_reset: needs_password_reset || false
        })
        .eq('id', userId)
        .select('*')
        .single()

      if (userError) {
        return new Response(
          JSON.stringify({ error: userError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update user roles - delete existing and insert new ones
      const { error: deleteRolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)

      if (deleteRolesError) {
        return new Response(
          JSON.stringify({ error: deleteRolesError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Insert new role assignments
      const userRoleInserts = role_ids.map(role_id => ({
        user_id: userId,
        role_id
      }))

      const { error: insertRolesError } = await supabase
        .from('user_roles')
        .insert(userRoleInserts)

      if (insertRolesError) {
        return new Response(
          JSON.stringify({ error: insertRolesError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch the updated user with roles
      const { data: userWithRoles, error: fetchError } = await supabase
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
              description
            )
          )
        `)
        .eq('id', userId)
        .single()

      if (fetchError) {
        return new Response(
          JSON.stringify({ error: fetchError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const userResponse = {
        ...userWithRoles,
        roles: userWithRoles.user_roles?.map(ur => ur.roles).filter(Boolean) || [],
        role_ids: userWithRoles.user_roles?.map(ur => ur.roles?.id).filter(Boolean) || []
      }

      return new Response(
        JSON.stringify({ user: userResponse }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE user
    if (method === 'DELETE') {
      // Check delete permission for DELETE requests
      try {
        await authenticateAndCheckPermission(req, 'users', 'delete')
      } catch (deleteError) {
        // Fall back to manage permission for backward compatibility
        await authenticateAndCheckPermission(req, 'users', 'manage')
      }

      const userId = url.pathname.split('/').pop()
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if user exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', userId)
        .maybeSingle()

      if (checkError) {
        return new Response(
          JSON.stringify({ error: checkError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!existingUser) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete user from auth (this will cascade to user_roles due to foreign key constraints)
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId)

      if (authDeleteError) {
        return new Response(
          JSON.stringify({ error: authDeleteError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete user from public.users table (user_roles will be cascade deleted)
      const { error: userDeleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (userDeleteError) {
        return new Response(
          JSON.stringify({ error: userDeleteError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ message: 'User deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    
    // Handle specific error types
    if (error.message === 'Missing authorization header' || error.message === 'Invalid authorization token') {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (error.message === 'Insufficient permissions') {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})