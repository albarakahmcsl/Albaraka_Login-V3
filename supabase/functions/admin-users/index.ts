s)

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
      // Check update permission for PUT requests
      const { user, supabase } = await authenticateAndCheckPermission(req, 'users', 'update')

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
      const { user, supabase } = await authenticateAndCheckPermission(req, 'users', 'delete')

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
    return handleAuthError(error)
  }
})