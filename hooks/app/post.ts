import api from '@/api/axiosInstance';
import { getShortErrorMessage, isAuthError } from '@/lib/error';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload:
        | FormData
        | {
            formData: FormData;
            onUploadProgress?: (percent: number) => void;
          }
    ) => {
      const formData = payload instanceof FormData ? payload : payload.formData;
      const onUploadProgress = payload instanceof FormData ? undefined : payload.onUploadProgress;

      const res = await api.post('/api/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: event => {
          if (!onUploadProgress) return;
          const total = Number(event?.total || 0);
          if (!total) {
            onUploadProgress(0);
            return;
          }
          const rawPercent = Math.round((event.loaded * 100) / total);
          const percent = Math.max(0, Math.min(100, rawPercent));
          onUploadProgress(percent);
        },
      });
      return res;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['uclips'] });
      Toast.show({
        type: 'success',
        text1: 'Post Created',
        text2: data?.message || 'Your post has been shared successfully.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Post Failed',
        text2: getShortErrorMessage(error, 'Request failed.'),
      });
    },
  });
};

export const useCreatePostByUrl = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      description: string;
      mediaUrl: string;
      mediaType: 'image' | 'video' | 'audio';
      shareTargets: string[];
      postType?: string;
      scheduledFor?: string;
    }) => {
      const res = await api.post('/api/posts', data);
      return res;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['uclips'] });
      Toast.show({
        type: 'success',
        text1: 'Post Created',
        text2: data?.message || 'Your post has been shared successfully.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Post Failed',
        text2: getShortErrorMessage(error, 'Request failed.'),
      });
    },
  });
};

export const useSavePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await api.post('/api/saved-posts', { postId });
      return res;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['saved-posts'] });
      Toast.show({
        type: 'success',
        text1: 'Post Saved',
        text2: data?.message || 'Your post has been saved successfully.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Post Failed',
        text2: getShortErrorMessage(error, 'Request failed.'),
      });
    },
  });
};

export const useUnsavePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await api.delete(`/api/saved-posts/${postId}`);
      return res;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['saved-posts'] });
      Toast.show({
        type: 'success',
        text1: 'Post Unsaved',
        text2: data?.message || 'Your post has been unsaved successfully.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Post Failed',
        text2: getShortErrorMessage(error, 'Request failed.'),
      });
    },
  });
};

export const useGetMyPosts = (options?: {
  enabled?: boolean;
  fetchAll?: boolean;
  limit?: number;
  maxPages?: number;
}) => {
  return useQuery({
    queryKey: ['myPosts'],
    queryFn: async () => {
      try {
        const fetchAll = options?.fetchAll ?? false;
        const limit = options?.limit ?? 20;
        const maxPages = options?.maxPages ?? 10;

        if (!fetchAll) {
          const res = await api.get(`/api/posts/mine?page=1&limit=${limit}`);
          const data = res?.data || res;
          if (data === undefined || data === null) {
            return { posts: [] };
          }
          return data;
        }

        const allPosts: any[] = [];
        let page = 1;
        let totalPages = 1;

        while (page <= totalPages && page <= maxPages) {
          const res = await api.get(`/api/posts/mine?page=${page}&limit=${limit}`);
          const data = res?.data || res;
          const posts = data?.posts || [];
          totalPages = data?.totalPages || totalPages;
          allPosts.push(...posts);

          if (!posts.length) break;
          page += 1;
        }

        return {
          posts: allPosts,
          page: 1,
          totalPages,
          totalCount: allPosts.length,
        };
      } catch (error: any) {
        if (isAuthError(error)) {
          return { posts: [] };
        }
        console.warn('API Error in useGetMyPosts:', error);
        Toast.show({
          type: 'error',
          text1: 'Fetch Failed',
          text2: 'Could not load your posts.',
        });
        return { posts: [] };
      }
    },
    enabled: options?.enabled,
  });
};

export const useGetPostById = (postId?: string) => {
  return useQuery({
    queryKey: ['postById', postId],
    enabled: !!postId,
    queryFn: async () => {
      const res = await api.get(`/api/posts/${postId}`);
      return res?.post || null;
    },
  });
};

