import AsyncStorage from "@react-native-async-storage/async-storage";
import { create, StateCreator } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";

// User type
type TUser = {
  name: string;
  email: string;
  id: string;
  phoneNumber: string;
  refreshToken?: string | null;
  token: string;
};

// Auth store type
type AuthStore = {
  email: string | null;
  user: TUser | null;
  resetToken: string | null;
  rememberMe: boolean;
  authReady: boolean;
  setEmail: (email: string) => void;
  setUser: (user: TUser) => void;
  setRememberPreference: (remember: boolean) => void;
  setResetToken: (token: string) => void;
  setAuthReady: (ready: boolean) => void;
  clearAuth: () => void;
};

// Custom storage adapter for AsyncStorage
const customStorage = {
  getItem: async (name: string) => {
    const item = await AsyncStorage.getItem(name);
    return item ? JSON.parse(item) : null;
  },
  setItem: async (name: string, value: any) => {
    await AsyncStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: async (name: string) => {
    await AsyncStorage.removeItem(name);
  },
};

// Zustand store with persist
type AuthPersist = (
  config: StateCreator<AuthStore>,
  options: PersistOptions<AuthStore>
) => StateCreator<AuthStore>;

const useAuthStore = create<AuthStore>()(
  (
    persist as AuthPersist
  )(
    (set) => ({
      email: null,
      user: null,
      resetToken: null,
      rememberMe: false,
      authReady: false,
      setEmail: (email: string) => set({ email }),
      setUser: (user: TUser) => set({ user }),
      setRememberPreference: (remember: boolean) => set({ rememberMe: remember }),
      setResetToken: (token: string) => set({ resetToken: token }),
      setAuthReady: (ready: boolean) => set({ authReady: ready }),
      clearAuth: () =>
        set({ email: null, user: null, resetToken: null, rememberMe: false }),
    }),
    {
      name: "auth-storage",
      storage: customStorage,
      partialize: (state) => ({
        email: state.email,
        resetToken: state.resetToken,
        rememberMe: state.rememberMe,
      }),
    }
  )
);

// Export the store and a getter function for non-React contexts
export const getAuth = () => useAuthStore.getState();

export default useAuthStore;
