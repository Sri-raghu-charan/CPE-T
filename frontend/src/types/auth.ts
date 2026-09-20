export type UserRole =
  | 'CITIZEN'
  | 'DONOR'
  | 'ORGANIZATION_ADMIN'
  | 'ORGANIZATION_AGENT'
  | 'CPET_ADMIN'
  | 'CPET_SUPPORT'
  | 'SUPER_ADMIN';

export interface UserProfile {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  organizationId?: string | null;
  organizationName?: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
