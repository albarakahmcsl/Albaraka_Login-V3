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
  changePassword: (newPassword: string) => Promise<void>;
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

  const refreshUser = useCallback(async () => {
    if (!user?.id) return;

    try {
      const profile = await userProfileApi.fetchUserProfile(user.id);
      if (profile) {
        setUser(profile);
      } else {
        await signOut();
        setError('User profile not found. Please contact an administrator.');
      }
    } catch (err: any) {
      console.error('Error refreshing user profile:', err);
      setError('Failed to refresh user profile');
    }
  }, [user?.id]);

  const changePassword = useCallback(
    async (newPassword: string) => {
      try {
        await authApi.updatePassword(newPassword);

        // After changing password, mark needs_password_reset = false
        await userProfileApi.updateUser({
          id: user!.id,
          needs_password_reset: false,
        });

        // Refresh the user profile
        await refreshUser();
      } catch (err: any) {
        console.error('Error changing password:', err);
        throw new Error(err.message || 'Failed to change password');
      }
    },
    [user, refreshUser]
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
      // onAuthStateChange listener will handle the rest
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
    const init = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          await supabase.auth.signOut();
          setUser(null);
          setError('Session error. Please try logging in again.');
          setLoading(false);
          return;
        }

        if (!session?.user) {
          setUser(null);
          setLoading(false);
          return;
        }

        const profile = await userProfileApi.fetchUserProfile(session.user.id);

        if (!profile) {
          await supabase.auth.signOut();
          setUser(null);
          setError('User profile not found. Please contact an administrator.');
          setLoading(false);
          return;
        }

        if (!profile.is_active) {
          await supabase.auth.signOut();
          setUser(null);
          setError('Your account is inactive. Please contact an administrator.');
          setLoading(false);
          return;
        }

        setUser(profile);
        setError(null);
      } catch (err: any) {
        console.error('Auth initialization error:', err);
        setUser(null);
        setError('Authentication initialization failed.');
      } finally {
        setLoading(false);
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
          const profile = await userProfileApi.fetchUserProfile(session.user.id);
          if (!profile) {
            await supabase.auth.signOut();
            setUser(null);
            setError('User profile not found.');
            setLoading(false);
            return;
          }

          if (!profile.is_active) {
            await supabase.auth.signOut();
            setUser(null);
            setError('Your account is inactive.');
            setLoading(false);
            return;
          }

          setUser(profile);
          setError(null);
        }
      }
    );

    init();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