export const useGetMyPostsInfinite = (options?: {
  enabled?: boolean;
  limit?: number;
}) => {
  return useInfiniteQuery({
    queryKey: ['myPosts', 'infinite', options?.limit ?? 20],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const limit = options?.limit ?? 20;
        const res = await api.get(`/api/posts/mine?page=${pageParam}&limit=${limit}`);
        const data = res?.data || res;
        return data ?? { posts: [], page: pageParam, totalPages: 1 };
      } catch (error: any) {
        if (isAuthError(error)) {
          return { posts: [], page: pageParam, totalPages: 1 };
        }
        console.warn('API Error in useGetMyPostsInfinite:', error);
        Toast.show({
          type: 'error',
          text1: 'Fetch Failed',
          text2: 'Could not load your posts.',
        });
        return { posts: [], page: pageParam, totalPages: 1 };
      }
    },
    getNextPageParam: (lastPage: any) => {
      const page = lastPage?.page ?? 1;
      const totalPages = lastPage?.totalPages ?? 1;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: options?.enabled,
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await api.delete(`/api/posts/${postId}`);
      return res;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      Toast.show({
        type: 'success',
        text1: 'Post Deleted',
        text2: data?.message || 'Your post has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: getShortErrorMessage(error, 'Request failed.'),
      });
    },
  });
};

export const useGetAllSavePost = (options?: { limit?: number }) => {
  return useInfiniteQuery({
    queryKey: ['saved-posts', options?.limit ?? 10],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const limit = options?.limit ?? 10;
        const res = await api.get(`/api/saved-posts?page=${pageParam}&limit=${limit}`);
        const data = res?.data || res;
        if (data === undefined || data === null) {
          return { posts: [], page: pageParam, totalPages: 1 };
        }
        return data;
      } catch (error: any) {
        console.error('API Error in useGetAllSavePost:', error);
        Toast.show({
          type: 'error',
          text1: 'Fetch Failed',
          text2: 'Could not load saved posts.',
        });
        return { posts: [], page: pageParam, totalPages: 1 };
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

export const useGetScheduledPosts = (options?: { limit?: number }) => {
  return useInfiniteQuery({
    queryKey: ['scheduled-posts', options?.limit ?? 10],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const limit = options?.limit ?? 10;
        const res = await api.get(`/api/posts/scheduled?page=${pageParam}&limit=${limit}`);
        const data = res?.data || res;
        if (data === undefined || data === null) {
          return { posts: [], page: pageParam, totalPages: 1 };
        }
        return data;
      } catch (error: any) {
        console.error('API Error in useGetScheduledPosts:', error);
        Toast.show({
          type: 'error',
          text1: 'Fetch Failed',
          text2: 'Could not load scheduled posts.',
        });
        return { posts: [], page: pageParam, totalPages: 1 };
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

export const useUpdateScheduledPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      formData,
    }: {
      postId: string;
      formData: FormData;
    }) => {
      const res = await api.patch(`/api/posts/${postId}/scheduled`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      Toast.show({
        type: 'success',
        text1: 'Post Updated',
        text2: data?.message || 'Your scheduled post has been updated.',
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

export const useCancelScheduledPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await api.post(`/api/posts/${postId}/cancel`);
      return res;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      Toast.show({
        type: 'success',
        text1: 'Post Cancelled',
        text2: data?.message || 'Your scheduled post has been cancelled.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Cancel Failed',
        text2: getShortErrorMessage(error, 'Request failed.'),
      });
    },
  });
};

export const useEditPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      formData,
    }: {
      postId: string;
      formData: FormData;
    }) => {
      const res = await api.patch(`/api/posts/${postId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      Toast.show({
        type: 'success',
        text1: 'Post Updated',
        text2: data?.message || 'Your post has been updated successfully.',
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

export const useSharePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      target,
    }: {
      postId: string;
      target?:
        | 'facebook'
        | 'instagram'
        | 'feed'
        | 'twitter'
        | 'tiktok'
        | 'youtube'
        | 'snapchat'
        | 'spotify';
    }) => {
      // Backend expects postId for post shares (id is treated as ublast first).
      const payload: any = { postId };
      if (target) payload.target = target;
      const res = await api.post(`/api/share`, payload);
      return res;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['post'] });
      queryClient.invalidateQueries({ queryKey: ['myPosts'] });
      Toast.show({
        type: 'success',
        text1: 'Post Shared',
        text2: data?.message || 'Post shared successfully.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Share Failed',
        text2: getShortErrorMessage(error, 'Request failed.'),
      });
    },
  });
};




