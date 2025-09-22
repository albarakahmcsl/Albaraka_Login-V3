import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react"
import { supabase } from "../lib/supabase"
import { authApi, userProfileApi } from "../lib/dataFetching"
import { queryClient, queryKeys } from "../lib/queryClient"
import { clearPermissionCache } from "../utils/permissions"
import { withTimeout, deepEqual } from "../utils/helpers"

const USER_PROFILE_CACHE_KEY = "user_profile_cache"
const INACTIVITY_TIMEOUT = 15 * 60 * 1000

const saveUserToCache = (user: any) => {
  try {
    localStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(user))
  } catch (error) {
    console.error("[AuthContext] Failed to save user to cache:", error)
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
    console.error("[AuthContext] Failed to load user from cache:", error)
  }
  return null
}

const clearUserFromCache = () => {
  try {
    localStorage.removeItem(USER_PROFILE_CACHE_KEY)
  } catch (error) {
    console.error("[AuthContext] Failed to clear user from cache:", error)
  }
}

interface AuthContextType {
  user: any | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  changePassword: (
    newPassword: string,
    clearNeedsPasswordReset?: boolean
  ) => Promise<void>
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
    const user = await userProfileApi.fetchUserProfile(userId)
    if (!user) throw new Error("User profile not found")
    if (!user.is_active) throw new Error("Account is inactive")
    return user
  }

  /**
   * 🚀 New: signIn handles Supabase + profile fetch in one go
   */
  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      if (!data.user) throw new Error("No Supabase user returned")

      const profile = await queryClient.fetchQuery({
        queryKey: queryKeys.userProfile(data.user.id),
        queryFn: () => fetchUserProfile(data.user.id),
        staleTime: Infinity,
        gcTime: Infinity,
      })

      setUser(profile)
      saveUserToCache(profile)
      clearPermissionCache()
      resetInactivityTimer()
    } catch (err: any) {
      setUser(null)
      clearUserFromCache()
      setError(err.message || "Login failed")
      throw err
    } finally {
      setLoading(false)
    }
  }, [resetInactivityTimer])

  const signOut = useCallback(async () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
    if (user?.id) {
      queryClient.removeQueries({ queryKey: queryKeys.userProfile(user.id) })
    }
    clearUserFromCache()
    setUser(null)
    setError(null)
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error("[AuthContext] signOut ERROR:", err)
    }
  }, [user])

  const refreshUser = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      if (!data.user) {
        setUser(null)
        clearUserFromCache()
        return
      }
      const profile = await queryClient.fetchQuery({
        queryKey: queryKeys.userProfile(data.user.id),
        queryFn: () => fetchUserProfile(data.user.id),
        staleTime: Infinity,
        gcTime: Infinity,
      })
      setUser(profile)
      saveUserToCache(profile)
      clearPermissionCache()
      resetInactivityTimer()
    } catch (err: any) {
      setError("Failed to refresh user")
    }
  }, [resetInactivityTimer])

  useEffect(() => {
    const init = async () => {
      const cachedUser = getUserFromCache()
      if (cachedUser) {
        setUser(cachedUser)
        clearPermissionCache()
        setLoading(false)
      }

      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (data.session?.user && !cachedUser) {
          await refreshUser()
        }
        if (!data.session?.user) {
          setUser(null)
          clearUserFromCache()
        }
      } catch {
        setUser(null)
        clearUserFromCache()
      } finally {
        setLoading(false)
      }
    }

    init()

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          setUser(null)
          clearUserFromCache()
        }
        if (event === "TOKEN_REFRESHED" && session?.user) {
          await refreshUser()
        }
      }
    )

    return () => subscription.subscription.unsubscribe()
  }, [refreshUser])

  const changePassword = async (
    newPassword: string,
    clearNeedsPasswordReset: boolean = false
  ) => {
    setLoading(true)
    setError(null)
    try {
      await authApi.updatePassword(newPassword, clearNeedsPasswordReset)
      await refreshUser()
    } catch (err: any) {
      setError(err.message || "Failed to change password")
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
        redirectTo: `${window.location.origin}/reset-password`,
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
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signIn,
        signOut,
        refreshUser,
        changePassword,
        sendPasswordResetEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
