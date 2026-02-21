import { create } from "zustand";

interface AuthStore {
  token: string | null;
  userId: string | null;
  username: string | null;
  setAuth: (token: string, userId: string, username: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  userId: null,
  username: null,
  setAuth: (token, userId, username) => set({ token, userId, username }),
  clearAuth: () => set({ token: null, userId: null, username: null }),
}));
