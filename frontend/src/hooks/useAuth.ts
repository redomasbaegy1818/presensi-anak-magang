import { useContext } from 'react';
import {
  AuthContext,
  type AuthContextValue,
} from '../context/authContextValue.ts';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  }
  return ctx;
}
