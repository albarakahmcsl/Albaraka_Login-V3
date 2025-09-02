import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface AccountType {
  id: string
  name: string
  description: string | null
  bank_account_id: string
  processing_fee: number
  is_member_account: boolean
  can_take_loan: boolean
  dividend_rate: number
  is_active: boolean
  created_at: string
  updated_at: string
  bank_account?: {
    id: string
    name: string
    account_number: string
  }
}

interface CreateAccountTypeData {
  name: string
  description?: string
  bank_account_id: string
  processing_fee?: number
  is_member_account?: boolean
  can_take_loan?: boolean
  dividend_rate?: number
  is_active?: boolean
}

interface UpdateAccountTypeData {
  name?: string
  description?: string
  bank_account_id?: string
  processing_fee?: number
  is_member_account?: boolean
  can_take_loan?: boolean
  dividend_rate?: number
  is_active?: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Authenticate the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id)

    if (userError || !userData || !userData.some(ur => ur.roles?.name === 'admin')) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const method = req.method

    // GET account types
    if (method === 'GET' && url.pathname.endsWith('/admin-account-types')) {
      const { data: accountTypesData, error: accountTypesError } = await supabase
        .from('account_types')
        .select(`
          *,
          bank_account:bank_accounts(
            id,
            name,
            account_number
          )
        `)
        .order('name', { ascending: true })

      if (accountTypesError) {
        return new Response(
          JSON.stringify({ error: accountTypesError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ account_types: accountTypesData || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST create account type
    if (method === 'POST' && url.pathname.endsWith('/admin-account-types')) {
      const body: CreateAccountTypeData = await req.json()
      const { 
        name, 
        description, 
        bank_account_id, 
        processing_fee = 0.00,
        is_member_account = false,
        can_take_loan = false,
        dividend_rate = 0.00,
        is_active = true
      } = body

      if (!name || !bank_account_id || typeof name !== 'string' || typeof bank_account_id !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Name and bank account ID are required and must be strings' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate numeric fields
      if (processing_fee < 0 || dividend_rate < 0 || dividend_rate > 100) {
        return new Response(
          JSON.stringify({ error: 'Processing fee must be non-negative and dividend rate must be between 0-100%' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Trim whitespace from inputs
      const trimmedName = name.trim()
      if (!trimmedName) {
        return new Response(
          JSON.stringify({ error: 'Account type name cannot be empty' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if account type name already exists
      const { data: existingAccountType, error: checkError } = await supabase
        .from('account_types')
        .select('id')
        .eq('name', trimmedName)
        .maybeSingle()

      if (checkError) {
        return new Response(
          JSON.stringify({ error: checkError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (existingAccountType) {
        return new Response(
          JSON.stringify({ error: 'Account type with this name already exists' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify bank account exists
      const { data: bankAccount, error: bankError } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('id', bank_account_id)
        .maybeSingle()

      if (bankError || !bankAccount) {
        return new Response(
          JSON.stringify({ error: 'Invalid bank account selected' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create the account type
      const { data: newAccountType, error: insertError } = await supabase
        .from('account_types')
        .insert({
          name: trimmedName,
          description: description?.trim() || null,
          bank_account_id,
          processing_fee,
          is_member_account,
          can_take_loan,
          dividend_rate,
          is_active
        })
        .select(`
          *,
          bank_account:bank_accounts(
            id,
            name,
            account_number
          )
        `)
        .single()

      if (insertError) {
        return new Response(
          JSON.stringify({ error: insertError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ account_type: newAccountType }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT update account type
    if (method === 'PUT') {
      const accountTypeId = url.pathname.split('/').pop()
      const body: UpdateAccountTypeData = await req.json()
      const { 
        name, 
        description, 
        bank_account_id, 
        processing_fee,
        is_member_account,
        can_take_loan,
        dividend_rate,
        is_active
      } = body

      if (!accountTypeId) {
        return new Response(
          JSON.stringify({ error: 'Account type ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const updateData: any = {}
      
      if (name !== undefined) {
        const trimmedName = name.trim()
        if (!trimmedName) {
          return new Response(
            JSON.stringify({ error: 'Account type name cannot be empty' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if another account type with same name exists
        const { data: existingAccountType, error: checkError } = await supabase
          .from('account_types')
          .select('id')
          .eq('name', trimmedName)
          .neq('id', accountTypeId)
          .maybeSingle()

        if (checkError) {
          return new Response(
            JSON.stringify({ error: checkError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (existingAccountType) {
          return new Response(
            JSON.stringify({ error: 'Another account type with this name already exists' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        updateData.name = trimmedName
      }

      if (description !== undefined) {
        updateData.description = description?.trim() || null
      }

      if (bank_account_id !== undefined) {
        // Verify bank account exists
        const { data: bankAccount, error: bankError } = await supabase
          .from('bank_accounts')
          .select('id')
          .eq('id', bank_account_id)
          .maybeSingle()

        if (bankError || !bankAccount) {
          return new Response(
            JSON.stringify({ error: 'Invalid bank account selected' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        updateData.bank_account_id = bank_account_id
      }

      if (processing_fee !== undefined) {
        if (processing_fee < 0) {
          return new Response(
            JSON.stringify({ error: 'Processing fee must be non-negative' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        updateData.processing_fee = processing_fee
      }

      if (dividend_rate !== undefined) {
        if (dividend_rate < 0 || dividend_rate > 100) {
          return new Response(
            JSON.stringify({ error: 'Dividend rate must be between 0-100%' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        updateData.dividend_rate = dividend_rate
      }

      if (is_member_account !== undefined) {
        updateData.is_member_account = is_member_account
      }

      if (can_take_loan !== undefined) {
        updateData.can_take_loan = can_take_loan
      }

      if (is_active !== undefined) {
        updateData.is_active = is_active
      }

      // Update the account type
      const { data: updatedAccountType, error: updateError } = await supabase
        .from('account_types')
        .update(updateData)
        .eq('id', accountTypeId)
        .select(`
          *,
          bank_account:bank_accounts(
            id,
            name,
            account_number
          )
        `)
        .single()

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ account_type: updatedAccountType }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE account type
    if (method === 'DELETE') {
      const accountTypeId = url.pathname.split('/').pop()
      
      if (!accountTypeId) {
        return new Response(
          JSON.stringify({ error: 'Account type ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // TODO: In future, check if account type is being used by any customer accounts
      // For now, we'll allow deletion but this should be restricted later

      const { error: deleteError } = await supabase
        .from('account_types')
        .delete()
        .eq('id', accountTypeId)

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ message: 'Account type deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-account-types function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})