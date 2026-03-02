import api from '@/api/axiosInstance';
import { getShortErrorMessage } from '@/lib/error';
import useAuthStore from '@/store/auth.store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

export const useGetMyProfile = (options?: { enabled?: boolean }) => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['profile', user?.id || 'anonymous'],
    queryFn: async () => {
      const res = await api.get(`/api/profile/me`);
      return res;
    },
    enabled: (options?.enabled ?? true) && !!user?.token,
  });
};

export const useUpdateProfile = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await api.patch('/api/profile/me', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res;
    },
    onSuccess: async (data: any) => {
      const nextProfile = data?.profile;

      if (nextProfile) {
        queryClient.setQueriesData({ queryKey: ['profile'] }, (prev: any) => {
          if (prev && typeof prev === 'object') {
            return {
              ...prev,
              profile: nextProfile,
            };
          }
          return { profile: nextProfile };
        });

        if (user?.id) {
          queryClient.setQueryData(['profile', user.id], { profile: nextProfile });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      Toast.show({
        type: 'success',
        text1: 'Profile Updated',
        text2: data?.message || 'Your profile has been updated successfully.',
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

export const useUpdateProfileLanguage = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      preferredLanguage: string;
      autoTranslateEnabled?: boolean;
    }) => {
      const formData = new FormData();
      formData.append('preferredLanguage', payload.preferredLanguage);
      if (typeof payload.autoTranslateEnabled === 'boolean') {
        formData.append(
          'autoTranslateEnabled',
          payload.autoTranslateEnabled ? 'true' : 'false'
        );
      }
      const res = await api.patch('/api/profile/me', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res;
    },
    onSuccess: async (data: any) => {
      const nextProfile = data?.profile;

      if (nextProfile) {
        queryClient.setQueriesData({ queryKey: ['profile'] }, (prev: any) => {
          if (prev && typeof prev === 'object') {
            return {
              ...prev,
              profile: nextProfile,
            };
          }
          return { profile: nextProfile };
        });

        if (user?.id) {
          queryClient.setQueryData(['profile', user.id], { profile: nextProfile });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      Toast.show({
        type: 'success',
        text1: 'Language Updated',
        text2: data?.message || 'Your language preference has been updated.',
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

export const useCompleteProfile = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await api.post('/api/profile/complete', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res;
    },
    onSuccess: async (data: any) => {
      const nextProfile = data?.profile;

      if (nextProfile) {
        queryClient.setQueriesData({ queryKey: ['profile'] }, (prev: any) => {
          if (prev && typeof prev === 'object') {
            return {
              ...prev,
              profile: nextProfile,
            };
          }
          return { profile: nextProfile };
        });

        if (user?.id) {
          queryClient.setQueryData(['profile', user.id], { profile: nextProfile });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      Toast.show({
        type: 'success',
        text1: 'Profile Completed',
        text2: data?.message || 'Your profile has been completed successfully.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Submission Failed',
        text2: getShortErrorMessage(error, 'Request failed.'),
      });
    },
  });
};

export const useGetOtherProfile = (id?: string) => {
  const safeId = String(id || '').trim();
  return useQuery({
    queryKey: ['otherProfile', safeId],
    queryFn: async () => {
      const res = await api.get(`/api/users/${safeId}/overview`);
      return res;
    },
    enabled: safeId.length > 0,
    retry: 1,
  });
};

export type SuggestedArtist = {
  id: string;
  name: string;
  role?: string;
  username?: string;
  profileImageUrl?: string;
  followersCount?: number;
  postsCount?: number;
};

export const useGetSuggestedArtists = (options?: {
  limit?: number;
  enabled?: boolean;
}) => {
  const limit = options?.limit ?? 10;
  return useQuery({
    queryKey: ['suggested-artists', limit],
    queryFn: async () => {
      const res: any = await api.get(`/api/users/suggested-artists?limit=${limit}`);
      const data = res?.data || res;
      return {
        artists: (data?.artists || []) as SuggestedArtist[],
        totalCount: Number(data?.totalCount || 0),
      };
    },
    enabled: options?.enabled,
  });
};

