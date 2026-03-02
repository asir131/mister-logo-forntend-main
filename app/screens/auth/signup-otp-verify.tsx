import BackButton from '@/components/button/BackButton';
import ShadowButton from '@/components/button/ShadowButton';
import GradientBackground from '@/components/main/GradientBackground';
import { useUserRegisterOtp } from '@/hooks/app/auth';
import { useTranslateTexts } from '@/hooks/app/translate';
import useAuthStore from '@/store/auth.store';
import useLanguageStore from '@/store/language.store';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const OTPVerification = () => {
  const [otp, setOtp] = useState(['', '', '', '', '']);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const { email, setUser, user } = useAuthStore();
  const { language } = useLanguageStore();
  const { data: t } = useTranslateTexts({
    texts: [
      'OTP Verification',
      'Enter the otp sent to your email address',
      'Verify OTP',
      'Resend OTP',
      'Back to Login',
    ],
    targetLang: language,
    enabled: !!user?.token && !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;
  const { mutate } = useUserRegisterOtp();

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    // Handle backspace
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  const hendleVerifyOTP = () => {
    const otpString = otp.join('');

    mutate(
      { email, otp: Number(otpString) },
      {
        onSuccess: data => {
          const user = {
            //@ts-ignore
            refreshToken: data?.refreshToken,
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
          setUser(user);

          router.push('/screens/profile/complete-profile');
        },
      }
    );
  };

  return (
    <GradientBackground>
      <SafeAreaView
        className='flex-1 mx-6 mt-2.5'
        edges={['top', 'bottom', 'left', 'right']}
      >
        {/* back button */}
        <BackButton />

        {/* welcome text */}
        <View>
          <Text className='text-[#000000] dark:text-white text-2xl font-roboto-semibold mt-6 text-center'>
            {tx(0, 'OTP Verification')}
          </Text>
          <Text className='font-roboto-medium text-secondary dark:text-white/80 text-sm text-center mt-1.5 '>
            {tx(1, 'Enter the otp sent to your email address')}
          </Text>
        </View>

        {/* emain input */}
        <View className=' p-6 bg-[#F0F2F5] dark:bg-[#FFFFFF0D] rounded-3xl mt-6'>
          <View className='flex-row justify-between px-2'>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                //@ts-ignore
                ref={ref => (inputRefs.current[index] = ref)}
                className={`w-10 h-10 border rounded-[10px] text-sm pb-2 ${
                  digit
                    ? 'border-gray-300 bg-white'
                    : 'border-black/20 dark:border-[#FFFFFF0D] bg-white'
                }`}
                style={{ textAlign: 'center' }}
                value={digit}
                onChangeText={value => handleOtpChange(value, index)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(nativeEvent.key, index)
                }
                keyboardType='numeric'
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Back to Login button */}
          <ShadowButton
            text={tx(2, 'Verify OTP')}
            textColor='#2B2B2B'
            backGroundColor='#E8EBEE'
            onPress={hendleVerifyOTP}
            className='mt-4'
          />

          <TouchableOpacity onPress={() => {}}>
            <Text className='text-center text-primary dark:text-white font-roboto-regular text-sm mt-4'>
              {tx(3, 'Resend OTP')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text className='text-center text-primary dark:text-white font-roboto-regular text-sm mt-4'>
              {tx(4, 'Back to Login')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
};

export default OTPVerification;
