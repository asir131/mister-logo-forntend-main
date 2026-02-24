import BackButton from '@/components/button/BackButton';
import NotificationCard from '@/components/card/NotificationCard';
import GradientBackground from '@/components/main/GradientBackground';
import { useDeleteNotification, useGetNotifications, useMarkNotificationRead } from '@/hooks/app/notification';
import { useTranslateTexts } from '@/hooks/app/translate';
import { connectSocket } from '@/lib/socketClient';
import useLanguageStore from '@/store/language.store';
import useAuthStore from '@/store/auth.store';
import useNotificationStore from '@/store/notification.store';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatRelativeTime(iso: string) {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return 'Just now';
  const diffMs = Date.now() - time;
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;

  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
}

type NotificationVisualType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'chat'
  | 'message'
  | 'share'
  | 'payment'
  | 'support'
  | 'system';

function normalizeNotificationType(item: any): NotificationVisualType {
  const rawType = String(item?.type || '').toLowerCase();
  const title = String(item?.title || '').toLowerCase();
  const body = String(item?.body || '').toLowerCase();
  const data = item?.data || {};

  if (rawType === 'chat' || rawType === 'message' || data?.senderId) {
    return rawType === 'message' ? 'message' : 'chat';
  }

  if (
    rawType === 'follow' ||
    title.includes('follower') ||
    body.includes('started following')
  ) {
    return 'follow';
  }

  if (
    rawType === 'comment' ||
    data?.postId ||
    data?.ucutId ||
    title.includes('comment')
  ) {
    return rawType === 'like' ? 'like' : rawType === 'share' ? 'share' : 'comment';
  }

  if (rawType === 'like' || title.includes('like') || body.includes('liked')) {
    return 'like';
  }

  if (
    rawType === 'share' ||
    title.includes('share') ||
    body.includes('shared')
  ) {
    return 'share';
  }

  if (
    rawType === 'payment' ||
    rawType === 'offer' ||
    title.includes('payment') ||
    body.includes('payment') ||
    body.includes('checkout')
  ) {
    return 'payment';
  }

  if (
    rawType === 'support' ||
    rawType === 'help' ||
    rawType === 'admin' ||
    title.includes('support')
  ) {
    return 'support';
  }

  return 'system';
}

