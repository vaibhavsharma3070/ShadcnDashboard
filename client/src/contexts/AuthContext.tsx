import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'readOnly';
  active: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (role: 'admin' | 'staff' | 'readOnly') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on app start
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      // Not authenticated or network error
      console.log('Authentication check failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      });

      setUser(response.user);
      
      // Invalidate all queries to refresh data with authenticated context
      queryClient.invalidateQueries();
    } catch (error: any) {
      setLoading(false);
      throw new Error(error.error || 'Error de autenticación');
    }
    setLoading(false);
  }

  async function logout() {
    try {
      await apiRequest('/api/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      // Logout on client side even if server request fails
      console.error('Logout request failed:', error);
    }
    
    setUser(null);
    
    // Clear all cached data
    queryClient.clear();
  }

  function hasRole(requiredRole: 'admin' | 'staff' | 'readOnly'): boolean {
    if (!user) return false;
    
    const roleHierarchy = {
      'admin': 3,
      'staff': 2,
      'readOnly': 1
    };
    
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}