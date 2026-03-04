import api from '@/api/axiosInstance';
import { isAuthError } from '@/lib/error';
import { useInfiniteQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

export const useGetTrendingPost = (
  selectedTab: string,
  options?: { enabled?: boolean; search?: string }
) => {
  const PAGE_LIMIT = 5;
  return useInfiniteQuery({
    queryKey: ['trendingPost', selectedTab, options?.search || ''],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        let url = `/api/trending?section=${selectedTab}`;
        if (options?.search && options.search.trim()) {
          url += `&q=${encodeURIComponent(options.search.trim())}`;
        }
        if (selectedTab === 'manual') {
          url += `&manualPage=${pageParam}&manualLimit=${PAGE_LIMIT}`;
        } else if (selectedTab === 'organic') {
          url += `&organicPage=${pageParam}&organicLimit=${PAGE_LIMIT}`;
        } else if (selectedTab === 'items') {
          url += `&itemsPage=${pageParam}&itemsLimit=${PAGE_LIMIT}`;
        }
        const res = await api.get(url);
        const data = res?.data || res;
        if (data === undefined || data === null) {
          return { [selectedTab]: [] };
        }
        return data;
      } catch (error: any) {
        if (isAuthError(error)) {
          return { [selectedTab]: [] };
        }
        console.error('API Error in useGetTrendingPost:', error);
        Toast.show({
          type: 'error',
          text1: 'Fetch Failed',
          text2: 'Could not load trending posts.',
        });
        return { [selectedTab]: [] };
      }
    },
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.meta || {};
      const key =
        selectedTab === 'manual'
          ? 'manual'
          : selectedTab === 'organic'
            ? 'organic'
            : selectedTab === 'items'
              ? 'items'
              : null;
      if (!key) return undefined;
      const page = meta?.[key]?.page ?? 1;
      const totalPages = meta?.[key]?.totalPages ?? 1;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled: options?.enabled,
    placeholderData: previousData => previousData,
    staleTime: 10000,
    gcTime: 60 * 1000,
    maxPages: 3,
    initialPageParam: 1,
  });
};




