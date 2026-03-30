import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Role {
  id: number;
  code: string;
  name: string;
  functionalPermissions: string;
}

export interface User {
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
        localStorage.setItem('mobile_token', token);
        localStorage.setItem('mobile_user', JSON.stringify(user));
        set({ token, user });
      },
      clearAuth: () => {
        localStorage.removeItem('mobile_token');
        localStorage.removeItem('mobile_user');
        set({ token: null, user: null });
      },
      isAuthenticated: () => !!get().token,
    }),
    { name: 'mobile-auth-storage' }
  )
);
