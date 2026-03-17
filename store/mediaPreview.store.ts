import { create } from 'zustand';

type LocalPreview = {
  uri: string;
  sizeBytes?: number | null;
  thumbnailUri?: string | null;
};

type MediaPreviewState = {
  previews: Record<string, LocalPreview>;
  setPreview: (
    postId: string,
    uri: string,
    sizeBytes?: number | null,
    thumbnailUri?: string | null
  ) => void;
  clearPreview: (postId: string) => void;
  clearAll: () => void;
};

const useMediaPreviewStore = create<MediaPreviewState>((set) => ({
  previews: {},
  setPreview: (
    postId: string,
    uri: string,
    sizeBytes?: number | null,
    thumbnailUri?: string | null
  ) =>
    set((state) => ({
      previews: {
        ...state.previews,
        [postId]: { uri, sizeBytes, thumbnailUri: thumbnailUri || null },
      },
    })),
  clearPreview: (postId: string) =>
    set((state) => {
      const next = { ...state.previews };
      delete next[postId];
      return { previews: next };
    }),
  clearAll: () => set({ previews: {} }),
}));

export default useMediaPreviewStore;
