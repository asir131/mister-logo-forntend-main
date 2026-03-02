import BackButton from '@/components/button/BackButton';
import ShadowButton from '@/components/button/ShadowButton';
import Inpute from '@/components/inpute/Inpute';
import GradientBackground from '@/components/main/GradientBackground';
import api from '@/api/axiosInstance';
import { useUserLogin } from '@/hooks/app/auth';
import { useTranslateTexts } from '@/hooks/app/translate';
import { getShortErrorMessage } from '@/lib/error';
import {
  observeAuthState,
  signInWithFacebook,
  signInWithGoogle,
  signInWithInstagram,
} from '@/services/socialAuth';
import { saveTokens } from '@/services/authSession';
import useAuthStore from '@/store/auth.store';
import useLanguageStore from '@/store/language.store';
import useThemeStore from '@/store/theme.store';
import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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

const Login = () => {
  type ProviderKey = 'google' | 'facebook' | 'instagram';
  const [rememberMe, setRememberMe] = useState(false);
  const [socialLoading, setSocialLoading] = useState<ProviderKey | null>(null);
  const { mutate } = useUserLogin();
  const { setUser, setRememberPreference, user } = useAuthStore();

  const { mode } = useThemeStore();
  const isLight = mode === 'light';  const { language } = useLanguageStore();
  const { data: t } = useTranslateTexts({
    texts: [
      'Welcome Back!',
      'Login to your account',
      'Phone',
      'Email',
      'Password',
      'Remember me',
      'Forgot Password?',
      'Login',
      "Don't have an account?",
      'Register',
      'Or continue with',
    ],
    targetLang: language,
    enabled: !!user?.token && !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;

  // Login input states
  const [phoneNumber, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const logPretty = (label: string, value: any) => {
    try {
      const payload = value?.toJSON?.() ?? value;
      console.log(label, JSON.stringify(payload, null, 2));
    } catch {
      console.log(label, value);
    }
  };

  const buildFlatFirebaseLog = (firebaseUser: any, authUser?: any) => {
    const provider = firebaseUser?.providerData?.[0] || {};
    const enrolledFactors = Array.isArray(firebaseUser?.multiFactor?.enrolledFactors)
      ? firebaseUser.multiFactor.enrolledFactors
      : [];

    return {
      uid: firebaseUser?.uid || '',
      email: firebaseUser?.email || '',
      name: firebaseUser?.displayName || '',
      photoURL: firebaseUser?.photoURL || null,
      phoneNumber: firebaseUser?.phoneNumber || null,
      emailVerified: Boolean(firebaseUser?.emailVerified),
      isAnonymous: Boolean(firebaseUser?.isAnonymous),
      tenantId: firebaseUser?.tenantId || null,
      providerId: provider?.providerId || firebaseUser?.providerId || null,
      providerUid: provider?.uid || null,
      creationTime: firebaseUser?.metadata?.creationTime || null,
      lastSignInTime: firebaseUser?.metadata?.lastSignInTime || null,
      enrolledFactors: enrolledFactors.length,
      token: authUser?.token ? `${String(authUser.token).slice(0, 20)}...` : null,
      refreshToken: authUser?.refreshToken
        ? `${String(authUser.refreshToken).slice(0, 20)}...`
        : null,
    };
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
      throw new Error(data?.error || 'Backend token issue after Firebase login.');
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

  const loginActions: Record<ProviderKey, () => Promise<unknown>> = {
    google: signInWithGoogle,
    facebook: signInWithFacebook,
    instagram: signInWithInstagram,
  };

  const finalizeLoginSession = useCallback(
    async (authUser: any, remember: boolean) => {
      const normalizedUser = {
        ...authUser,
        refreshToken: remember ? authUser?.refreshToken || null : null,
      };

      await saveTokens(
        normalizedUser?.token || null,
        authUser?.refreshToken || null,
        remember
      );

      setUser(normalizedUser);
      setRememberPreference(remember);
    },
    [setRememberPreference, setUser]
  );

  useEffect(() => {
    const unsubscribe = observeAuthState(async firebaseUser => {
      if (!firebaseUser) return;
      if (user?.id === firebaseUser.uid && user?.token) return;

      try {
        const { authUser, isFirstLogin, needsProfileCompletion } =
          await mapFirebaseUserToAuthUser(firebaseUser);
        console.log(
          '[Login][observeAuthState][flat] =>',
          JSON.stringify(buildFlatFirebaseLog(firebaseUser, authUser), null, 2)
        );
        logPretty('[Login][observeAuthState][backend] =>', authUser);
        await finalizeLoginSession(authUser as any, true);
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
  }, [finalizeLoginSession, user?.id, user?.token]);

  const handleSocialLogin = async (provider: ProviderKey) => {
    if (socialLoading) return;

    setRememberPreference(true);
    setSocialLoading(provider);
    try {
      const result: any = await loginActions[provider]();
      logPretty('[Login][social] raw result =>', result);

      if (result?.authUser?.token) {
        const authUser = result.authUser;
        const isFirstLogin = Boolean(result?.isFirstLogin);
        const needsProfileCompletion = Boolean(result?.needsProfileCompletion);
        logPretty('[Login][social][backend] =>', authUser);
        await finalizeLoginSession(authUser as any, true);

        Toast.show({
          type: 'success',
          text1: 'Login Successful',
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
      if (!firebaseUser) throw new Error('Social login failed.');

      try {
        const tokenResult = await firebaseUser.getIdTokenResult?.();
        logPretty('[Login][social] tokenResult =>', tokenResult);
      } catch (e) {
        console.log('[Login][social] tokenResult error =>', e);
      }

      const { authUser, isFirstLogin, needsProfileCompletion } =
        await mapFirebaseUserToAuthUser(firebaseUser);
      console.log(
        '[Login][social][flat] =>',
        JSON.stringify(buildFlatFirebaseLog(firebaseUser, authUser), null, 2)
      );
      logPretty('[Login][social][backend] =>', authUser);
      await finalizeLoginSession(authUser as any, true);

      Toast.show({
        type: 'success',
        text1: 'Login Successful',
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
        text1: 'Login Failed',
        text2: getShortErrorMessage(error, 'Social login failed.'),
      });
    } finally {
      setSocialLoading(null);
    }
  };

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      alert('Please fill all fields');
      return;
    }

    const user = {
      phoneNumber,
      email,
      password,
    };

    mutate(user, {
      onSuccess: async data => {
        console.log('[Login][email-password] API response:', {
          user: data?.user || null,
          token: data?.token ? `${String(data.token).slice(0, 20)}...` : null,
          refreshToken: data?.refreshToken
            ? `${String(data.refreshToken).slice(0, 20)}...`
            : null,
          message: data?.message || null,
        });
        Toast.show({
          type: 'success',
          text1: 'Login Successful',
          text2: 'Welcome back to UNAP',
        });
        const user = {
          //@ts-ignore
          refreshToken: rememberMe ? data?.refreshToken : null,
          //@ts-ignore
          token: data?.token,
          //@ts-ignore
          email: data?.user?.email || '',
          //@ts-ignore
          name: data?.user?.name || '',
          //@ts-ignore
          phoneNumber: data?.user?.phoneNumber || '',
          //@ts-ignore
          id: data?.user?.id || '',
        };
        console.log('[Login][email-password] Saved auth user:', {
          ...user,
          token: user?.token ? `${String(user.token).slice(0, 20)}...` : null,
          refreshToken: user?.refreshToken
            ? `${String(user.refreshToken).slice(0, 20)}...`
            : null,
        });
        await finalizeLoginSession(user, rememberMe);
        router.replace('/(tabs)/trending');
      },
      onError: error => {
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: getShortErrorMessage(error, 'Login failed.'),
        });
      },
    });
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        className='flex-1'
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <SafeAreaView
          className='flex-1 mx-6 mt-2.5'
          edges={['top', 'bottom', 'left', 'right']}
        >
          <BackButton />

          <ScrollView
            className='flex-1'
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='handled'
            keyboardDismissMode='on-drag'
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 24 }}
          >
          <View className='w-full'>
            <View>
              <Text className='text-[#000000] dark:text-white text-2xl font-roboto-semibold mt-6 text-center'>
                {tx(0, 'Welcome Back!')}
              </Text>
              <Text className='font-roboto-medium text-secondary dark:text-white/80 text-sm text-center mt-1.5'>
                {tx(1, 'Login to your account')}
              </Text>
            </View>

            <View className='bg-[#F0F2F5] dark:bg-[#FFFFFF0D] border border-black/20 dark:border-[#FFFFFF0D] p-6 rounded-3xl mt-6'>
              <Inpute
                title={tx(2, 'Phone')}
                placeholder='+880 123 123 123'
                className='mt-4'
                // @ts-ignore
                value={phoneNumber}
                onChangeText={setPhone}
              />

              <Inpute
                title={tx(3, 'Email')}
                placeholder='example@example.com'
                className='mt-4'
                required={true}
                // @ts-ignore
                value={email}
                onChangeText={setEmail}
                type='email-address'
              />

              <Inpute
                title={tx(4, 'Password')}
                placeholder='********'
                className='mt-4'
                required={true}
                isPassword={true}
                // @ts-ignore
                value={password}
                onChangeText={setPassword}
              />

              <View className='mt-4 flex-row justify-between items-center'>
                <View className='flex-row gap-2 items-center'>
                  <TouchableOpacity
                    onPress={() => setRememberMe(!rememberMe)}
                    className={`h-5 w-5 rounded-md flex-row justify-center items-center ${
                      rememberMe ? 'bg-blue-600' : 'bg-secondary'
                    }`}
                  >
                    {rememberMe && (
                      <Feather name='check' size={16} color='#ffffff' />
                    )}
                  </TouchableOpacity>
                  <Text className='text-secondary dark:text-white/80 text-sm font-roboto-medium mt-1.5'>
                    {tx(5, 'Remember me')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/forget-password')}
                >
                  <Text className='text-[#000000] dark:text-white font-roboto-regular text-sm'>
                    {tx(6, 'Forgot Password?')}
                  </Text>
                </TouchableOpacity>
              </View>

              <ShadowButton
                text={tx(7, 'Login')}
                textColor={isLight ? 'white' : '#2B2B2B'}
                backGroundColor={isLight ? 'black' : '#E8EBEE'}
                onPress={handleLogin}
                className='mt-4'
              />

              <View className='mt-4 flex-row justify-center items-center'>
                <Text className='text-secondary dark:text-white/80 font-roboto-regular text-sm'>
                  {tx(8, "Don't have an account?")}{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                  <Text className='font-roboto-bold text-secondary dark:text-white/80 text-sm'>
                    {' '}
                    {tx(9, 'Register')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className='mt-6'>
              <Text className='text-secondary dark:text-white/80 text-center font-roboto-regular'>
                {tx(10, 'Or continue with')}
              </Text>
              <View className='mt-6 flex-row justify-between items-center gap-4'>
                <TouchableOpacity
                  onPress={() => handleSocialLogin('google')}
                  disabled={!!socialLoading}
                  className='border border-black/20 dark:border-[#FFFFFF0D] rounded-xl flex-1 p-3 bg-transparent items-center'
                >
                  <Image
                    source={require('@/assets/images/google.svg')}
                    contentFit='contain'
                    style={{ height: 24, width: 24 }}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSocialLogin('facebook')}
                  disabled={!!socialLoading}
                  className='border border-black/20 dark:border-[#FFFFFF0D] rounded-xl flex-1 p-3 bg-transparent items-center'
                >
                  <Feather name='facebook' size={24} color={isLight ? '#1877F2' : '#FFFFFF'} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSocialLogin('instagram')}
                  disabled={!!socialLoading}
                  className='border border-black/20 dark:border-[#FFFFFF0D] rounded-xl flex-1 p-3 bg-transparent items-center'
                >
                  <Feather name='instagram' size={24} color={isLight ? '#E1306C' : '#FFFFFF'} />
                </TouchableOpacity>
              </View>
              {socialLoading && (
                <View className='mt-3 flex-row items-center justify-center gap-2'>
                  <ActivityIndicator size='small' color={isLight ? '#000000' : '#ffffff'} />
                  <Text className='text-secondary dark:text-white/80 text-xs'>
                    Opening {socialLoading === 'google' ? 'Google' : socialLoading === 'facebook' ? 'Facebook' : 'Instagram'}...
                  </Text>
                </View>
              )}
            </View>
          </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
};

export default Login;




