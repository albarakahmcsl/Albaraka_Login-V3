import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { User } from '../types/auth';
import { userProfileApi, authApi } from '../lib/dataFetching';
import { queryClient, queryKeys } from '../lib/queryClient';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  changePassword: (newPassword: string, clearNeedsPasswordReset?: boolean) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authSession, setAuthSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reactQueryClient = useQueryClient();

  // Use React Query to manage user profile
  const {
    data: user,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile
  } = useQuery({
    queryKey: queryKeys.userProfile(authSession?.user?.id || ''),
    queryFn: () => userProfileApi.fetchUserProfile(authSession.user.id),
    enabled: !!authSession?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Combined loading state
  const loading = authLoading || profileLoading;

  const refreshUser = useCallback(async () => {
    if (!authSession?.user?.id) return;
    
    try {
      // Invalidate and refetch the user profile
      await reactQueryClient.invalidateQueries({
        queryKey: queryKeys.userProfile(authSession.user.id)
      });
      await refetchProfile();
    } catch (err) {
      console.error('Error refreshing user profile:', err);
    }
  }, [authSession?.user?.id, reactQueryClient, refetchProfile]);

  const changePassword = useCallback(
    async (newPassword: string, clearNeedsPasswordReset: boolean = false) => {
      try {
        await authApi.updatePassword(newPassword, clearNeedsPasswordReset);
        
        // Invalidate user profile to refetch updated data
        if (authSession?.user?.id) {
          await reactQueryClient.invalidateQueries({
            queryKey: queryKeys.userProfile(authSession.user.id)
          });
          await refetchProfile();
        }
      } catch (err: any) {
        console.error('Error changing password:', err);
        throw new Error(err.message || 'Failed to change password');
      }
    },
    [authSession?.user?.id, reactQueryClient, refetchProfile]
  );

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Error sending password reset email:', err);
      throw new Error(err.message || 'Failed to send password reset email');
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setAuthLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setAuthLoading(false);
        return;
      }
      // onAuthStateChange will handle session update and profile fetch
    } catch (err: any) {
      console.error('SignIn error:', err);
      setError(err.message || 'Login failed');
      setAuthLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthLoading(true);
    try {
      // Capture user ID before clearing session
      const currentUserId = authSession?.user?.id;
      
      await supabase.auth.signOut();
      setAuthSession(null);
      setError(null);
      
      // Clear all cached user data
      if (currentUserId) {
        reactQueryClient.removeQueries({
          queryKey: queryKeys.userProfile(currentUserId)
        });
      }
      reactQueryClient.removeQueries({
        queryKey: queryKeys.currentUser()
      });
      
      // Clear all queries to ensure clean state
      reactQueryClient.clear();
    } catch (err: any) {
      console.error('SignOut error:', err);
    } finally {
      setAuthLoading(false);
    }
  }, [reactQueryClient]);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Session error:', sessionError);
          if (isMounted) {
            setError(sessionError.message);
            setAuthLoading(false);
          }
          return;
        }

        if (isMounted) {
          setAuthSession(session);
          setAuthLoading(false);
        }
      } catch (err: any) {
        console.error('Auth initialization error:', err);
        if (isMounted) {
          setError(err.message || 'Authentication initialization failed');
          setAuthLoading(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth state change:', event, !!session);
        
        if (!isMounted) return;

        if (event === 'SIGNED_OUT' || !session?.user) {
          // Capture user ID before clearing session
          const currentUserId = authSession?.user?.id;
          
          setAuthSession(null);
          setError(null);
          setAuthLoading(false);
          
          // Clear all cached user data
          if (currentUserId) {
            reactQueryClient.removeQueries({
              queryKey: queryKeys.userProfile(currentUserId)
            });
          }
          reactQueryClient.removeQueries({
            queryKey: queryKeys.currentUser()
          });
          
          // Clear all queries to ensure clean state
          reactQueryClient.clear();
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setAuthSession(session);
          setError(null);
          setAuthLoading(false);
          
          // Invalidate and refetch user profile when session changes
          if (session.user.id) {
            await reactQueryClient.invalidateQueries({
              queryKey: queryKeys.userProfile(session.user.id)
            });
          }
        }
      }
    );

    init();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [reactQueryClient]);

  // Set error from profile fetch if it exists
  useEffect(() => {
    if (profileError && !error) {
      setError(profileError instanceof Error ? profileError.message : 'Failed to fetch user profile');
    }
  }, [profileError, error]);

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
  );
};