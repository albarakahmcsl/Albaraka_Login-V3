import { createClient } from 'npm:@supabase/supabase-js@2'
import { authenticateUser, corsHeaders, handleAuthError } from '../utils/authChecks.ts'

interface BankAccount {
  id: string
  name: string
  account_number: string
  created_at: string
}

interface CreateBankAccountData {
  name: string
  account_number: string
}

interface UpdateBankAccountData {
  name?: string
  account_number?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const method = req.method

    // GET bank accounts
    if (method === 'GET' && url.pathname.endsWith('/admin-bank-accounts')) {
      // Only check if user is logged in
      const { user, supabase } = await authenticateUser(req)

      const { data: bankAccountsData, error: bankAccountsError } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('name', { ascending: true })

      if (bankAccountsError) {
        return new Response(
          JSON.stringify({ error: bankAccountsError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ bank_accounts: bankAccountsData || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST create bank account
    if (method === 'POST' && url.pathname.endsWith('/admin-bank-accounts')) {
      // Only check if user is logged in
      const { user, supabase } = await authenticateUser(req)

      const body: CreateBankAccountData = await req.json()
      const { name, account_number } = body

      if (!name || !account_number || typeof name !== 'string' || typeof account_number !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Name and account number are required and must be strings' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Trim whitespace from inputs
      const trimmedName = name.trim()
      const trimmedAccountNumber = account_number.trim()

      if (!trimmedName || !trimmedAccountNumber) {
        return new Response(
          JSON.stringify({ error: 'Name and account number cannot be empty' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if account number already exists
      const { data: existingAccount, error: checkError } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('account_number', trimmedAccountNumber)
        .maybeSingle()

      if (checkError) {
        return new Response(
          JSON.stringify({ error: checkError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (existingAccount) {
        return new Response(
          JSON.stringify({ error: 'Bank account with this number already exists' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create the bank account
      const { data: newBankAccount, error: insertError } = await supabase
        .from('bank_accounts')
        .insert({
          name: trimmedName,
          account_number: trimmedAccountNumber
        })
        .select('*')
        .single()

      if (insertError) {
        return new Response(
          JSON.stringify({ error: insertError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ bank_account: newBankAccount }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT update bank account
    if (method === 'PUT') {
      // Only check if user is logged in
      const { user, supabase } = await authenticateUser(req)

      const bankAccountId = url.pathname.split('/').pop()
      const body: UpdateBankAccountData = await req.json()
      const { name, account_number } = body

      if (!bankAccountId) {
        return new Response(
          JSON.stringify({ error: 'Bank account ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!name && !account_number) {
        return new Response(
          JSON.stringify({ error: 'At least one field (name or account_number) is required for update' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const updateData: any = {}
      
      if (name) {
        const trimmedName = name.trim()
        if (!trimmedName) {
          return new Response(
            JSON.stringify({ error: 'Name cannot be empty' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        updateData.name = trimmedName
      }

      if (account_number) {
        const trimmedAccountNumber = account_number.trim()
        if (!trimmedAccountNumber) {
          return new Response(
            JSON.stringify({ error: 'Account number cannot be empty' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if another bank account with same account number exists
        const { data: existingAccount, error: checkError } = await supabase
          .from('bank_accounts')
          .select('id')
          .eq('account_number', trimmedAccountNumber)
          .neq('id', bankAccountId)
          .maybeSingle()

        if (checkError) {
          return new Response(
            JSON.stringify({ error: checkError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (existingAccount) {
          return new Response(
            JSON.stringify({ error: 'Another bank account with this number already exists' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        updateData.account_number = trimmedAccountNumber
      }

      // Update the bank account
      const { data: updatedBankAccount, error: updateError } = await supabase
        .from('bank_accounts')
        .update(updateData)
        .eq('id', bankAccountId)
        .select('*')
        .single()

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ bank_account: updatedBankAccount }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE bank account
    if (method === 'DELETE') {
      // Only check if user is logged in
      const { user, supabase } = await authenticateUser(req)

      const bankAccountId = url.pathname.split('/').pop()
      
      if (!bankAccountId) {
        return new Response(
          JSON.stringify({ error: 'Bank account ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: deleteError } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', bankAccountId)

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ message: 'Bank account deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-bank-accounts function:', error)
    return handleAuthError(error)
  }
})