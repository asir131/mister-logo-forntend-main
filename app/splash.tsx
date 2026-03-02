import GradientBackground from '@/components/main/GradientBackground';
import useAuthStore from '@/store/auth.store';
import useThemeStore from '@/store/theme.store';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { View } from 'react-native';

const SplashScreen = () => {
  const { user, authReady } = useAuthStore();
  const { mode } = useThemeStore();
  const isLight = mode === 'light';

  useEffect(() => {
    if (!authReady) return;

    const timer = setTimeout(() => {
      if (user?.token) {
        router.replace('/(tabs)/trending');
      } else {
        router.replace('/(auth)/login');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [authReady, user?.token]);

  return (
    <GradientBackground className='justify-center items-center'>
      <View className='flex-1 justify-center items-center'>
        <View
          className={`px-4 py-3 rounded-2xl ${
            isLight ? 'bg-black/10' : 'bg-transparent'
          }`}
        >
          <Image
            source={require('@/assets/images/logo.png')}
            style={{ width: 350, height: 150 }}
            contentFit='contain'
          />
        </View>
      </View>
    </GradientBackground>
  );
};

export default SplashScreen;
