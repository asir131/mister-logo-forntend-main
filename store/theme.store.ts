import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme } from "nativewind";
import { create, StateCreator } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";

export type ThemeMode = "dark" | "light";

type ThemeStore = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const storage = {
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

const syncNativewindScheme = (mode: ThemeMode) => {
  try {
    colorScheme.set(mode);
  } catch {
    // Nativewind not available in some environments (e.g. SSR).
  }
};

// Ensure first render uses app default mode even before persisted state rehydrates.
syncNativewindScheme("light");

type ThemePersist = (
  config: StateCreator<ThemeStore>,
  options: PersistOptions<ThemeStore>
) => StateCreator<ThemeStore>;

const useThemeStore = create<ThemeStore>()(
  (persist as ThemePersist)(
    (set, get) => ({
      mode: "light",
      setMode: (mode: ThemeMode) => {
        syncNativewindScheme(mode);
        set({ mode });
      },
      toggleMode: () => {
        const nextMode = get().mode === "light" ? "dark" : "light";
        syncNativewindScheme(nextMode);
        set({ mode: nextMode });
      },
    }),
    {
      name: "theme-storage",
      storage,
      onRehydrateStorage: () => (state) => {
        if (state?.mode) {
          syncNativewindScheme(state.mode);
        } else {
          syncNativewindScheme("light");
        }
      },
    }
  )
);

export default useThemeStore;


