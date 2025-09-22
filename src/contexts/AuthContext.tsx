import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { User } from '../types/auth'
import { userProfileApi, authApi } from '../lib/dataFetching'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  changePassword: (newPassword: string) => Promise<void>
  sendPasswordResetEmail: (email: string) => Promise<void>
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  console.log('[AuthContext] Initializing AuthProvider...')

  const refreshUser = useCallback(async () => {
    if (!user?.id) return
    try {
      const profile = await userProfileApi.fetchUserProfile(user.id)
      if (profile) setUser(profile)
      else {
        await signOut()
        setError('User profile not found. Please contact an administrator.')
      }
    } catch (err: any) {
      console.error('[AuthContext] Error refreshing user profile:', err)
      setError('Failed to refresh user profile')
    }
  }, [user?.id])

  const changePassword = useCallback(async (newPassword: string) => {
    if (!user?.id) throw new Error('No user logged in')
    try {
      // 1️⃣ Update password in Supabase
      const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword })
      if (passwordError) throw new Error(passwordError.message)

      console.log('[AuthContext] Password updated successfully')

      // 2️⃣ Update needs_password_reset to false in DB
      const { error: dbError } = await supabase
        .from('users') // replace with your actual table name
        .update({ needs_password_reset: false })
        .eq('id', user.id)

      if (dbError) throw new Error(dbError.message)
      console.log('[AuthContext] needs_password_reset set to false in database')

      // 3️⃣ Refresh user profile
      await refreshUser()
    } catch (err: any) {
      console.error('[AuthContext] Error changing password:', err)
      throw new Error(err.message || 'Failed to change password')
    }
  }, [user?.id, refreshUser])

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
    } catch (err: any) {
      console.error('[AuthContext] Error sending password reset email:', err)
      throw new Error(err.message || 'Failed to send password reset email')
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null)
    setLoading(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }
      console.log('[AuthContext] Sign-in successful, waiting for auth state change...')
    } catch (err: any) {
      setError(err.message || 'Login failed')
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setUser(null)
      setError(null)
    } catch (err: any) {
      console.error('[AuthContext] Error during signOut:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!session?.user) {
          setUser(null)
          setLoading(false)
          return
        }

        const profile = await userProfileApi.fetchUserProfile(session.user.id)
        if (!profile) {
          await supabase.auth.signOut()
          setUser(null)
          setError('User profile not found.')
          setLoading(false)
          return
        }
        if (!profile.is_active) {
          await supabase.auth.signOut()
          setUser(null)
          setError('Your account is inactive.')
          setLoading(false)
          return
        }
        setUser(profile)
        setError(null)
      } catch (err: any) {
        console.error('[AuthContext] Initialization error:', err)
        setUser(null)
        setError('Authentication initialization failed.')
      } finally {
        setLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null)
          setError(null)
          setLoading(false)
          return
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const profile = await userProfileApi.fetchUserProfile(session.user.id)
          if (!profile) {
            await supabase.auth.signOut()
            setUser(null)
            setError('User profile not found.')
            setLoading(false)
            return
          }
          if (!profile.is_active) {
            await supabase.auth.signOut()
            setUser(null)
            setError('Your account is inactive.')
            setLoading(false)
            return
          }
          setUser(profile)
          setError(null)
        }
      } catch (err: any) {
        console.error('[AuthContext] onAuthStateChange ERROR:', err.message)
        setError('Authentication error occurred.')
      } finally {
        setLoading(false)
      }
    })

    init()

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser, changePassword, sendPasswordResetEmail, error }}>
      {children}
    </AuthContext.Provider>
  )
}
