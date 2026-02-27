import api from '@/api/axiosInstance';
import { getShortErrorMessage } from '@/lib/error';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

export const useGetAllChatList = () => {
  return useQuery({
    queryKey: ['chatlist'],
    queryFn: async () => {
      const res = await api.get(`/api/chats`);
      return res;
    },
  });
};

export const useGetAllMessages = (userId: string, options?: { limit?: number }) => {
  return useInfiniteQuery({
    queryKey: ['chat', userId, options?.limit ?? 20],
    queryFn: async ({ pageParam = 1 }) => {
      const limit = options?.limit ?? 20;
      const res = await api.get(`/api/chats/${userId}/messages?page=${pageParam}&limit=${limit}`);
      return res;
    },
    getNextPageParam: (lastPage: any) => {
      const page = lastPage?.page ?? 1;
      const totalPages = lastPage?.totalPages ?? 1;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!userId,
  });
};

export const useChattingSendMessage = () => {
  const queryClientInstance = useQueryClient();

  return useMutation({
    mutationFn: async ({ data, userId }: any) => {
      const res = await api.post(`/api/chats/${userId}/messages`, data);
      return res;
    },
    onSuccess: (_, variables) => {
      queryClientInstance.invalidateQueries({
        queryKey: ['chat', variables.userId],
        exact: false,
      });
      queryClientInstance.invalidateQueries({ queryKey: ['chatlist'] });
    },
  });
};

export const useMarkMessagesAsRead = () => {
  const queryClientInstance = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post(`/api/chats/${userId}/read`);
      return res;
    },
    onSuccess: (_, userId) => {
      // Invalidate chat list to update unread count
      queryClientInstance.invalidateQueries({ queryKey: ['chatlist'] });
    },
  });
};

export const useClearConversation = () => {
  const queryClientInstance = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post(`/api/chats/${userId}/clear`);
      return res;
    },
    onSuccess: (_data, userId) => {
      queryClientInstance.invalidateQueries({ queryKey: ['chat', userId], exact: false });
      queryClientInstance.invalidateQueries({ queryKey: ['chatlist'] });
      Toast.show({
        type: 'success',
        text1: 'Conversation Cleared',
        text2: 'Chat messages removed.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Clear Failed',
        text2: getShortErrorMessage(error, 'Could not clear conversation.'),
      });
    },
  });
};

export const useBlockUser = () => {
  const queryClientInstance = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post(`/api/chats/${userId}/block`);
      return res;
    },
    onSuccess: (_data, userId) => {
      queryClientInstance.invalidateQueries({ queryKey: ['chat', userId], exact: false });
      queryClientInstance.invalidateQueries({ queryKey: ['chatlist'] });
      Toast.show({
        type: 'success',
        text1: 'User Blocked',
        text2: 'You will no longer receive messages from this user.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Block Failed',
        text2: getShortErrorMessage(error, 'Could not block user.'),
      });
    },
  });
};

export const useUnblockUser = () => {
  const queryClientInstance = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post(`/api/chats/${userId}/unblock`);
      return res;
    },
    onSuccess: (_data, userId) => {
      queryClientInstance.invalidateQueries({ queryKey: ['chat', userId], exact: false });
      queryClientInstance.invalidateQueries({ queryKey: ['chatlist'] });
      Toast.show({
        type: 'success',
        text1: 'User Unblocked',
        text2: 'You can chat with this user again.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Unblock Failed',
        text2: getShortErrorMessage(error, 'Could not unblock user.'),
      });
    },
  });
};

export const useGetSharedChatLocations = () => {
  return useQuery({
    queryKey: ['chat-location-shared'],
    queryFn: async () => {
      const res = await api.get('/api/chats/locations/shared');
      return res;
    },
    refetchInterval: 30000,
  });
};

export const useUpdateMyChatLocationShare = () => {
  const queryClientInstance = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      isShared: boolean;
      latitude?: number | null;
      longitude?: number | null;
    }) => {
      const res = await api.post('/api/chats/locations/share', payload);
      return res;
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['chat-location-shared'] });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Location Update Failed',
        text2: getShortErrorMessage(error, 'Could not update location sharing.'),
      });
    },
  });
};
