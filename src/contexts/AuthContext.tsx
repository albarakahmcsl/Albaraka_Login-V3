import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { authApi, userProfileApi } from '../lib/dataFetching'
import { queryClient, queryKeys } from '../lib/queryClient'
import { clearPermissionCache } from '../utils/permissions'
import { withTimeout, deepEqual } from '../utils/helpers'

const USER_PROFILE_CACHE_KEY = 'user_profile_cache'
const INACTIVITY_TIMEOUT = 15 * 60 * 1000

const saveUserToCache = (user: any) => {
  try {
    localStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(user))
  } catch (error) {
    console.error('[AuthContext] Failed to save user to cache:', error)
  }
}

const getUserFromCache = (): any | null => {
  try {
    const cached = localStorage.getItem(USER_PROFILE_CACHE_KEY)
    if (cached) {
      const user = JSON.parse(cached)
      if (user && user.is_active) return user
    }
  } catch (error) {
    console.error('[AuthContext] Failed to load user from cache:', error)
  }
  return null
}

const clearUserFromCache = () => {
  try {
    localStorage.removeItem(USER_PROFILE_CACHE_KEY)
  } catch (error) {
    console.error('[AuthContext] Failed to clear user from cache:', error)
  }
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
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
    if (user) {
      inactivityTimerRef.current = setTimeout(() => {
        signOut()
      }, INACTIVITY_TIMEOUT)
    }
  }, [user])

  const fetchUserProfile = async (userId: string) => {
    try {
      const profile = await userProfileApi.fetchUserProfile(userId)
      return profile
    } catch (err) {
      console.error('[AuthContext] fetchUserProfile ERROR:', err)
      throw err
    }
  }

  const refreshUser = useCallback(async () => {
    if (!user) return
    try {
      const { data: { user: sessionUser }, error } = await supabase.auth.getUser()
      if (error || !sessionUser) {
        setUser(null)
        clearUserFromCache()
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
      saveUserToCache(profile)
      clearPermissionCache()
      resetInactivityTimer()
    } catch (err) {
      console.error('[AuthContext] refreshUser ERROR:', err)
      setError('Failed to refresh user profile.')
    }
  }, [user, resetInactivityTimer])

  useEffect(() => {
    const init = async () => {
      const cachedUser = getUserFromCache()
      if (cachedUser) {
        setUser(cachedUser)
        clearPermissionCache()
        setLoading(false)
      }

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session?.user) {
          setUser(null)
          clearUserFromCache()
          await supabase.auth.signOut()
        }
      } catch (err) {
        setUser(null)
        clearUserFromCache()
        await supabase.auth.signOut()
      } finally {
        setLoading(false)
      }
    }

    init()

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        clearUserFromCache()
      }
      if (event === 'SIGNED_IN' && session?.user) {
        await refreshUser()
      }
    })

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    const handleActivity = () => resetInactivityTimer()
    activityEvents.forEach(event => document.addEventListener(event, handleActivity, true))

    return () => {
      subscription.subscription.unsubscribe()
      activityEvents.forEach(event => document.removeEventListener(event, handleActivity, true))
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
    }
  }, []) // ✅ run once on mount, no infinite loop

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
    if (user?.id) queryClient.removeQueries({ queryKey: queryKeys.userProfile(user.id) })
    clearUserFromCache()
    setUser(null)
    setError(null)
    try {
      await supabase.auth.signOut()
    } catch {}
  }, [user])

  const changePassword = async (newPassword: string, clearNeedsPasswordReset: boolean = false) => {
    setLoading(true)
    setError(null)
    try {
      await authApi.updatePassword(newPassword, clearNeedsPasswordReset)
      await refreshUser()
    } catch (err: any) {
      setError(err.message || 'Failed to change password')
      throw err
    } finally {
      setLoading(false)
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
