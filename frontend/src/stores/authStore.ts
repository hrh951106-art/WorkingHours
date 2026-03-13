import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Role {
  id: number;
  code: string;
  name: string;
  description?: string;
  functionalPermissions: string;
  dataScopeType: string;
}

interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  roles: Role[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        // 同时保存到localStorage，确保request.ts能读取到
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ token, user });
      },
      clearAuth: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ token: null, user: null });
      },
      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'auth-storage',
    }
  )
);
