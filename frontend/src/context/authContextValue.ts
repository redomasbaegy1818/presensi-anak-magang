import { createContext } from 'react';
import type {
  AuthUser,
  ParticipantRegisterResponse,
  ParticipantRegistrationPayload,
} from '../types/domain.ts';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  loginAdmin: (identifier: string, password: string) => Promise<AuthUser>;
  loginParticipant: (email: string, password: string) => Promise<AuthUser>;
  registerParticipant: (
    payload: ParticipantRegistrationPayload,
  ) => Promise<ParticipantRegisterResponse>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearAuthenticatedUser: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
