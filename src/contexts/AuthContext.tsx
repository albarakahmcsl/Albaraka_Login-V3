import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { User } from '../types/auth'
import { userProfileApi, authApi } from '../lib/dataFetching'
import { queryKeys } from '../lib/queryClient'
import { clearPermissionCache } from '../utils/permissions'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  changePassword: (newPassword: string, clearNeedsPasswordReset?: boolean) => Promise<void>
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
  const [authSession, setAuthSession] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const {
    data: user,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: queryKeys.userProfile(authSession?.user?.id || ''),
    queryFn: async () => {
      if (!authSession?.user?.id) return null
      const profile = await userProfileApi.fetchUserProfile(authSession.user.id)

      // Clear permission cache when user profile is fetched
      clearPermissionCache()

      return profile
    },
    enabled: !!authSession?.user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const loading = authLoading || profileLoading

  const refreshUser = useCallback(async () => {
    if (!authSession?.user?.id) return
    try {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.userProfile(authSession.user.id),
      })
      await refetchProfile()
    } catch (err) {
      console.error('Error refreshing user profile:', err)
    }
  }, [authSession?.user?.id, queryClient, refetchProfile])

  const changePassword = useCallback(
    async (newPassword: string, clearNeedsPasswordReset = false) => {
      if (!authSession?.user?.id) return
      try {
        await authApi.updatePassword(newPassword, clearNeedsPasswordReset)
        await refreshUser()
      } catch (err: any) {
        console.error('Error changing password:', err)
        throw new Error(err.message || 'Failed to change password')
      }
    },
    [authSession?.user?.id, refreshUser]
  )

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
    } catch (err: any) {
      console.error('Error sending password reset email:', err)
      throw new Error(err.message || 'Failed to send password reset email')
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null)
    setAuthLoading(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(signInError.message)
        setAuthLoading(false)
        return
      }
      // onAuthStateChange will handle session update and profile fetch
    } catch (err: any) {
      console.error('SignIn error:', err)
      setError(err.message || 'Login failed')
      setAuthLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    setAuthLoading(true)
    try {
      const currentUserId = authSession?.user?.id
      if (currentUserId) {
        queryClient.setQueryData(queryKeys.userProfile(currentUserId), null)
      }

      await supabase.auth.signOut()
      setAuthSession(null)
      setError(null)

      if (currentUserId) {
        await queryClient.removeQueries({ queryKey: queryKeys.userProfile(currentUserId) })
      }
      await queryClient.removeQueries({ queryKey: queryKeys.currentUser() })
      clearPermissionCache()
    } catch (err: any) {
      console.error('SignOut error:', err)
    } finally {
      setAuthLoading(false)
    }
  }, [authSession?.user?.id, queryClient])

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          console.error('Session error:', sessionError)
          if (isMounted) setError(sessionError.message)
        } else if (isMounted) {
          setAuthSession(session)
        }
      } catch (err: any) {
        console.error('Auth initialization error:', err)
        if (isMounted) setError(err.message || 'Authentication initialization failed')
      } finally {
        if (isMounted) setAuthLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return

      if (event === 'SIGNED_OUT' || !session?.user) {
        setAuthSession(null)
        clearPermissionCache()
        setAuthLoading(false)
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setAuthSession(session)
        clearPermissionCache()
        setAuthLoading(false)
        if (session?.user?.id) {
          await queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(session.user.id) })
        }
      }
    })

    init()
    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [queryClient])

  useEffect(() => {
    if (profileError && !error) {
      setError(profileError instanceof Error ? profileError.message : 'Failed to fetch user profile')
    }
  }, [profileError, error])

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        loading,
        signIn,
        signOut,
        refreshUser,
        changePassword,
        sendPasswordResetEmail,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
