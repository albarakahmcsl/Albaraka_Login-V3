import { createClient } from 'npm:@supabase/supabase-js@2'
import { authenticateAndCheckPermission, corsHeaders, handleAuthError } from '../utils/authChecks.ts'

interface Role {
  id: string
  name: string
  description: string | null
  created_at: string
  permissions?: Array<{
    id: string
    resource: string
    action: string
    description: string | null
  }>
}

interface CreateRoleData {
  name: string
  description?: string
  permission_ids?: string[]
}

interface UpdateRoleData {
  name: string
  description?: string
  permission_ids?: string[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const method = req.method

    // GET roles
    if (method === 'GET' && url.pathname.endsWith('/admin-roles')) {
      // Check view permission for GET requests
      const { user, supabase } = await authenticateAndCheckPermission(req, 'roles', 'view')

      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select(`
          id,
          name,
          description,
          created_at,
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

      if (rolesError) {
        return new Response(
          JSON.stringify({ error: rolesError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Transform data to include permissions array
      const roles = rolesData?.map(role => ({
        ...role,
        permissions: role.role_permissions?.map(rp => rp.permissions).filter(Boolean) || []
      })) || []

      return new Response(
        JSON.stringify({ roles }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST create role
    if (method === 'POST' && url.pathname.endsWith('/admin-roles')) {
      // Check create permission for POST requests
      const { user, supabase } = await authenticateAndCheckPermission(req, 'roles', 'create')

      const body: CreateRoleData = await req.json()
      const { name, description, permission_ids = [] } = body

      if (!name || typeof name !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Role name is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create the role
      const { data: newRole, error: roleError } = await supabase
        .from('roles')
        .insert({
          name,
          description: description || null
        })
        .select('*')
        .single()

      if (roleError) {
        return new Response(
          JSON.stringify({ error: roleError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Assign permissions to the role
      if (permission_ids.length > 0) {
        const rolePermissionInserts = permission_ids.map(permission_id => ({
          role_id: newRole.id,
          permission_id
        }))

        const { error: permissionError } = await supabase
          .from('role_permissions')
          .insert(rolePermissionInserts)

        if (permissionError) {
          // Rollback: delete the created role
          await supabase.from('roles').delete().eq('id', newRole.id)
          return new Response(
            JSON.stringify({ error: permissionError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // Fetch the created role with permissions
      const { data: roleWithPermissions, error: fetchError } = await supabase
        .from('roles')
        .select(`
          id,
          name,
          description,
          created_at,
          role_permissions(
            permissions(
              id,
              resource,
              action,
              description
            )
          )
        `)
        .eq('id', newRole.id)
        .single()

      if (fetchError) {
        return new Response(
          JSON.stringify({ error: fetchError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const roleResponse = {
        ...roleWithPermissions,
        permissions: roleWithPermissions.role_permissions?.map(rp => rp.permissions).filter(Boolean) || []
      }

      return new Response(
        JSON.stringify({ role: roleResponse }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT update role
    if (method === 'PUT') {
      // Check update permission for PUT requests
      const { user, supabase } = await authenticateAndCheckPermission(req, 'roles', 'update')

      const roleId = url.pathname.split('/').pop()
      const body: UpdateRoleData = await req.json()
      const { name, description, permission_ids = [] } = body

      if (!name || typeof name !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Role name is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update the role
      const { data: updatedRole, error: roleError } = await supabase
        .from('roles')
        .update({
          name,
          description: description || null
        })
        .eq('id', roleId)
        .select('*')
        .single()

      if (roleError) {
        return new Response(
          JSON.stringify({ error: roleError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update role permissions - delete existing and insert new ones
      const { error: deletePermissionsError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)

      if (deletePermissionsError) {
        return new Response(
          JSON.stringify({ error: deletePermissionsError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Insert new role permissions
      if (permission_ids.length > 0) {
        const rolePermissionInserts = permission_ids.map(permission_id => ({
          role_id: roleId,
          permission_id
        }))

        const { error: insertPermissionsError } = await supabase
          .from('role_permissions')
          .insert(rolePermissionInserts)

        if (insertPermissionsError) {
          return new Response(
            JSON.stringify({ error: insertPermissionsError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // Fetch the updated role with permissions
      const { data: roleWithPermissions, error: fetchError } = await supabase
        .from('roles')
        .select(`
          id,
          name,
          description,
          created_at,
          role_permissions(
            permissions(
              id,
              resource,
              action,
              description
            )
          )
        `)
        .eq('id', roleId)
        .single()

      if (fetchError) {
        return new Response(
          JSON.stringify({ error: fetchError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const roleResponse = {
        ...roleWithPermissions,
        permissions: roleWithPermissions.role_permissions?.map(rp => rp.permissions).filter(Boolean) || []
      }

      return new Response(
        JSON.stringify({ role: roleResponse }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE role
    if (method === 'DELETE') {
      // Check delete permission for DELETE requests
      const { user, supabase } = await authenticateAndCheckPermission(req, 'roles', 'delete')

      const roleId = url.pathname.split('/').pop()
      
      // Check if role is being used by any users
      const { data: usersWithRole, error: checkError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role_id', roleId)
        .limit(1)

      if (checkError) {
        return new Response(
          JSON.stringify({ error: checkError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (usersWithRole && usersWithRole.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Cannot delete role that is assigned to users' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete the role (role_permissions will be cascade deleted)
      const { error: deleteError } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId)

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ message: 'Role deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-roles function:', error)
    return handleAuthError(error)
  }
})