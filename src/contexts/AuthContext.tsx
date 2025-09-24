import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { authApi, userProfileApi } from '../lib/dataFetching'
import { queryClient, queryKeys } from '../lib/queryClient'
import { clearPermissionCache } from '../utils/permissions'
import { withTimeout, deepEqual } from '../utils/helpers'

const USER_PROFILE_CACHE_KEY = 'user_profile_cache'

const saveUserToCache = (user: any) => {
  try {
    localStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(user))
  } catch {}
}

const getUserFromCache = (): any | null => {
  try {
    const cached = localStorage.getItem(USER_PROFILE_CACHE_KEY)
    if (cached) {
      const user = JSON.parse(cached)
      if (user && user.is_active) return user
    }
  } catch {}
  return null
}

const clearUserFromCache = () => {
  try {
    localStorage.removeItem(USER_PROFILE_CACHE_KEY)
  } catch {}
}

interface AuthContextType {
  user: any | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  changePassword: (newPassword: string, clearNeedsPasswordReset?: boolean) => Promise<void>
  sendPasswordResetEmail: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserProfile = async (userId: string) => {
    return await userProfileApi.fetchUserProfile(userId)
  }

  useEffect(() => {
    const init = async () => {
      const cachedUser = getUserFromCache()
      if (cachedUser) {
        setUser(cachedUser)
        clearPermissionCache()
        setLoading(false)
      } else {
        setLoading(true)
      }

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
          setUser(null)
          clearUserFromCache()
          await supabase.auth.signOut()
          setLoading(false)
        } else if (!cachedUser) {
          setLoading(false)
        }
      } catch {
        setUser(null)
        clearUserFromCache()
        await supabase.auth.signOut()
        setLoading(false)
      }
    }

    init()

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          const freshProfile = await withTimeout(
            queryClient.fetchQuery({
              queryKey: queryKeys.userProfile(session.user.id),
              queryFn: () => fetchUserProfile(session.user.id),
              staleTime: Infinity,
              gcTime: Infinity,
            }),
            8000,
            'Profile fetch timed out during auth state change'
          )

          if (!freshProfile?.is_active) {
            setUser(null)
            clearUserFromCache()
            queryClient.removeQueries({ queryKey: queryKeys.userProfile(session.user.id) })
            await supabase.auth.signOut()
            return
          }

          if (!deepEqual(user, freshProfile)) {
            setUser(freshProfile)
            saveUserToCache(freshProfile)
            clearPermissionCache()
          }
        } else {
          setUser(null)
          clearUserFromCache()
          if (user?.id) {
            queryClient.removeQueries({ queryKey: queryKeys.userProfile(user.id) })
          }
        }

        if (loading) setLoading(false)
      } catch (err: any) {
        if (err instanceof Error && err.message.includes('timed out')) {
          setError('Profile refresh timed out. Using existing session data.')
        } else {
          setError('Failed to refresh user profile. Some features may not work correctly.')
        }
        if (loading) setLoading(false)
      }
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      if (data.user) {
        const profile = await withTimeout(
          fetchUserProfile(data.user.id),
          8000,
          'Profile fetch timed out during sign in'
        )

        if (!profile?.is_active) {
          await supabase.auth.signOut()
          throw new Error('Account is inactive')
        }

        setUser(profile)
        clearPermissionCache()
        saveUserToCache(profile)
      }
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    if (user?.id) queryClient.removeQueries({ queryKey: queryKeys.userProfile(user.id) })
    clearUserFromCache()
    setUser(null)
    setError(null)
    try {
      await supabase.auth.signOut()
    } catch {}
  }

  const changePassword = async (newPassword: string, clearNeedsPasswordReset: boolean = false) => {
    setLoading(true)
    setError(null)

    try {
      const result = await authApi.updatePassword(newPassword, clearNeedsPasswordReset)
      await refreshUser()
      return result
    } catch (err: any) {
      setError(err.message || 'Failed to change password')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    if (!user) return

    try {
      const { data: { user: sessionUser }, error } = await supabase.auth.getUser()
      if (error || !sessionUser) {
        setUser(null)
        clearUserFromCache()
        if (user?.id) queryClient.removeQueries({ queryKey: queryKeys.userProfile(user.id) })
        return
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(sessionUser.id) })

      const profile = await queryClient.fetchQuery({
        queryKey: queryKeys.userProfile(sessionUser.id),
        queryFn: () => fetchUserProfile(sessionUser.id),
        staleTime: Infinity,
        gcTime: Infinity,
      })

      if (!profile?.is_active) {
        setUser(null)
        queryClient.removeQueries({ queryKey: queryKeys.userProfile(sessionUser.id) })
        await supabase.auth.signOut()
        return
      }

      setUser(profile)
      clearPermissionCache()
      saveUserToCache(profile)
    } catch {
      setError('Failed to refresh user profile. Using existing data.')
    }
  }

  const sendPasswordResetEmail = async (email: string) => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      signIn,
      signOut,
      refreshUser,
      changePassword,
      sendPasswordResetEmail
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
