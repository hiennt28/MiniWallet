import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '../api/authApi';
import { onUnauthorized } from '../api/session';
import type { LoginInput, Profile, RegisterInput } from '../types';

export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: Profile | null;
  /** Thông báo cho trang đăng nhập, ví dụ khi phiên hết hạn. */
  notice: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  clearNotice: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const EXPIRED_NOTICE = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [user, setUser] = useState<Profile | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Bất kỳ lời gọi API nào gặp phiên hết hạn cũng đưa người dùng về trang đăng nhập
  useEffect(
    () =>
      onUnauthorized(() => {
        setUser(null);
        setStatus('anonymous');
        setNotice(EXPIRED_NOTICE);
      }),
    [],
  );

  useEffect(() => {
    let active = true;
    authApi
      .restoreSession()
      .then((profile) => {
        if (!active) return;
        setUser(profile);
        setStatus(profile ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (active) setStatus('anonymous');
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const profile = await authApi.login(input);
    setNotice(null);
    setUser(profile);
    setStatus('authenticated');
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const profile = await authApi.register(input);
    setNotice(null);
    setUser(profile);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // Dù server lỗi vẫn xóa trạng thái đăng nhập ở client
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const clearNotice = useCallback(() => setNotice(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, notice, login, register, logout, clearNotice }),
    [status, user, notice, login, register, logout, clearNotice],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() phải được dùng bên trong <AuthProvider>.');
  return ctx;
}
