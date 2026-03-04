import api from '@/api/axiosInstance';
import { getShortErrorMessage, isAuthError } from '@/lib/error';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

export const useGetUblastEligibility = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['ublast-eligibility'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/ublasts/eligibility');
        return res;
      } catch (error: any) {
        if (isAuthError(error)) return null;
        console.error('API Error in useGetUblastEligibility:', error);
        Toast.show({
          type: 'error',
          text1: 'Fetch Failed',
          text2: getShortErrorMessage(error, 'Request failed.'),
        });
        return null;
      }
    },
    enabled: options?.enabled,
    placeholderData: previousData => previousData,
    staleTime: 10000,
  });
};


// UBlast submission hooks
export const useSubmitUBlast = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      console.log(JSON.stringify(formData, null, 2));

      const res = await api.post('/api/ublasts/submissions', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['ublast-posts'] });
      Toast.show({
        type: 'success',
        text1: 'UBlast Submitted',
        text2:
          data?.message ||
          'Your content has been submitted to UBlast successfully.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'UBlast Submission Failed',
        text2: getShortErrorMessage(error, 'Request failed.'),
      });
    },
  });
};

export const useGetUBlastPosts = () => {
  return useInfiniteQuery({
    queryKey: ['ublast-posts'],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const res = await api.get(`/api/ublasts/submissions?page=${pageParam}&limit=12`);
        const data = res?.data || res;
        if (data === undefined || data === null) {
          return { submissions: [], page: pageParam, totalPages: 1 };
        }
        return data;
      } catch (error: any) {
        if (isAuthError(error)) {
          return { submissions: [], page: pageParam, totalPages: 1 };
        }
        console.error('API Error in useGetUBlastPosts:', error);
        Toast.show({
          type: 'error',
          text1: 'Fetch Failed',
          text2: 'Could not load UBlast posts.',
        });
        return { submissions: [], page: pageParam, totalPages: 1 };
      }
    },
    getNextPageParam: (lastPage: any) => {
      const page = lastPage?.page ?? 1;
      const totalPages = lastPage?.totalPages ?? 1;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });
};

export const useUpdateUBlastPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      formData,
    }: {
      postId: string;
      formData: FormData;
    }) => {
      const res = await api.patch(
        `/api/ublasts/submissions/${postId}`,
        formData
      );
      return res;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['ublast-posts'] });
      Toast.show({
        type: 'success',
        text1: 'UBlast Post Updated',
        text2:
          data?.message || 'Your UBlast post has been updated successfully.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: getShortErrorMessage(error, 'Request failed.'),
      });
    },
  });
};

export const useGetActiveUblasts = (options?: { enabled?: boolean; limit?: number; search?: string }) => {
  return useInfiniteQuery({
    queryKey: ['ublast-active', options?.limit ?? 12, options?.search || ''],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const limit = options?.limit ?? 12;
        let url = `/api/ublasts/active?page=${pageParam}&limit=${limit}`;
        if (options?.search && options.search.trim()) {
          url += `&q=${encodeURIComponent(options.search.trim())}`;
        }
        const res = await api.get(url);
        const data = res?.data || res;
        if (data === undefined || data === null) {
          return { ublasts: [], page: pageParam, totalPages: 1 };
        }
        return data;
      } catch (error: any) {
        if (isAuthError(error)) {
          return { ublasts: [], page: pageParam, totalPages: 1 };
        }
        console.error('API Error in useGetActiveUblasts:', error);
        Toast.show({
          type: 'error',
          text1: 'Fetch Failed',
          text2: getShortErrorMessage(error, 'Request failed.'),
        });
        return { ublasts: [], page: pageParam, totalPages: 1 };
      }
    },
    getNextPageParam: (lastPage: any) => {
      const page = lastPage?.page ?? 1;
      const totalPages = lastPage?.totalPages ?? 1;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: options?.enabled,
    placeholderData: previousData => previousData,
    staleTime: 10000,
    gcTime: 60 * 1000,
    maxPages: 3,
  });
};

