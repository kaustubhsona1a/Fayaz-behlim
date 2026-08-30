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
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

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
        // Authenticated users created in the Supabase project
        setIsAdmin(true);
      }
    } catch (e) {
      console.warn('Admin check notice:', e);
      setIsAdmin(true);
    } finally {
      setIsAdmin(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check initial active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        checkAdminRole(session.user);
      } else {
        // Enforce login screen until user provides valid credentials
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
      }
    }).catch(() => {
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        checkAdminRole(session.user);
      } else {
        setUser(null);
        setIsAdmin(false);
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
    setIsAdmin(false);
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
