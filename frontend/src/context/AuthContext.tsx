import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, AuthState } from '../types/auth.js';
import { disconnectSocket } from '../services/socket.js';

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
  verifyOtp: (target: string, otp: string, purpose: string) => Promise<UserProfile | null>;
  resendOtp: (target: string, purpose: string) => Promise<{ message: string }>;
  updateProfile: (data: { name?: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cpet_access_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  /**
   * Performs silent token refresh with locking to prevent concurrent duplicate refresh requests.
   */
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      try {
        const storedRefreshToken = localStorage.getItem('cpet_refresh_token');
        const res = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: storedRefreshToken || undefined }),
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error('Refresh token invalid or expired');
        }

        const json = await res.json();
        const newAccessToken = json.data?.tokens?.accessToken;
        const newRefreshToken = json.data?.tokens?.refreshToken;

        if (newAccessToken) {
          localStorage.setItem('cpet_access_token', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('cpet_refresh_token', newRefreshToken);
          }
          setToken(newAccessToken);
          return newAccessToken;
        }
        return null;
      } catch {
        localStorage.removeItem('cpet_access_token');
        localStorage.removeItem('cpet_refresh_token');
        disconnectSocket();
        setToken(null);
        setUser(null);
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, []);

  /**
   * Authenticated fetch wrapper with automatic 401 refresh interception and retry.
   */
  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      let currentToken = localStorage.getItem('cpet_access_token');
      const headers = new Headers(options.headers || {});
      if (currentToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${currentToken}`);
      }

      let res = await fetch(url, { ...options, headers, credentials: 'include' });

      if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          const retryHeaders = new Headers(options.headers || {});
          retryHeaders.set('Authorization', `Bearer ${newToken}`);
          res = await fetch(url, { ...options, headers: retryHeaders, credentials: 'include' });
        }
      }

      return res;
    },
    [refreshAccessToken]
  );

  const fetchCurrentUser = useCallback(
    async (authToken: string) => {
      try {
        let res = await fetch('/api/v1/users/me', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          credentials: 'include',
        });

        // If 401, attempt silent refresh before giving up
        if (res.status === 401) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            res = await fetch('/api/v1/users/me', {
              headers: {
                Authorization: `Bearer ${newToken}`,
              },
              credentials: 'include',
            });
          }
        }

        if (res.ok) {
          const json = await res.json();
          setUser(json.data);
          return json.data as UserProfile;
        } else {
          localStorage.removeItem('cpet_access_token');
          localStorage.removeItem('cpet_refresh_token');
          disconnectSocket();
          setToken(null);
          setUser(null);
          return null;
        }
      } catch {
        localStorage.removeItem('cpet_access_token');
        localStorage.removeItem('cpet_refresh_token');
        disconnectSocket();
        setToken(null);
        setUser(null);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshAccessToken]
  );

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
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Login failed');
    }

    const { accessToken, refreshToken } = json.data.tokens;
    const profile = json.data.user;

    localStorage.setItem('cpet_access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('cpet_refresh_token', refreshToken);
    }
    setToken(accessToken);
    setUser(profile);
    return profile;
  };

  const registerCitizen = async (data: any): Promise<UserProfile> => {
    const res = await fetch('/api/v1/auth/citizen/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Citizen registration failed');
    }

    const { accessToken, refreshToken } = json.data.tokens;
    const profile = json.data.user;

    localStorage.setItem('cpet_access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('cpet_refresh_token', refreshToken);
    }
    setToken(accessToken);
    setUser(profile);
    return profile;
  };

  const registerOrganization = async (data: any): Promise<UserProfile> => {
    const res = await fetch('/api/v1/auth/organization/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Organization onboarding failed');
    }

    const { accessToken, refreshToken } = json.data.tokens;
    const profile = json.data.user;

    localStorage.setItem('cpet_access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('cpet_refresh_token', refreshToken);
    }
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

  const verifyOtp = async (target: string, otp: string, purpose: string): Promise<UserProfile | null> => {
    const res = await fetch('/api/v1/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ target, otp, purpose }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'OTP verification failed');
    }

    let profile: UserProfile | null = null;
    if (json.data?.tokens) {
      const { accessToken, refreshToken } = json.data.tokens;
      profile = json.data.user;
      localStorage.setItem('cpet_access_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('cpet_refresh_token', refreshToken);
      }
      setToken(accessToken);
      setUser(profile);
    } else if (user && token) {
      profile = await fetchCurrentUser(token);
    }

    return profile || user;
  };

  const resendOtp = async (target: string, purpose: string) => {
    const res = await fetch('/api/v1/auth/otp/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, purpose }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to resend OTP');
    }

    return json;
  };

  const updateProfile = async (data: { name?: string; phone?: string }) => {
    if (!token) throw new Error('Not authenticated');

    const res = await authFetch('/api/v1/users/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to update profile');
    }

    const currentToken = localStorage.getItem('cpet_access_token') || token;
    await fetchCurrentUser(currentToken);
  };

  const logout = async () => {
    try {
      const storedRefreshToken = localStorage.getItem('cpet_refresh_token');
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken: storedRefreshToken || undefined }),
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('cpet_access_token');
      localStorage.removeItem('cpet_refresh_token');
      disconnectSocket();
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
        resendOtp,
        updateProfile,
        logout,
        authFetch,
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
