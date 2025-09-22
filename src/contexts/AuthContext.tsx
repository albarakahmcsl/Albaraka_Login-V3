import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types/auth';
import { userProfileApi, authApi } from '../lib/dataFetching';

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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prevent repeated fetches
  const fetchUserProfileOnce = useCallback(async (userId: string) => {
    try {
      const profile = await userProfileApi.fetchUserProfile(userId);
      if (profile) setUser(profile);
      else {
        await supabase.auth.signOut();
        setUser(null);
        setError('User profile not found.');
      }
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
      setError('Failed to fetch user profile.');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    await fetchUserProfileOnce(user.id);
  }, [user?.id, fetchUserProfileOnce]);

  const changePassword = useCallback(
    async (newPassword: string, clearNeedsPasswordReset: boolean = false) => {
      try {
        await authApi.updatePassword(newPassword, clearNeedsPasswordReset);
        await refreshUser(); // Immediately refresh user
      } catch (err: any) {
        console.error('Error changing password:', err);
        throw new Error(err.message || 'Failed to change password');
      }
    },
    [refreshUser]
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
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
      // onAuthStateChange will handle user profile fetch
    } catch (err: any) {
      console.error('SignIn error:', err);
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setError(null);
    } catch (err: any) {
      console.error('SignOut error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true; // prevent state updates if unmounted

    const init = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
          setUser(null);
          setLoading(false);
          return;
        }
        if (isMounted) await fetchUserProfileOnce(session.user.id);
      } catch (err: any) {
        console.error('Auth initialization error:', err);
        if (isMounted) setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null);
          setError(null);
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchUserProfileOnce(session.user.id);
        }
      }
    );

    init();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfileOnce]);

  return (
    <AuthContext.Provider
      value={{
        user,
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
