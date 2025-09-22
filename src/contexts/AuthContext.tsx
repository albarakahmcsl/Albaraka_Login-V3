// AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react'
import { supabase } from '../lib/supabase'

interface User {
  id: string
  email: string
  full_name: string
  is_active: boolean
  needs_password_reset: boolean
  roles?: { name: string }[]
}

interface AuthContextType {
  user: User | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
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
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  console.log('[AuthContext] Initializing AuthProvider...')

  // Load cached user from localStorage
  useEffect(() => {
    console.log('[AuthContext] Checking localStorage for cached user...')
    const cachedUser = localStorage.getItem('user')
    if (cachedUser) {
      try {
        const parsedUser: User = JSON.parse(cachedUser)
        setUser(parsedUser)
        console.log('[AuthContext] Loaded user from cache:', parsedUser)
      } catch (err) {
        console.error('[AuthContext] Failed to parse cached user:', err)
      }
    }
    setLoading(false)
  }, [])

  // Fetch Supabase session once
  useEffect(() => {
    if (loading) return
    const fetchSession = async () => {
      console.log('[AuthContext] Fetching Supabase session...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('[AuthContext] Supabase session error:', sessionError)
      } else if (session?.user) {
        const supaUser: User = {
          id: session.user.id,
          email: session.user.email || '',
          full_name: (session.user.user_metadata as any)?.full_name || '',
          is_active: true,
          needs_password_reset: false,
          roles: (session.user.user_metadata as any)?.roles || [],
        }
        setUser(prev => {
          if (!prev || prev.id !== supaUser.id) {
            console.log('[AuthContext] Setting user from Supabase session:', supaUser)
            localStorage.setItem('user', JSON.stringify(supaUser))
            return supaUser
          }
          return prev
        })
      } else {
        setUser(null)
        localStorage.removeItem('user')
      }
    }

    fetchSession()
  }, [loading])

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('[AuthContext] Attempting signIn for:', email)
    setError(null)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        console.error('[AuthContext] signIn error:', signInError)
        setError(signInError.message)
        return
      }
      if (data.session?.user) {
        const supaUser: User = {
          id: data.session.user.id,
          email: data.session.user.email || '',
          full_name: (data.session.user.user_metadata as any)?.full_name || '',
          is_active: true,
          needs_password_reset: false,
          roles: (data.session.user.user_metadata as any)?.roles || [],
        }
        setUser(supaUser)
        localStorage.setItem('user', JSON.stringify(supaUser))
        console.log('[AuthContext] signIn successful:', supaUser)
      }
    } catch (err: any) {
      console.error('[AuthContext] Unexpected signIn error:', err)
      setError(err.message || 'Login failed')
    }
  }, [])

  const signOut = useCallback(async () => {
    console.log('[AuthContext] Signing out...')
    await supabase.auth.signOut()
    setUser(null)
    localStorage.removeItem('user')
  }, [])

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, error }}>
      {children}
    </AuthContext.Provider>
  )
}
