import { createClient } from 'npm:@supabase/supabase-js@2'
import { hasRequiredPermission } from './permissionChecks.ts'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-roles',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

/**
 * Authenticate request and return user and supabase client
 * Only checks if user is logged in, no permission checks
 */
export async function authenticateUser(req: Request): Promise<{ user: any; supabase: ReturnType<typeof createClient> }> {
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

  return { user, supabase }
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
  // First authenticate the user
  const { user, supabase } = await authenticateUser(req)

  // Check if user has the required permission
  const hasPermission = await hasRequiredPermission(supabase, user.id, resource, action)
  
  if (!hasPermission) {
    throw new Error('Insufficient permissions')
  }

  return { user, supabase }
}

/**
 * Handle authentication and permission errors with appropriate HTTP responses
 */
export function handleAuthError(error: any): Response {
  console.error('Authentication/Permission error:', error)
  
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