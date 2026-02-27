import {
  getFCMToken,
  getInitialFCMNotification,
  isFirebaseMessagingAvailable,
  type RemoteMessage,
  requestFCMPermission,
  subscribeForegroundFCM,
} from '@/services/fcm';
import api from '@/api/axiosInstance';
import { connectSocket } from '@/lib/socketClient';
import {
  getExpoNotificationsModule,
} from '@/services/expoNotifications';
import { createNotificationChannel } from '@/services/notificationChannel';
import { registerPushToken } from '@/services/pushToken';
import { getNotificationStore } from '@/store/notification.store';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import './global.css';

import useAuthStore from '@/store/auth.store';
import useThemeStore from '@/store/theme.store';
import { useColorScheme as useNWColorScheme } from 'nativewind';
import { useEffect, useRef, useState } from 'react';

export const unstable_settings = {
  anchor: '(tabs)',
};

const RootLayout = () => {
  const { mode } = useThemeStore();
  const { setColorScheme } = useNWColorScheme();
  const { user } = useAuthStore();

  const islight = mode === 'light';
  const notifications = getExpoNotificationsModule();
  const hasFirebaseMessaging = isFirebaseMessagingAvailable();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const lastRegisteredTokenRef = useRef<string | null>(null);
  const lastUblastToastIdRef = useRef<string | null>(null);

  const pushInAppNotification = (remoteMessage: RemoteMessage) => {
    const title =
      remoteMessage.notification?.title ||
      (typeof remoteMessage.data?.title === 'string'
        ? remoteMessage.data.title
        : 'New Notification');
    const body =
      remoteMessage.notification?.body ||
      (typeof remoteMessage.data?.body === 'string'
        ? remoteMessage.data.body
        : '');

    const id =
      remoteMessage.messageId ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    getNotificationStore().addNotification({
      id,
      title,
      body,
      type: String(remoteMessage.data?.type || 'system'),
      createdAt: remoteMessage.sentTime
        ? new Date(remoteMessage.sentTime).toISOString()
        : new Date().toISOString(),
      screen:
        typeof remoteMessage.data?.screen === 'string'
          ? remoteMessage.data.screen
          : undefined,
      data: remoteMessage.data,
      read: false,
    });

    return { title, body };
  };

  useEffect(() => {
    setColorScheme(mode);
  }, [mode, setColorScheme]);

  useEffect(() => {
    if (!notifications) return;
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }, [notifications]);

  useEffect(() => {
    async function setup() {
      try {
        if (!hasFirebaseMessaging) {
          console.log('Firebase native module unavailable. Skipping FCM setup.');
          return;
        }
        await createNotificationChannel();
        const granted = await requestFCMPermission();
        if (!granted) {
          console.log('Notification permission denied');
          return;
        }
        const token = await getFCMToken();
        if (token) {
          setFcmToken(token);
        }
      } catch (error) {
        console.error('Firebase setup error:', error);
      }
    }
    setup();
  }, [hasFirebaseMessaging]);

  useEffect(() => {
    if (!hasFirebaseMessaging) return;
    if (!user?.token) return;
    if (!fcmToken) return;
    if (lastRegisteredTokenRef.current === fcmToken) return;

    registerPushToken(fcmToken)
      .then(() => {
        lastRegisteredTokenRef.current = fcmToken;
      })
      .catch(error => {
        console.log('Push token registration failed:', error?.message || error);
      });
  }, [hasFirebaseMessaging, user?.token, fcmToken]);

  useEffect(() => {
    if (!user?.token) return;

    let cancelled = false;

    const syncServerNotifications = () => {
      api
        .get('/api/notifications?page=1&limit=100')
        .then((res: any) => {
          if (cancelled) return;
          const items = Array.isArray(res?.notifications) ? res.notifications : [];
          if (!items.length) return;

          const unreadUblastItems = items.filter(
            (item: any) => String(item?.type || '').toLowerCase() === 'ublast' && !Boolean(item?.read)
          );
          const unreadUblast = unreadUblastItems.sort(
            (a: any, b: any) =>
              new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
          )[0];
          const unreadUblastId = String(unreadUblast?.id || unreadUblast?._id || '');
          if (unreadUblastId && lastUblastToastIdRef.current !== unreadUblastId) {
            lastUblastToastIdRef.current = unreadUblastId;
            Toast.show({
              type: 'info',
              text1: String(unreadUblast?.title || 'New UBlast Is Live'),
              text2: String(unreadUblast?.body || 'Check active section in trending.'),
            });
          }

          getNotificationStore().syncNotificationsFromServer(
            items.map((item: any) => ({
              id: String(item.id || item._id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
              title: String(item.title || 'Notification'),
              body: String(item.body || ''),
              type: String(item.type || 'system'),
              createdAt: item?.createdAt || new Date().toISOString(),
              screen: typeof item?.screen === 'string' ? item.screen : undefined,
              data: item?.data && typeof item.data === 'object' ? item.data : {},
              read: Boolean(item?.read),
            }))
          );
        })
        .catch(() => null);
    };

    syncServerNotifications();
    const interval = setInterval(syncServerNotifications, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user?.token]);

  useEffect(() => {
    if (!hasFirebaseMessaging) return;
    try {
      const unsubscribe = subscribeForegroundFCM(async remoteMessage => {
        console.log('Foreground notification received:', remoteMessage);
        const { title, body } = pushInAppNotification(remoteMessage);

        Toast.show({
          type: 'info',
          text1: title,
          text2: body || 'You have a new update.',
        });
      });
      return () => {
        unsubscribe();
      };
    } catch (error) {
      console.error('Foreground notification setup error:', error);
    }
  }, [hasFirebaseMessaging, notifications]);

  useEffect(() => {
    if (!notifications) return;

    const subscription = notifications.addNotificationResponseReceivedListener(
      response => {
        console.log('Notification interaction:', response);
        const payloadData = response.notification.request.content.data || {};
        getNotificationStore().addNotification({
          id: response.notification.request.identifier,
          title: String(response.notification.request.content.title || 'Notification'),
          body: String(response.notification.request.content.body || ''),
          type: String(payloadData.type || 'system'),
          createdAt: new Date().toISOString(),
          screen: typeof payloadData.screen === 'string' ? payloadData.screen : undefined,
          data: payloadData as Record<string, string>,
          read: true,
        });

        const screen = response.notification.request.content.data?.screen;
        if (typeof screen === 'string' && screen.length > 0) {
          router.push(screen as any);
        } else {
          router.push('/');
        }
      }
    );

    return () => subscription.remove();
  }, [notifications]);

  useEffect(() => {
    if (!hasFirebaseMessaging) return;
    async function checkInitialNotification() {
      try {
        const remoteMessage = await getInitialFCMNotification();

        if (remoteMessage) {
          console.log(
            'App opened from killed state via notification:',
            remoteMessage
          );
          pushInAppNotification(remoteMessage);
          const screen = remoteMessage.data?.screen;
          if (typeof screen === 'string' && screen.length > 0) {
            router.push(screen as any);
          } else {
            router.push('/');
          }
        }
      } catch (error) {
        console.error('Initial notification check error:', error);
      }
    }

    checkInitialNotification();
  }, [hasFirebaseMessaging]);

  useEffect(() => {
    if (!user?.token || !user?.id) return;

    const socket = connectSocket();
    if (!socket) return;

    const handleIncomingMessage = async (payload: any) => {
      const message = payload?.message;
      if (!message) return;

      const recipientId = String(message?.recipientId || '');
      const senderId = String(message?.senderId || '');
      if (!recipientId || recipientId !== String(user.id)) return;
      if (!senderId || senderId === String(user.id)) return;

      const body =
        typeof message?.text === 'string' && message.text.trim()
          ? message.text.trim().slice(0, 120)
          : message?.mediaType === 'image'
          ? 'Sent a photo'
          : message?.mediaType === 'video'
          ? 'Sent a video'
          : message?.mediaType === 'audio'
          ? 'Sent an audio message'
          : 'Sent a message';

      const itemId = `chat-${String(message?._id || Date.now())}`;
      getNotificationStore().addNotification({
        id: itemId,
        title: 'New message',
        body,
        type: 'chat',
        createdAt: new Date(message?.createdAt || Date.now()).toISOString(),
        screen: `/screens/chat/chat-screen?userId=${senderId}`,
        data: {
          type: 'chat',
          senderId,
          conversationId: String(payload?.conversationId || ''),
        },
        read: false,
      });


    };

    const handleIncomingNotification = (payload: any) => {
      if (!payload) return;

      const payloadData = payload?.data && typeof payload.data === 'object' ? payload.data : {};
      const type = String(payload?.type || payloadData?.type || 'system').toLowerCase();
      if (type === 'chat') return;

      const id = String(
        payload?.id ||
          payload?._id ||
          payloadData?.id ||
          payloadData?._id ||
          `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      );
      const title = String(payload?.title || payloadData?.title || 'Notification');
      const body = String(payload?.body || payloadData?.body || '');

      getNotificationStore().addNotification({
        id,
        title,
        body,
        type,
        createdAt: payload?.createdAt || new Date().toISOString(),
        screen:
          typeof payload?.screen === 'string'
            ? payload.screen
            : typeof payloadData?.screen === 'string'
            ? payloadData.screen
            : undefined,
        data: payloadData,
        read: Boolean(payload?.read),
      });

      if (type === 'ublast' && lastUblastToastIdRef.current !== id) {
        lastUblastToastIdRef.current = id;
        Toast.show({
          type: 'info',
          text1: title || 'New UBlast Is Live',
          text2: body || 'Check active section in trending.',
        });
      }
    };

    socket.on('message:new', handleIncomingMessage);
    socket.on('notification:new', handleIncomingNotification);

    return () => {
      socket.off('message:new', handleIncomingMessage);
      socket.off('notification:new', handleIncomingNotification);
    };
  }, [user?.token, user?.id]);

  const [fontsLoaded] = useFonts({
    'Roboto-Bold': require('@/assets/fonts/Roboto-Bold.ttf'),
    'Roboto-SemiBold': require('@/assets/fonts/Roboto-SemiBold.ttf'),
    'Roboto-Medium': require('@/assets/fonts/Roboto-Medium.ttf'),
    'Roboto-Regular': require('@/assets/fonts/Roboto-Regular.ttf'),
    'Roboto-Thin': require('@/assets/fonts/Roboto-Thin.ttf'),
  });

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const lightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: '#FFFFFF',
      card: '#FFFFFF',
      text: '#000000',
      border: 'rgba(0,0,0,0.2)',
      primary: '#000000',
    },
  };

  const darkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#0B0F15',
      card: '#0B0F15',
      text: '#FFFFFF',
      border: '#292929',
      primary: '#FFFFFF',
    },
  };

  return (
    <ThemeProvider value={mode === 'light' ? lightTheme : darkTheme}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name='splash' options={{ headerShown: false }} />
          <Stack.Screen name='(auth)' />
          <Stack.Screen name='auth/social' />
          <Stack.Screen name='(tabs)' />
        </Stack>
      </QueryClientProvider>
      <StatusBar
        style={islight ? 'dark' : 'light'}
        backgroundColor={islight ? '#FFFFFF' : '#000000'}
      />
      <Toast />
    </ThemeProvider>
  );
};

export default RootLayout;















