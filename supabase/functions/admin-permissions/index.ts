import { createClient } from 'npm:@supabase/supabase-js@2'
import { authenticateAndCheckPermission, corsHeaders, handleAuthError } from '../utils/authChecks.ts'

interface Permission {
  id: string
  resource: string
  action: string
  description: string | null
  created_at: string
}

interface CreatePermissionData {
  resource: string
  action: string
  description?: string
}

interface UpdatePermissionData {
  resource: string
  action: string
  description?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const method = req.method

    // GET permissions
    if (method === 'GET' && url.pathname.endsWith('/admin-permissions')) {
      // Check view permission for GET requests
      const { user, supabase } = await authenticateAndCheckPermission(req, 'permissions', 'view')

      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permissions')
        .select('*')
        .order('resource', { ascending: true })
        .order('action', { ascending: true })

      if (permissionsError) {
        return new Response(
          JSON.stringify({ error: permissionsError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ permissions: permissionsData || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST create permission
    if (method === 'POST' && url.pathname.endsWith('/admin-permissions')) {
      // Check create permission for POST requests
      const { user, supabase } = await authenticateAndCheckPermission(req, 'permissions', 'create')

      const body: CreatePermissionData = await req.json()
      const { resource, action, description } = body

      if (!resource || !action || typeof resource !== 'string' || typeof action !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Resource and action are required and must be strings' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if permission already exists
      const { data: existingPermission, error: checkError } = await supabase
        .from('permissions')
        .select('id')
        .eq('resource', resource)
        .eq('action', action)
        .maybeSingle()

      if (checkError) {
        return new Response(
          JSON.stringify({ error: checkError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (existingPermission) {
        return new Response(
          JSON.stringify({ error: 'Permission with this resource and action already exists' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create the permission
      const { data: newPermission, error: permissionError } = await supabase
        .from('permissions')
        .insert({
          resource,
          action,
          description: description || null
        })
        .select('*')
        .single()

      if (permissionError) {
        return new Response(
          JSON.stringify({ error: permissionError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ permission: newPermission }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT update permission
    if (method === 'PUT') {
      // Check update permission for PUT requests
      const { user, supabase } = await authenticateAndCheckPermission(req, 'permissions', 'update')

      const permissionId = url.pathname.split('/').pop()
      const body: UpdatePermissionData = await req.json()
      const { resource, action, description } = body

      if (!resource || !action || typeof resource !== 'string' || typeof action !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Resource and action are required and must be strings' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if another permission with same resource/action exists
      const { data: existingPermission, error: checkError } = await supabase
        .from('permissions')
        .select('id')
        .eq('resource', resource)
        .eq('action', action)
        .neq('id', permissionId)
        .maybeSingle()

      if (checkError) {
        return new Response(
          JSON.stringify({ error: checkError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (existingPermission) {
        return new Response(
          JSON.stringify({ error: 'Another permission with this resource and action already exists' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update the permission
      const { data: updatedPermission, error: updateError } = await supabase
        .from('permissions')
        .update({
          resource,
          action,
          description: description || null
        })
        .eq('id', permissionId)
        .select('*')
        .single()

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ permission: updatedPermission }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE permission
    if (method === 'DELETE') {
      // Check delete permission for DELETE requests
      const { user, supabase } = await authenticateAndCheckPermission(req, 'permissions', 'delete')

      const permissionId = url.pathname.split('/').pop()
      
      // Check if permission is being used by any roles
      const { data: rolesWithPermission, error: checkError } = await supabase
        .from('role_permissions')
        .select('role_id')
        .eq('permission_id', permissionId)
        .limit(1)

      if (checkError) {
        return new Response(
          JSON.stringify({ error: checkError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (rolesWithPermission && rolesWithPermission.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Cannot delete permission that is assigned to roles' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete the permission
      const { error: deleteError } = await supabase
        .from('permissions')
        .delete()
        .eq('id', permissionId)

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ message: 'Permission deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-permissions function:', error)
    return handleAuthError(error)
  }
})