const Notification = () => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const {
    notifications: localNotifications,
    addNotification,
    markAsRead: markAsReadLocal,
    resetBadgeCount,
    removeNotification: removeNotificationLocal,
    syncNotificationsFromServer,
  } = useNotificationStore();
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const { data: notificationData, refetch } = useGetNotifications({
    limit: 100,
    enabled: !!user?.token,
  });
  const { mutateAsync: markNotificationRead } = useMarkNotificationRead();
  const { mutateAsync: deleteNotification } = useDeleteNotification();
  const { data: t } = useTranslateTexts({
    texts: [
      'Notification',
      'No notifications yet.',
    ],
    targetLang: language,
    enabled: !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;

  const handleMenuToggle = (id: string) => {
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const handleMenuClose = () => {
    setActiveMenuId(null);
  };

  useFocusEffect(
    useCallback(() => {
      resetBadgeCount();
    }, [resetBadgeCount])
  );

  useEffect(() => {
    if (!Array.isArray(notificationData?.notifications)) return;

    const serverItems = notificationData.notifications.map((item: any) => ({
      id: String(item.id),
      title: String(item.title || 'Notification'),
      body: String(item.body || ''),
      type: String(item.type || 'system'),
      createdAt: item?.createdAt || new Date().toISOString(),
      screen: typeof item?.screen === 'string' ? item.screen : undefined,
      data: item?.data && typeof item.data === 'object' ? item.data : {},
      read: Boolean(item?.read),
    }));

    syncNotificationsFromServer(serverItems as any);
  }, [notificationData, syncNotificationsFromServer]);

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;

    const handleNotification = (payload: any) => {
      if (!payload?.id) return;
      addNotification({
        id: String(payload.id),
        title: String(payload.title || 'Notification'),
        body: String(payload.body || ''),
        type: String(payload.type || 'system'),
        createdAt: payload?.createdAt || new Date().toISOString(),
        screen: typeof payload?.screen === 'string' ? payload.screen : undefined,
        data: payload?.data && typeof payload.data === 'object' ? payload.data : {},
        read: Boolean(payload?.read),
      });
      refetch();
    };

    socket.on('notification:new', handleNotification);

    return () => {
      socket.off('notification:new', handleNotification);
      // keep global socket alive; only remove this screen listener
    };
  }, [addNotification, refetch]);

  const serverNotifications = useMemo(
    () => (Array.isArray(notificationData?.notifications) ? notificationData.notifications : []),
    [notificationData]
  );

  const sourceNotifications = useMemo(() => {
    const byId = new Map<string, any>();

    localNotifications.forEach((item: any) => {
      byId.set(String(item.id), item);
    });

    serverNotifications.forEach((item: any) => {
      byId.set(String(item.id), item);
    });

    return Array.from(byId.values()).sort((a: any, b: any) => {
      const aTs = new Date(a?.createdAt || 0).getTime();
      const bTs = new Date(b?.createdAt || 0).getTime();
      return bTs - aTs;
    });
  }, [localNotifications, serverNotifications]);

  const mappedNotifications = useMemo(
    () =>
      sourceNotifications.map((item:any) => ({
        id: item.id,
        name: item.title || 'Notification',
        reson: item.body || '',
        time: formatRelativeTime(item.createdAt),
        img: typeof item?.data?.profileImageUrl === 'string' ? item.data.profileImageUrl : null,
        type: normalizeNotificationType(item),
        isRead: item.read,
        userId:
          typeof item.data?.actorUserId === 'string'
            ? item.data.actorUserId
            : typeof item.data?.senderId === 'string'
            ? item.data.senderId
            : undefined,
        postId:
          typeof item.data?.postId === 'string' ? item.data.postId : undefined,
        screen: typeof item.screen === 'string' ? item.screen : undefined,
      })),
    [sourceNotifications]
  );

  const handleOpenNotification = async (item: (typeof mappedNotifications)[number]) => {
    markAsReadLocal(item.id);
    try {
      await markNotificationRead(item.id);
    } catch {
      // handled in mutation onError
    }

    if ((item.type === 'chat' || item.type === 'message') && item.userId) {
      router.push({
        pathname: '/screens/chat/chat-screen',
        params: {
          userId: item.userId,
          receiverId: item.userId,
        },
      });
      return;
    }

    if ((item.type === 'like' || item.type === 'comment') && item.postId) {
      router.push({
        pathname: '/screens/home/post-detail',
        params: { postId: item.postId },
      });
      return;
    }

    if (item.screen) {
      router.push(item.screen as any);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView className='flex-1 mt-2.5' edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View className='flex-row mt-4 mx-6'>
            <BackButton />
            <Text className='text-primary dark:text-white font-roboto-bold text-2xl text-center flex-1'>
              {tx(0, 'Notification')}
            </Text>
          </View>

          <View className='border-b border-black/20 dark:border-[#FFFFFF0D] w-full mt-2' />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 72, marginHorizontal: 24 }}
            onScrollBeginDrag={handleMenuClose}
          >
            {mappedNotifications.length === 0 ? (
              <Text className='mt-6 text-center text-primary dark:text-white font-roboto-regular text-base'>
                {tx(1, 'No notifications yet.')}
              </Text>
            ) : (
              mappedNotifications.map((item:any) => (
                <NotificationCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  reson={item.reson}
                  time={item.time}
                  img={item.img}
                  className='mt-3'
                  type={item.type}
                  isRead={item.isRead}
                  showMenu={activeMenuId === item.id}
                  onMenuToggle={handleMenuToggle}
                  onMenuClose={handleMenuClose}
                  onMarkAsRead={id => {
                    markAsReadLocal(id);
                    markNotificationRead(id).catch(() => null);
                  }}
                  onDelete={id => {
                    removeNotificationLocal(id);
                    deleteNotification(id).catch(() => null);
                  }}
                  userId={item.userId}
                  onPress={() => {
                    handleOpenNotification(item).catch(() => null);
                  }}
                />
              ))
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
};

export default Notification;

