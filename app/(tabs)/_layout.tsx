import { Tabs, router } from 'expo-router';
import React, { useEffect } from 'react';
import useAuthStore from '@/store/auth.store';

import { HapticTab } from '@/components/haptic-tab';
import { useTranslateTexts } from '@/hooks/app/translate';
import useLanguageStore from '@/store/language.store';
import useThemeStore from '@/store/theme.store';
import {
  Feather,
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { user, authReady } = useAuthStore();
  const { mode } = useThemeStore();
  const isLight = mode === 'light';
  const { language } = useLanguageStore();
  const insets = useSafeAreaInsets();

  const tabBottomPadding = Math.max(insets.bottom, 10);
  const tabHeight = 56 + tabBottomPadding;

  const { data: t } = useTranslateTexts({
    texts: ['Home', 'Trending', 'UPost', 'UClips', 'Message', 'Profile'],
    targetLang: language,
    enabled: !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;

  useEffect(() => {
    if (!authReady) return;
    if (!user?.token) {
      router.replace('/(auth)/login');
    }
  }, [authReady, user?.token]);

  if (!authReady || !user?.token) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isLight ? '#000000' : '#FFFFFF',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: isLight ? '#FFFFFF' : '#000000',
          paddingBottom: tabBottomPadding,
          height: tabHeight,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          marginBottom: Platform.OS === 'android' ? 2 : 0,
        },
      }}
    >
      <Tabs.Screen
        name='home'
        options={{
          title: tx(0, 'Home'),
          tabBarIcon: ({ color }) => (
            <Ionicons name='home-outline' size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='trending'
        options={{
          title: tx(1, 'Trending'),
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name='chart-timeline-variant-shimmer'
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='create'
        options={{
          title: tx(2, 'UPost'),
          tabBarIcon: ({ color }) => (
            <Feather name='plus-square' size={22} color={color} />
          ),
        }}
        listeners={{
          tabPress: e => {
            e.preventDefault();
            router.navigate({
              pathname: '/(tabs)/create',
              params: { reset: Date.now().toString() },
            });
          },
        }}
      />
      <Tabs.Screen
        name='uclips'
        options={{
          title: tx(3, 'UClips'),
          tabBarIcon: ({ color }) => (
            <MaterialIcons name='video-library' size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='chats'
        options={{
          title: tx(4, 'Message'),
          tabBarIcon: ({ color }) => (
            <Ionicons name='chatbox-outline' size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='profile'
        options={{
          title: tx(5, 'Profile'),
          tabBarIcon: ({ color }) => (
            <Ionicons name='person-outline' size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
