import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react'
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  console.log('[AuthContext] Initializing AuthProvider...')

  const refreshUser = useCallback(async () => {
    console.log('[AuthContext] Refreshing user profile...')
    if (!user?.id) {
      console.log('[AuthContext] No user ID available for refresh')
      return
    }

    try {
      const profile = await userProfileApi.fetchUserProfile(user.id)
      if (profile) {
        setUser(profile)
        console.log('[AuthContext] User profile refreshed:', profile)
      } else {
        console.log('[AuthContext] User profile not found during refresh')
        await signOut()
        setError('User profile not found. Please contact an administrator.')
      }
    } catch (err: any) {
      console.error('[AuthContext] Error refreshing user profile:', err)
      setError('Failed to refresh user profile')
    }
  }, [user?.id])

  const changePassword = useCallback(async (newPassword: string) => {
    console.log('[AuthContext] Changing password...')
    if (!user?.id) throw new Error('No user logged in')

    try {
      // 1️⃣ Update password in Supabase
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (passwordError) {
        console.error('[AuthContext] Supabase password update error:', passwordError)
        throw new Error(passwordError.message)
      }

      console.log('[AuthContext] Password changed successfully in Supabase')

      // 2️⃣ Update needs_password_reset in your database
      const { error: profileUpdateError } = await supabase
        .from('users') // Replace with your actual table name
        .update({ needs_password_reset: false })
        .eq('id', user.id)
        .select()

      if (profileUpdateError) {
        console.error('[AuthContext] Failed to update needs_password_reset:', profileUpdateError)
        throw new Error(profileUpdateError.message)
      }

      console.log('[AuthContext] needs_password_reset set to false in database')

      // 3️⃣ Refresh user profile
      await refreshUser()

    } catch (err: any) {
      console.error('[AuthContext] Error changing password:', err)
      throw new Error(err.message || 'Failed to change password')
    }
  }, [user?.id, refreshUser])

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    console.log('[AuthContext] Sending password reset email to:', email)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error
      console.log('[AuthContext] Password reset email sent successfully')
    } catch (err: any) {
      console.error('[AuthContext] Error sending password reset email:', err)
      throw new Error(err.message || 'Failed to send password reset email')
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('[AuthContext] Attempting signIn for:', email)
    setError(null)
    setLoading(true)
    
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })
      
      if (signInError) {
        console.error('[AuthContext] signIn error:', signInError)
        setError(signInError.message)
        setLoading(false)
        return
      }

      console.log('[AuthContext] signIn successful, waiting for auth state change...')
    } catch (err: any) {
      console.error('[AuthContext] Unexpected signIn error:', err)
      setError(err.message || 'Login failed')
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    console.log('[AuthContext] Signing out...')
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
    console.log('[AuthContext] Setting up auth state listener...')

    const init = async () => {
      try {
        console.log('[AuthContext] Getting initial session...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('[AuthContext] Session error:', sessionError)
          await supabase.auth.signOut()
          setUser(null)
          setError('Session error. Please try logging in again.')
          setLoading(false)
          return
        }

        if (!session?.user) {
          console.log('[AuthContext] No session found')
          setUser(null)
          setLoading(false)
          return
        }

        console.log('[AuthContext] Session found, fetching user profile...')
        const profile = await userProfileApi.fetchUserProfile(session.user.id)

        if (!profile) {
          console.log('[AuthContext] User profile not found')
          await supabase.auth.signOut()
          setUser(null)
          setError('User profile not found. Please contact an administrator.')
          setLoading(false)
          return
        }

        if (!profile.is_active) {
          console.log('[AuthContext] User account is inactive')
          await supabase.auth.signOut()
          setUser(null)
          setError('Your account is inactive. Please contact an administrator.')
          setLoading(false)
          return
        }

        console.log('[AuthContext] User profile loaded successfully:', profile)
        setUser(profile)
        setError(null)

      } catch (err: any) {
        console.error('[AuthContext] Initialization error:', err)
        setUser(null)
        setError('Authentication initialization failed. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state changed:', event, session?.user?.id)
      
      try {
        if (event === 'SIGNED_OUT' || !session?.user) {
          console.log('[AuthContext] User signed out or no session')
          setUser(null)
          setError(null)
          setLoading(false)
          return
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('[AuthContext] User signed in or token refreshed, fetching profile...')
          const profile = await userProfileApi.fetchUserProfile(session.user.id)
          
          if (!profile) {
            console.log('[AuthContext] User profile not found')
            await supabase.auth.signOut()
            setUser(null)
            setError('User profile not found. Please contact an administrator.')
            setLoading(false)
            return
          }

          if (!profile.is_active) {
            console.log('[AuthContext] User account is inactive')
            await supabase.auth.signOut()
            setUser(null)
            setError('Your account is inactive. Please contact an administrator.')
            setLoading(false)
            return
          }

          console.log('[AuthContext] User profile loaded:', profile)
          setUser(profile)
          setError(null)
        }
      } catch (err: any) {
        console.error('[AuthContext] onAuthStateChange ERROR:', err.message)
        setError('Authentication error occurred. Please try again.')
      } finally {
        setLoading(false)
      }
    })

    init()

    return () => {
      console.log('[AuthContext] Cleaning up auth listener...')
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signOut, 
      refreshUser,
      changePassword,
      sendPasswordResetEmail,
      error 
    }}>
      {children}
    </AuthContext.Provider>
  )
}
