import { create } from "zustand";

interface AppStoreState {
  error?: string | null;
  isLoading?: boolean;

  setError: (error: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  resetAppState: () => void;
}

const initialState = {
  error: undefined,
  isLoading: false,
};

export const useAppStore = create<AppStoreState>()((set) => ({
  ...initialState,
  setError: (error) => set({ error }),
  setIsLoading: (isLoading) => set({ isLoading }),
  resetAppState: () => set(initialState),
}));
