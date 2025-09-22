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
    console.log('[AuthContext] Saved user to cache:', user)
  } catch (error) {
    console.error('[AuthContext] Failed to save user to cache:', error)
  }
}

const getUserFromCache = (): any | null => {
  try {
    const cached = localStorage.getItem(USER_PROFILE_CACHE_KEY)
    if (cached) {
      const user = JSON.parse(cached)
      if (user && user.is_active) {
        console.log('[AuthContext] Loaded user from cache:', user)
        return user
      }
    }
  } catch (error) {
    console.error('[AuthContext] Failed to load user from cache:', error)
  }
  return null
}

const clearUserFromCache = () => {
  try {
    localStorage.removeItem(USER_PROFILE_CACHE_KEY)
    console.log('[AuthContext] Cleared user from cache')
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
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    if (user) {
      console.log('[AuthContext] Resetting inactivity timer for user:', user.id)
      inactivityTimerRef.current = setTimeout(() => {
        console.log('[AuthContext] Inactivity timeout - logging out user:', user.id)
        signOut()
      }, INACTIVITY_TIMEOUT)
    }
  }, [user])

  const fetchUserProfile = async (userId: string) => {
    console.log('[AuthContext] fetchUserProfile START:', userId)
    try {
      const profile = await userProfileApi.fetchUserProfile(userId)
      console.log('[AuthContext] fetchUserProfile SUCCESS:', profile)
      return profile
    } catch (err) {
      console.error('[AuthContext] fetchUserProfile ERROR:', err)
      throw err
    }
  }

  useEffect(() => {
    console.log('[AuthContext] Initializing AuthProvider...')
    const init = async () => {
      console.log('[AuthContext] Checking localStorage for cached user...')
      const cachedUser = getUserFromCache()
      if (cachedUser) {
        setUser(cachedUser)
        clearPermissionCache()
        setLoading(false)
      }

      try {
        console.log('[AuthContext] Fetching Supabase session...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) console.error('[AuthContext] getSession ERROR:', sessionError)

        if (session?.user) {
          console.log('[AuthContext] Session exists:', session.user)
        } else {
          console.log('[AuthContext] No active session found')
          setUser(null)
          clearUserFromCache()
        }
      } catch (err) {
        console.error('[AuthContext] init ERROR:', err)
      } finally {
        setLoading(false)
        console.log('[AuthContext] AuthProvider init DONE')
      }
    }

    init()

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] onAuthStateChange:', event, 'session:', !!session)
      try {
        if (session?.user) {
          console.log('[AuthContext] Auth state change - fetching profile for user:', session.user.id)
          const profile = await withTimeout(
            queryClient.fetchQuery({
              queryKey: queryKeys.userProfile(session.user.id),
              queryFn: () => fetchUserProfile(session.user.id),
              staleTime: Infinity,
              gcTime: Infinity
            }),
            5000,
            'Profile fetch timed out'
          )
          if (!profile) {
            console.warn('[AuthContext] Profile not found, signing out')
            await signOut()
            setError('User profile not found')
            return
          }
          if (!profile.is_active) {
            console.warn('[AuthContext] User inactive, signing out')
            await signOut()
            setError('Account inactive')
            return
          }
          console.log('[AuthContext] Setting user state:', profile)
          setUser(profile)
          saveUserToCache(profile)
          clearPermissionCache()
          resetInactivityTimer()
        } else {
          console.log('[AuthContext] No session, clearing user')
          setUser(null)
          clearUserFromCache()
        }
      } catch (err) {
        console.error('[AuthContext] onAuthStateChange ERROR:', err)
      }
    })

    return () => {
      subscription.subscription.unsubscribe()
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    }
  }, [resetInactivityTimer])

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('[AuthContext] signIn START:', email)
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        console.error('[AuthContext] signIn ERROR:', error)
        throw error
      }
      console.log('[AuthContext] signIn SUCCESS:', data)
    } catch (err: any) {
      setError(err.message)
      console.error('[AuthContext] signIn CATCH:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    console.log('[AuthContext] signOut START')
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    setUser(null)
    clearUserFromCache()
    try {
      await supabase.auth.signOut()
      console.log('[AuthContext] signOut SUCCESS')
    } catch (err) {
      console.error('[AuthContext] signOut ERROR:', err)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    console.log('[AuthContext] refreshUser START')
    if (!user) return
    try {
      const { data: { user: sessionUser } } = await supabase.auth.getUser()
      if (sessionUser) {
        console.log('[AuthContext] refreshUser - fetching profile for', sessionUser.id)
        const profile = await fetchUserProfile(sessionUser.id)
        setUser(profile)
        saveUserToCache(profile)
        clearPermissionCache()
        resetInactivityTimer()
      }
    } catch (err) {
      console.error('[AuthContext] refreshUser ERROR:', err)
    }
  }, [user, resetInactivityTimer])

  const changePassword = async (newPassword: string, clearNeedsPasswordReset: boolean = false) => {
    console.log('[AuthContext] changePassword START')
    try {
      const result = await authApi.updatePassword(newPassword, clearNeedsPasswordReset)
      console.log('[AuthContext] changePassword SUCCESS:', result)
      await refreshUser()
    } catch (err) {
      console.error('[AuthContext] changePassword ERROR:', err)
      throw err
    }
  }

  const sendPasswordResetEmail = async (email: string) => {
    console.log('[AuthContext] sendPasswordResetEmail START:', email)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error
      console.log('[AuthContext] sendPasswordResetEmail SUCCESS')
    } catch (err) {
      console.error('[AuthContext] sendPasswordResetEmail ERROR:', err)
      throw err
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, loading, error, signIn, signOut, refreshUser, changePassword, sendPasswordResetEmail 
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