export const useGetUblastOffers = (options?: {
  enabled?: boolean;
  fetchAll?: boolean;
  limit?: number;
  maxPages?: number;
}) => {
  return useQuery({
    queryKey: ['ublast-offers', options?.limit ?? 20, options?.fetchAll ?? true],
    queryFn: async () => {
      try {
        const fetchAll = options?.fetchAll ?? true;
        const limit = options?.limit ?? 20;
        const maxPages = options?.maxPages ?? 10;

        if (!fetchAll) {
          const res = await api.get(`/api/ublast-offers?page=1&limit=${limit}`);
          return res?.data || res || { offers: [], page: 1, totalPages: 1, totalCount: 0 };
        }

        const offers: any[] = [];
        let page = 1;
        let totalPages = 1;
        let totalCount = 0;

        while (page <= totalPages && page <= maxPages) {
          const res = await api.get(`/api/ublast-offers?page=${page}&limit=${limit}`);
          const data = res?.data || res || {};
          offers.push(...(data?.offers || []));
          totalPages = data?.totalPages || totalPages;
          totalCount = data?.totalCount || totalCount;
          if (!(data?.offers || []).length) break;
          page += 1;
        }

        return {
          offers,
          page: 1,
          totalPages,
          totalCount: totalCount || offers.length,
        };
      } catch (error: any) {
        if (isAuthError(error)) {
          return { offers: [], page: 1, totalPages: 1, totalCount: 0 };
        }
        console.error('API Error in useGetUblastOffers:', error);
        Toast.show({
          type: 'error',
          text1: 'Fetch Failed',
          text2: getShortErrorMessage(error, 'Could not load offers.'),
        });
        return { offers: [], page: 1, totalPages: 1, totalCount: 0 };
      }
    },
    enabled: options?.enabled,
    placeholderData: previousData => previousData,
    staleTime: 10000,
  });
};

export const usePayUblastOffer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ offerId }: { offerId: string }) => {
      const res = await api.post(`/api/ublast-offers/${offerId}/pay`);
      return res;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['ublast-offers'] });
      Toast.show({
        type: 'success',
        text1: 'Payment Ready',
        text2: data?.clientSecret
          ? 'Payment intent created.'
          : data?.message || 'Payment intent created.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Payment Failed',
        text2: getShortErrorMessage(error, 'Could not create payment intent.'),
      });
    },
  });
};

export const useCheckoutUblastOffer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      offerId,
      appRedirectUri,
    }: {
      offerId: string;
      appRedirectUri?: string;
    }) => {
      const payload = appRedirectUri ? { appRedirectUri } : undefined;
      const res = await api.post(`/api/ublast-offers/${offerId}/checkout`, payload);
      return res;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['ublast-offers'] });
      Toast.show({
        type: 'success',
        text1: 'Checkout Created',
        text2: data?.url ? 'Redirecting to checkout...' : 'Checkout session created.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Checkout Failed',
        text2: getShortErrorMessage(error, 'Could not create checkout session.'),
      });
    },
  });
};

export const useCancelUblastOffer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ offerId }: { offerId: string }) => {
      const res = await api.post(`/api/ublast-offers/${offerId}/cancel`);
      return res;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['ublast-offers'] });
      queryClient.invalidateQueries({ queryKey: ['ublast-active'] });
      Toast.show({
        type: 'success',
        text1: 'Offer Cancelled',
        text2: data?.message || 'Offer cancelled successfully.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Cancel Failed',
        text2: getShortErrorMessage(error, 'Could not cancel offer.'),
      });
    },
  });
};

export const useShareUblast = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ublastId,
      shareType = 'feed',
    }: {
      ublastId: string;
      shareType?: 'feed' | 'story';
    }) => {
      // Ensure profile exists before sharing (backend requires it)
      const profileRes = await api.get('/api/profile/me');
      const profilePayload = (profileRes as any)?.data || profileRes;
      const profile = profilePayload?.profile;
      if (!profile) {
        throw new Error('Complete your profile before sharing.');
      }
      const res = await api.post(`/api/ublasts/${ublastId}/share`, { shareType });
      return res;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['trendingPost', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['ublast-active'] });
      queryClient.invalidateQueries({ queryKey: ['myPosts'] });
      queryClient.invalidateQueries({ queryKey: ['post'] });
      Toast.show({
        type: 'success',
        text1: 'UBlast Shared',
        text2: data?.message || 'Shared to feed successfully.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Share Failed',
        text2: getShortErrorMessage(error, 'Share failed.'),
      });
    },
  });
};





