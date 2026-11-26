import { createContext } from 'react';
import type { AuthUser } from '../types/domain.ts';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  loginAdmin: (identifier: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearAuthenticatedUser: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
