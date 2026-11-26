import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError } from '../services/apiClient.ts';
import {
  getAuthSession,
  loginAdminRequest,
  loginParticipantRequest,
  logoutRequest,
  registerParticipantRequest,
} from '../services/authService.ts';
import type {
  AuthUser,
  ParticipantRegistrationPayload,
} from '../types/domain.ts';
import { AuthContext, type AuthStatus } from './authContextValue.ts';

function isTransientSessionError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 0 || error.status === 408 || error.status >= 500;
  }
  return true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [sessionError, setSessionError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setStatus('loading');
    setSessionError(null);
    try {
      const data = await getAuthSession();
      if (data.authenticated && data.user) {
        setUser(data.user);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    } catch (error) {
      setUser(null);
      if (isTransientSessionError(error)) {
        setSessionError(
          error instanceof Error
            ? error.message
            : 'Tidak dapat terhubung ke server.',
        );
        setStatus('error');
      } else {
        setStatus('unauthenticated');
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    getAuthSession()
      .then((data) => {
        if (!active) return;
        setSessionError(null);
        if (data.authenticated && data.user) {
          setUser(data.user);
          setStatus('authenticated');
        } else {
          setUser(null);
          setStatus('unauthenticated');
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        setUser(null);
        if (isTransientSessionError(error)) {
          setSessionError(
            error instanceof Error
              ? error.message
              : 'Tidak dapat terhubung ke server.',
          );
          setStatus('error');
        } else {
          setStatus('unauthenticated');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const loginAdmin = useCallback(
    async (identifier: string, password: string, rememberMe = false) => {
      const res = await loginAdminRequest(identifier, password, rememberMe);
      if (!res.authenticated || !res.user) {
        throw new Error('Gagal memulai sesi admin.');
      }
      setSessionError(null);
      setUser(res.user);
      setStatus('authenticated');
      return res.user;
    },
    [],
  );

  const loginParticipant = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      const res = await loginParticipantRequest(email, password, rememberMe);
      if (!res.authenticated || !res.user) {
        throw new Error('Gagal memulai sesi peserta.');
      }
      setSessionError(null);
      setUser(res.user);
      setStatus('authenticated');
      return res.user;
    },
    [],
  );

  const registerParticipant = useCallback(
    async (payload: ParticipantRegistrationPayload) => {
      const res = await registerParticipantRequest(payload);
      if (!res.authenticated || !res.user) {
        throw new Error('Pendaftaran berhasil tetapi sesi belum aktif.');
      }
      setSessionError(null);
      setUser(res.user);
      setStatus('authenticated');
      return res;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setSessionError(null);
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const clearAuthenticatedUser = useCallback(() => {
    setSessionError(null);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      sessionError,
      loginAdmin,
      loginParticipant,
      registerParticipant,
      logout,
      refreshSession,
      clearAuthenticatedUser,
    }),
    [
      user,
      status,
      sessionError,
      loginAdmin,
      loginParticipant,
      registerParticipant,
      logout,
      refreshSession,
      clearAuthenticatedUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
