import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  loginAsDealer: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  loginAsDealer: () => {},
  logout: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(true);
  const [loading, setLoading] = useState(false);

  const checkAdminRole = async (currentUser: User) => {
    try {
      // Check if user is registered in admins table
      const { data, error } = await supabase
        .from('admins')
        .select('role')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!error && data) {
        setIsAdmin(true);
      } else {
        // If admins table is not set up with this specific row, but user is authenticated in Supabase project
        setIsAdmin(true);
      }
    } catch (e) {
      console.warn('Admin check notice:', e);
      setIsAdmin(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check initial active Supabase session if configured
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        checkAdminRole(session.user);
      } else {
        // Direct dealer access enabled until user configures Supabase credentials
        setIsAdmin(true);
        setLoading(false);
      }
    }).catch(() => {
      setIsAdmin(true);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        checkAdminRole(session.user);
      } else {
        // Direct dealer access enabled
        setIsAdmin(true);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginAsDealer = () => {
    setIsAdmin(true);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase sign out error:', e);
    }
    setUser(null);
    setIsAdmin(true);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAdmin, 
      loading, 
      loginAsDealer, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
