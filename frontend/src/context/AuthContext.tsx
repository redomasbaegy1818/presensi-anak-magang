import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const refreshSession = useCallback(async () => {
    try {
      const data = await getAuthSession();
      if (data.authenticated && data.user) {
        setUser(data.user);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    } catch {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    let active = true;
    getAuthSession()
      .then((data) => {
        if (!active) return;
        if (data.authenticated && data.user) {
          setUser(data.user);
          setStatus('authenticated');
        } else {
          setUser(null);
          setStatus('unauthenticated');
        }
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStatus('unauthenticated');
      });

    return () => {
      active = false;
    };
  }, []);

  const loginAdmin = useCallback(async (identifier: string, password: string) => {
    const res = await loginAdminRequest(identifier, password);
    if (!res.authenticated || !res.user) {
      throw new Error('Gagal memulai sesi admin.');
    }
    setUser(res.user);
    setStatus('authenticated');
    return res.user;
  }, []);

  const loginParticipant = useCallback(async (email: string, password: string) => {
    const res = await loginParticipantRequest(email, password);
    if (!res.authenticated || !res.user) {
      throw new Error('Gagal memulai sesi peserta.');
    }
    setUser(res.user);
    setStatus('authenticated');
    return res.user;
  }, []);

  const registerParticipant = useCallback(
    async (payload: ParticipantRegistrationPayload) => {
      const res = await registerParticipantRequest(payload);
      if (!res.authenticated || !res.user) {
        throw new Error('Pendaftaran berhasil tetapi sesi belum aktif.');
      }
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
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const clearAuthenticatedUser = useCallback(() => {
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
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
