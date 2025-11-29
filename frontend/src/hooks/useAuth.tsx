import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/router';
import api from '@/utils/api';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'sales' | 'stock';
  lastLoginAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: () => boolean;
  isSales: () => boolean;
  isStock: () => boolean;
  authHeader: () => { Authorization: string } | {};
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load user from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.ok) {
        const { token: newToken, user: newUser } = response.data;
        
        // Store in state
        setToken(newToken);
        setUser(newUser);
        
        // Store in localStorage
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        
        toast.success(`Welcome back, ${newUser.fullName}!`);
        router.push('/dashboard');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      toast.error(errorMessage);
      throw error;
    }
  };

  const logout = () => {
    // Clear state immediately
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    toast.success('Logged out successfully');
    
    // Force full page reload to clear all state
    window.location.href = '/login';
  };

  const isAdmin = () => user?.role === 'admin';
  const isSales = () => user?.role === 'sales';
  const isStock = () => user?.role === 'stock';

  const authHeader = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token && !!user,
    isAdmin,
    isSales,
    isStock,
    authHeader,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
