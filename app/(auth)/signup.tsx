import BackButton from '@/components/button/BackButton';
import ShadowButton from '@/components/button/ShadowButton';
import Inpute from '@/components/inpute/Inpute';
import GradientBackground from '@/components/main/GradientBackground';
import api from '@/api/axiosInstance';
import { useUserRegister } from '@/hooks/app/auth';
import { getShortErrorMessage } from '@/lib/error';
import {
  observeAuthState,
  signInWithFacebook,
  signInWithGoogle,
  signInWithInstagram,
} from '@/services/socialAuth';
import { useTranslateTexts } from '@/hooks/app/translate';
import useAuthStore from '@/store/auth.store';
import useLanguageStore from '@/store/language.store';
import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const Signup = () => {
  type ProviderKey = 'google' | 'facebook' | 'instagram';
  const [socialLoading, setSocialLoading] = useState<ProviderKey | null>(null);
  const { setEmail, setUser, setRememberPreference, user } = useAuthStore();
  const { language } = useLanguageStore();
  const { data: t } = useTranslateTexts({
    texts: [
      'Welcome Back!',
      'Create your account',
      'Name',
      'Email',
      'Phone',
      'Password',
      'Confirm Password',
      'You agree to the',
      'Terms of service',
      'Privacy policy',
      'Register',
      'Already have an account?',
      'Log In',
      'Or continue with',
    ],
    targetLang: language,
    enabled: !!user?.token && !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;

  const [isTerm, setIsTerm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });

  const { mutate } = useUserRegister();

  const logPretty = (label: string, value: any) => {
    try {
      const payload = value?.toJSON?.() ?? value;
      console.log(label, JSON.stringify(payload, null, 2));
    } catch {
      console.log(label, value);
    }
  };

  const mapFirebaseUserToAuthUser = async (firebaseUser: any) => {
    const idToken = await firebaseUser.getIdToken();
    const data: any = await api.post('/api/auth/firebase', {
      idToken,
      name: firebaseUser?.displayName || undefined,
      phoneNumber: firebaseUser?.phoneNumber || undefined,
      photoURL: firebaseUser?.photoURL || undefined,
    });
    if (!data?.token) {
      throw new Error(data?.error || 'Backend token issue after Firebase signup.');
    }

    return {
      authUser: {
        id: data?.user?.id || firebaseUser.uid,
        name:
          data?.user?.name ||
          firebaseUser.displayName ||
          (typeof firebaseUser.email === 'string'
            ? firebaseUser.email.split('@')[0]
            : 'User'),
        email: data?.user?.email || firebaseUser.email || '',
        phoneNumber: data?.user?.phoneNumber || firebaseUser.phoneNumber || '',
        token: data?.token,
        refreshToken: data?.refreshToken || null,
      },
      isFirstLogin: Boolean(data?.isFirstLogin),
      needsProfileCompletion: Boolean(data?.needsProfileCompletion),
    };
  };

  const signupActions: Record<ProviderKey, () => Promise<unknown>> = {
    google: signInWithGoogle,
    facebook: signInWithFacebook,
    instagram: signInWithInstagram,
  };

  useEffect(() => {
    const unsubscribe = observeAuthState(async firebaseUser => {
      if (!firebaseUser) return;
      if (user?.id === firebaseUser.uid && user?.token) return;

      try {
        const { authUser, isFirstLogin, needsProfileCompletion } =
          await mapFirebaseUserToAuthUser(firebaseUser);
        setUser(authUser as any);
        setRememberPreference(true);
        if (isFirstLogin || needsProfileCompletion) {
          router.replace('/screens/profile/complete-profile');
        } else {
          router.replace('/(tabs)/trending');
        }
      } catch {
        // Ignore silent restore failure on mount
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [setRememberPreference, setUser, user?.id, user?.token]);

  const handleSocialSignup = async (provider: ProviderKey) => {
    if (socialLoading) return;

    setRememberPreference(true);
    setSocialLoading(provider);
    try {
      const result: any = await signupActions[provider]();
      logPretty('[Signup][social] raw result =>', result);

      if (result?.authUser?.token) {
        const authUser = result.authUser;
        const isFirstLogin = Boolean(result?.isFirstLogin);
        const needsProfileCompletion = Boolean(result?.needsProfileCompletion);
        setUser(authUser as any);

        Toast.show({
          type: 'success',
          text1: 'Signup Successful',
          text2: `Signed in with ${provider === 'google' ? 'Google' : 'Facebook'}.`,
        });
        if (isFirstLogin || needsProfileCompletion) {
          router.replace('/screens/profile/complete-profile');
        } else {
          router.replace('/(tabs)/trending');
        }
        return;
      }

      const firebaseUser = result?.user;
      if (!firebaseUser) throw new Error('Social signup failed.');

      logPretty('[Signup][social] firebaseUser =>', firebaseUser);
      try {
        const tokenResult = await firebaseUser.getIdTokenResult?.();
        logPretty('[Signup][social] tokenResult =>', tokenResult);
      } catch (e) {
        console.log('[Signup][social] tokenResult error =>', e);
      }

      const { authUser, isFirstLogin, needsProfileCompletion } =
        await mapFirebaseUserToAuthUser(firebaseUser);
      setUser(authUser as any);

      Toast.show({
        type: 'success',
        text1: 'Signup Successful',
        text2: `Signed in with ${provider === 'google' ? 'Google' : 'Facebook'}.`,
      });
      if (isFirstLogin || needsProfileCompletion) {
        router.replace('/screens/profile/complete-profile');
      } else {
        router.replace('/(tabs)/trending');
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Signup Failed',
        text2: getShortErrorMessage(error, 'Social signup failed.'),
      });
    } finally {
      setSocialLoading(null);
    }
  };

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const hendleRegister = async () => {
    if (!isTerm) {
      Toast.show({
        type: 'error',
        text1: 'Terms Required',
        text2: 'Please accept terms & conditions',
      });
      return;
    }

    if (!formData.email || !formData.password) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Email & Password are required',
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Password Mismatch',
        text2: 'Confirm password does not match.',
      });
      return;
    }

    mutate(formData, {
      onSuccess: data => {
        router.push('/screens/auth/signup-otp-verify');
        setEmail(formData.email);
      },
    });
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        className='flex-1'
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView className='flex-1 mx-6 mt-2.5'>
          <BackButton />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            <View>
              <Text className='text-[#000000] dark:text-white text-2xl font-roboto-semibold mt-6 text-center'>
                {tx(0, 'Welcome Back!')}
              </Text>
              <Text className='font-roboto-medium text-secondary dark:text-white/80 text-sm text-center mt-1.5'>
                {tx(1, 'Create your account')}
              </Text>
            </View>

            <View className='p-6 bg-[#F0F2F5] dark:bg-[#FFFFFF0D] rounded-3xl mt-6'>
              <Inpute
                title={tx(2, 'Name')}
                placeholder='Rokey Mahmud'
                value={formData.name}
                onChangeText={text => handleChange('name', text)}
              />

              <Inpute
                type='email-address'
                title={tx(3, 'Email')}
                placeholder='example@example.com'
                required
                className='mt-4'
                value={formData.email}
                onChangeText={text => handleChange('email', text)}
              />

              <Inpute
                title={tx(4, 'Phone')}
                placeholder='+880 123 123 123'
                type='number-pad'
                className='mt-4'
                value={formData.phoneNumber}
                onChangeText={text => handleChange('phoneNumber', text)}
              />

              <Inpute
                title={tx(5, 'Password')}
                placeholder='********'
                required
                isPassword
                className='mt-4'
                value={formData.password}
                onChangeText={text => handleChange('password', text)}
              />

              <Inpute
                title={tx(6, 'Confirm Password')}
                placeholder='********'
                required
                isPassword
                className='mt-4'
                value={formData.confirmPassword}
                onChangeText={text => handleChange('confirmPassword', text)}
              />

              <View className='flex-row gap-2 items-center mt-4'>
                <TouchableOpacity
                  onPress={() => setIsTerm(!isTerm)}
                  className={`h-5 w-5 rounded-md items-center justify-center ${
                    isTerm ? 'bg-blue-600' : 'bg-secondary'
                  }`}
                >
                  {isTerm && <Feather name='check' size={16} color='#ffffff' />}
                </TouchableOpacity>

                <Text className='text-secondary dark:text-white/80 text-sm pr-5'>
                  {tx(7, 'You agree to the')}{' '}
                  <Text className='font-roboto-semibold underline'>
                    {tx(8, 'Terms of service')}
                  </Text>{' '}
                  &{' '}
                  <Text className='font-roboto-semibold underline'>
                    {tx(9, 'Privacy policy')}
                  </Text>
                </Text>
              </View>

              <ShadowButton
                text={tx(10, 'Register')}
                textColor='#2B2B2B'
                backGroundColor='#E8EBEE'
                onPress={hendleRegister}
                className='mt-4'
              />

              <View className='mt-4 flex-row justify-center'>
                <Text className='text-secondary dark:text-white/80 text-sm'>
                  {tx(11, 'Already have an account?')}
                </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text className='font-roboto-bold text-secondary dark:text-white/80 text-sm'>
                    {' '}
                    {tx(12, 'Log In')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className='mt-6'>
              <Text className='text-secondary dark:text-white/80 text-center'>
                {tx(13, 'Or continue with')}
              </Text>

              {/* social with login */}
              <View className='mt-6 flex-row gap-4'>
                <TouchableOpacity
                  onPress={() => handleSocialSignup('google')}
                  disabled={!!socialLoading}
                  className='flex-1 p-3 border border-black/20 dark:border-[#FFFFFF0D] rounded-xl items-center'
                >
                  <Image
                    source={require('@/assets/images/google.svg')}
                    style={{ width: 24, height: 24 }}
                    contentFit='contain'
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSocialSignup('facebook')}
                  disabled={!!socialLoading}
                  className='flex-1 p-3 border border-black/20 dark:border-[#FFFFFF0D] rounded-xl items-center'
                >
                  <Feather name='facebook' size={24} color='#1877F2' />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSocialSignup('instagram')}
                  disabled={!!socialLoading}
                  className='flex-1 p-3 border border-black/20 dark:border-[#FFFFFF0D] rounded-xl items-center'
                >
                  <Feather name='instagram' size={24} color='#E1306C' />
                </TouchableOpacity>
              </View>
              {socialLoading && (
                <View className='mt-3 flex-row items-center justify-center gap-2'>
                  <ActivityIndicator size='small' color='#111827' />
                  <Text className='text-secondary dark:text-white/80 text-xs'>
                    Opening {socialLoading === 'google' ? 'Google' : socialLoading === 'facebook' ? 'Facebook' : 'Instagram'}...
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
};

export default Signup;




