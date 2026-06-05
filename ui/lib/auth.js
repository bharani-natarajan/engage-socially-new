'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load auth from localStorage on mount
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('auth_token');
      const savedUser = localStorage.getItem('auth_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch {
      // Ignore parse errors
    }
    setLoading(false);
  }, []);

  const login = useCallback((newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    
    // Clear session cookies to prevent cross-user contamination
    const cookiesToClear = [
      'unipile_account_id',
      'unipile_name',
      'ig_access_token',
      'ig_user_id',
      'ig_username',
      'fb_page_token',
      'fb_page_id',
      'fb_page_name'
    ];
    cookiesToClear.forEach(c => {
      document.cookie = `${c}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });

    window.location.href = '/login';
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('auth_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    updateUser,
  };

  // Sync unipile_account_id cookie with database
  useEffect(() => {
    if (!token || !user) return;
    
    function getCookie(name) {
      if (typeof document === 'undefined') return null;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    }

    const cookieAccountId = getCookie('unipile_account_id');
    if (cookieAccountId && cookieAccountId !== user.unipileAccountId) {
      import('./authApi').then(({ authApi }) => {
        authApi.updateUnipileAccount(token, cookieAccountId)
          .then(res => {
            if (res.user) {
              updateUser({ unipileAccountId: cookieAccountId });
            }
          })
          .catch(console.error);
      });
    }
  }, [token, user, updateUser]);

  // Automatically sync Unipile/LinkedIn and other social connection cookies on app load/login
  useEffect(() => {
    if (!token || !user) return;

    const headers = { 'Authorization': `Bearer ${token}` };
    fetch('/api/auth/unipile/sync', { headers })
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          console.log('[Auth] Connection cookies synced successfully.');
        }
      })
      .catch(err => console.error('[Auth Sync Error]', err));
  }, [token, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
