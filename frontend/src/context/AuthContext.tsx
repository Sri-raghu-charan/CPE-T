import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, AuthState } from '../types/auth.js';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<UserProfile>;
  registerCitizen: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    consent: { termsAccepted: boolean; termsVersion: string };
  }) => Promise<UserProfile>;
  registerOrganization: (data: {
    organizationName: string;
    organizationType: string;
    category?: string;
    adminName: string;
    email: string;
    password: string;
    contactPhone?: string;
    address?: string;
    consent: { termsAccepted: boolean; termsVersion: string };
  }) => Promise<UserProfile>;
  requestOtp: (target: string, purpose: string) => Promise<{ message: string }>;
  verifyOtp: (target: string, otp: string, purpose: string) => Promise<boolean>;
  updateProfile: (data: { name?: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cpet_access_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('/api/v1/users/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        setUser(json.data);
      } else {
        // Token invalid or expired
        localStorage.removeItem('cpet_access_token');
        setToken(null);
        setUser(null);
      }
    } catch {
      localStorage.removeItem('cpet_access_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  }, [token, fetchCurrentUser]);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Login failed');
    }

    const { accessToken } = json.data.tokens;
    const profile = json.data.user;

    localStorage.setItem('cpet_access_token', accessToken);
    setToken(accessToken);
    setUser(profile);
    return profile;
  };

  const registerCitizen = async (data: any): Promise<UserProfile> => {
    const res = await fetch('/api/v1/auth/citizen/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Citizen registration failed');
    }

    const { accessToken } = json.data.tokens;
    const profile = json.data.user;

    localStorage.setItem('cpet_access_token', accessToken);
    setToken(accessToken);
    setUser(profile);
    return profile;
  };

  const registerOrganization = async (data: any): Promise<UserProfile> => {
    const res = await fetch('/api/v1/auth/organization/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Organization onboarding failed');
    }

    const { accessToken } = json.data.tokens;
    const profile = json.data.user;

    localStorage.setItem('cpet_access_token', accessToken);
    setToken(accessToken);
    setUser(profile);
    return profile;
  };

  const requestOtp = async (target: string, purpose: string) => {
    const res = await fetch('/api/v1/auth/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, purpose }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to request OTP');
    }

    return json;
  };

  const verifyOtp = async (target: string, otp: string, purpose: string): Promise<boolean> => {
    const res = await fetch('/api/v1/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, otp, purpose }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'OTP verification failed');
    }

    if (user) {
      if (token) await fetchCurrentUser(token);
    }

    return true;
  };

  const updateProfile = async (data: { name?: string; phone?: string }) => {
    if (!token) throw new Error('Not authenticated');

    const res = await fetch('/api/v1/users/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to update profile');
    }

    await fetchCurrentUser(token);
  };

  const logout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('cpet_access_token');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        registerCitizen,
        registerOrganization,
        requestOtp,
        verifyOtp,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
