import ShadowButton from '@/components/button/ShadowButton';
import GradientBackground from '@/components/main/GradientBackground';
import { useTranslateTexts } from '@/hooks/app/translate';
import useAuthStore from '@/store/auth.store';
import useLanguageStore from '@/store/language.store';
import useThemeStore from '@/store/theme.store';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WelcomeScreen = () => {
  const { mode } = useThemeStore();
  const isLight = mode === 'light';
  const { user } = useAuthStore();
  const { language } = useLanguageStore();
  const { data: t } = useTranslateTexts({
    texts: [
      'Welcome to',
      'United Artists of Power app',
      'Where artists unite, share, and rise together.',
      'Get Started',
      'Create Account',
    ],
    targetLang: language,
    enabled: !!user?.token && !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;

  return (
    <GradientBackground>
      <SafeAreaView
        edges={['top', 'bottom', 'left', 'right']}
        className='p-6 flex-1 justify-center'
      >
        <View
          className={`px-4 py-3 rounded-2xl ${
            isLight ? 'bg-black/10' : 'bg-transparent'
          }`}
        >
          <Image
            source={require('@/assets/images/logo.png')}
            style={{ width: '100%', height: 130 }}
            contentFit='contain'
          />
        </View>

        {/* welcome message */}
        <View className='mt-8 my-10 items-center'>
          <Text style={{ color: isLight ? '#000000' : '#FFFFFF' }} className='font-roboto-semibold text-center text-2xl'>
            {tx(0, 'Welcome to')}
          </Text>
          <Text style={{ color: isLight ? '#000000' : '#FFFFFF' }} className='font-roboto-semibold text-center text-2xl'>
            {tx(1, 'United Artists of Power app')}
          </Text>
          <Text style={{ color: isLight ? '#000000' : '#FFFFFF' }} className='font-roboto-medium text-center text-sm mt-2'>
            {tx(2, 'Where artists unite, share, and rise together.')}
          </Text>
        </View>

        {/* buttons */}
        <View className='my-6'>
          <ShadowButton
            text={tx(3, 'Get Started')}
            textColor='#2B2B2B'
            backGroundColor='#E8EBEE'
            onPress={() => router.push('/(auth)/login')}
          />

          <TouchableOpacity
            onPress={() => router.push('/screens/auth/notice')}
            className='p-3 rounded-full mt-3 border border-black/20 dark:border-[#FFFFFF0D]' style={{ backgroundColor: isLight ? '#00000066' : '#475569' }}
          >
            <Text style={{ color: isLight ? '#000000' : '#FFFFFF' }} className='font-roboto-bold text-center'>
              {tx(4, 'Create Account')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
};

export default WelcomeScreen;

