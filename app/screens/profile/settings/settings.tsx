import BackButton from '@/components/button/BackButton';
import { ToggleButton } from '@/components/button/ToggleButton';
import GradientBackground from '@/components/main/GradientBackground';
import useThemeStore from '@/store/theme.store';
import { useUpdateProfileLanguage } from '@/hooks/app/profile';
import { useDeleteMyAccount } from '@/hooks/app/auth';
import { signOutCurrentUser } from '@/services/socialAuth';
import { logout } from '@/services/authSession';
import useLanguageStore from '@/store/language.store';
import { useTranslateTexts } from '@/hooks/app/translate';
import Entypo from '@expo/vector-icons/Entypo';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function normalizeLanguage(input: any) {
  if (!input) return null;
  const raw = String(input).replace('_', '-').toUpperCase();
  if (raw.startsWith('EN-')) {
    if (raw === 'EN-US' || raw === 'EN-GB') return raw;
    return 'EN';
  }
  if (raw.startsWith('PT-')) {
    if (raw === 'PT-BR') return 'PT-BR';
    return 'PT-PT';
  }
  const base = raw.split('-')[0];
  return base;
}

const Settings = () => {
  const { mode, setMode } = useThemeStore();
  const isLight = mode === 'light';
  const iconColor = isLight ? 'black' : 'white';
  const isDarkMode = useMemo(() => mode === 'dark', [mode]);
  const { mutateAsync: updateLanguage, isPending: isUpdatingLanguage } =
    useUpdateProfileLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const { language, setLanguage } = useLanguageStore();
  const { data: t } = useTranslateTexts({
    texts: [
      'Setting',
      'Account Information',
      'Edit Profile',
      'Complete Profile',
      'Policy Center',
      'Privacy Policy',
      'Terms & Condition',
      'Faq',
      'Settings',
      'Notification',
      'Language',
      'Dark Mode',
      'Light Mode',
      'Log Out',
      'Delete Account',
      'Options',
      'Help & Support',
    ],
    targetLang: language,
    enabled: !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;
  const langOptions = useMemo(
    () => [
      { code: 'AR', name: 'Arabic' },
      { code: 'BG', name: 'Bulgarian' },
      { code: 'CS', name: 'Czech' },
      { code: 'DA', name: 'Danish' },
      { code: 'DE', name: 'German' },
      { code: 'EL', name: 'Greek' },
      { code: 'EN', name: 'English' },
      { code: 'EN-GB', name: 'English (UK)' },
      { code: 'EN-US', name: 'English (US)' },
      { code: 'ES', name: 'Spanish' },
      { code: 'ET', name: 'Estonian' },
      { code: 'FI', name: 'Finnish' },
      { code: 'FR', name: 'French' },
      { code: 'HU', name: 'Hungarian' },
      { code: 'ID', name: 'Indonesian' },
      { code: 'IT', name: 'Italian' },
      { code: 'JA', name: 'Japanese' },
      { code: 'KO', name: 'Korean' },
      { code: 'LT', name: 'Lithuanian' },
      { code: 'LV', name: 'Latvian' },
      { code: 'NB', name: 'Norwegian Bokmal' },
      { code: 'NL', name: 'Dutch' },
      { code: 'PL', name: 'Polish' },
      { code: 'PT', name: 'Portuguese' },
      { code: 'PT-BR', name: 'Portuguese (BR)' },
      { code: 'PT-PT', name: 'Portuguese (PT)' },
      { code: 'RO', name: 'Romanian' },
      { code: 'RU', name: 'Russian' },
      { code: 'SK', name: 'Slovak' },
      { code: 'SL', name: 'Slovenian' },
      { code: 'SV', name: 'Swedish' },
      { code: 'TR', name: 'Turkish' },
      { code: 'UK', name: 'Ukrainian' },
      { code: 'ZH', name: 'Chinese' },
    ],
    []
  );
  const displayLang = useMemo(() => {
    const normalized = normalizeLanguage(language) || 'EN';
    const match =
      langOptions.find(opt => opt.code === normalized) ||
      langOptions.find(opt => opt.code === language);
    return match?.name || normalized;
  }, [language, langOptions]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { mutateAsync: deleteMyAccount, isPending: isDeletingAccount } =
    useDeleteMyAccount();

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteMyAccount();
      try {
        await signOutCurrentUser();
      } catch (error) {
        console.log('Sign out warning:', error);
      }
      await logout();
      closeDeleteModal();
      router.replace('/(auth)/login');
    } catch {
      // Toast is already handled in hook; prevent unhandled promise error in UI
    }
  };

  const hendleLogout = async () => {
    try {
      await signOutCurrentUser();
    } catch (error) {
      console.log('Sign out warning:', error);
    } finally {
      await logout();
      router.replace('/(auth)/login');
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView className='flex-1 mt-2.5' edges={['top', 'left', 'right']}>
        <View className='flex-row mt-4 mx-6'>
          <BackButton />
          <Text className='text-primary dark:text-white font-roboto-bold text-2xl text-center flex-1'>
            {tx(0, 'Setting')}
          </Text>
        </View>
        <View className='border-b border-black/20 dark:border-[#FFFFFF0D] w-full mt-2'></View>
        <ScrollView className='mx-6 pt-10' showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:120}}>
          {/* account info */}
          <View className='bg-[#F0F2F5] dark:bg-[#FFFFFF0D] p-3 rounded-xl'>
            <Text className='mx-3 mt-3 text-primary dark:text-white font-roboto-semibold text-xl'>
              {tx(1, 'Account Information')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/screens/profile/edit-profile')}
              className='flex-row justify-between items-center mt-6'
            >
              <View className='flex-row gap-2'>
                <Image
                  source={require('@/assets/images/edit-user.svg')}
                  contentFit='contain'
                  style={{
                    height: 24,
                    width: 24,
                    marginTop: 10,
                    tintColor: iconColor,
                  }}
                />
                <Text className='mx-3 mt-3 text-primary dark:text-white font-roboto-regular text-lg'>
                  {tx(2, 'Edit Profile')}
                </Text>
              </View>
              <Entypo
                name='chevron-small-right'
                className='mt-3.5'
                size={26}
                color={iconColor}
              />
            </TouchableOpacity>

            {/* Complete Profile */}
            {/* <TouchableOpacity
              onPress={() => router.push('/screens/profile/complete-profile')}
              className='flex-row justify-between items-center mt-6'
            >
              <View className='flex-row gap-2'>
                <Ionicons
                  name='person-add-outline'
                  size={24}
                  className='mt-3'
                  color={iconColor}
                />
                <Text className='mx-3 mt-3 text-primary dark:text-white font-roboto-regular text-lg'>
                  {tx(3, 'Complete Profile')}
                </Text>
              </View>
              <Entypo
                name='chevron-small-right'
                className='mt-3.5'
                size={26}
                color={iconColor}
              />
            </TouchableOpacity> */}
          </View>

          {/* Policy Center */}
          <View className='bg-[#F0F2F5] dark:bg-[#FFFFFF0D] p-3 rounded-xl mt-4'>
            <Text className='mx-3 mt-3 text-primary dark:text-white font-roboto-semibold text-xl'>
              {tx(4, 'Policy Center')}
            </Text>

            {/* Privacy Policy */}
            <TouchableOpacity
              onPress={() =>
                router.push('/screens/profile/settings/privacy-policy')
              }
              className='flex-row justify-between items-center mt-6'
            >
              <View className='flex-row gap-2'>
                <Ionicons
                  name='shield-checkmark-outline'
                  size={24}
                  className='mt-3'
                  color={iconColor}
                />
                <Text className='mx-3 mt-3 text-primary dark:text-white font-roboto-regular text-lg'>
                  {tx(5, 'Privacy Policy')}
                </Text>
              </View>
              <Entypo
                name='chevron-small-right'
                className='mt-3.5'
                size={26}
                color={iconColor}
              />
            </TouchableOpacity>

            {/* Terms & Condition */}
            <TouchableOpacity
              onPress={() =>
                router.push('/screens/profile/settings/terms-condition')
              }
              className='flex-row justify-between items-center mt-4'
            >
              <View className='flex-row gap-2'>
                <Image
                  source={require('@/assets/images/term.svg')}
                  contentFit='contain'
                  style={{
                    height: 24,
                    width: 24,
                    marginTop: 8,
                    tintColor: iconColor,
                  }}
                />
                <Text className='mx-3 mt-3 text-primary dark:text-white font-roboto-regular text-lg'>
                  {tx(6, 'Terms & Condition')}
                </Text>
              </View>
              <Entypo
                name='chevron-small-right'
                className='mt-3.5'
                size={26}
                color={iconColor}
              />
            </TouchableOpacity>

            {/* Faq */}
            <TouchableOpacity
              onPress={() => router.push('/screens/profile/settings/faq')}
              className='flex-row justify-between items-center mt-4'
            >
              <View className='flex-row gap-2'>
                <Feather
                  name='help-circle'
                  size={24}
                  color={iconColor}
                  className='mt-3'
                />
                <Text className='mx-3 mt-3 text-primary dark:text-white font-roboto-regular text-lg'>
                  {tx(7, 'Faq')}
                </Text>
              </View>
              <Entypo
                name='chevron-small-right'
                className='mt-3.5'
                size={26}
                color={iconColor}
              />
            </TouchableOpacity>

            {/* Help & Support */}
            <TouchableOpacity
              onPress={() => router.push('/screens/profile/settings/help-support')}
              className='flex-row justify-between items-center mt-4'
            >
              <View className='flex-row gap-2'>
                <Feather
                  name='life-buoy'
                  size={24}
                  color={iconColor}
                  className='mt-3'
                />
                <Text className='mx-3 mt-3 text-primary dark:text-white font-roboto-regular text-lg'>
                  {tx(16, 'Help & Support')}
                </Text>
              </View>
              <Entypo
                name='chevron-small-right'
                className='mt-3.5'
                size={26}
                color={iconColor}
              />
            </TouchableOpacity>
          </View>
          {/* Settings */}
          <View className='bg-[#F0F2F5] dark:bg-[#FFFFFF0D] p-3 rounded-xl mt-4'>
            <Text className='mx-3 mt-3 text-primary dark:text-white font-roboto-semibold text-xl'>
              {tx(8, 'Settings')}
            </Text>

            {/* Notification */}
            <TouchableOpacity
              onPress={() =>
                router.push('/screens/profile/settings/notification-settings')
              }
              className='flex-row justify-between items-center mt-6'
            >
              <View className='flex-row gap-2'>
                <Ionicons
                  name='notifications-outline'
                  size={24}
                  className='mt-3'
                  color={iconColor}
                />
                <Text className='mx-3 mt-3 text-primary dark:text-white font-roboto-regular text-lg'>
                  {tx(9, 'Notification')}
                </Text>
              </View>
              <Entypo
                name='chevron-small-right'
                className='mt-3.5'
                size={26}
                color={iconColor}
              />
            </TouchableOpacity>

            {/* Language */}
            <TouchableOpacity
              onPress={() => setLangOpen(prev => !prev)}
              className='flex-row justify-between items-center mt-4'
            >
              <View className='flex-row gap-2'>
                <Ionicons
                  name='language-outline'
                  size={24}
                  className='mt-3'
                  color={iconColor}
                />
                <Text className='mx-3 mt-3 text-primary dark:text-white font-roboto-regular text-lg'>
                  {tx(10, 'Language')}
                </Text>
              </View>
              <View className='flex-row items-center gap-2'>
                <Text className='text-primary dark:text-white mt-3'>
                  {isUpdatingLanguage ? 'Updating...' : displayLang}
                </Text>
                <Entypo
                  name={langOpen ? 'chevron-small-down' : 'chevron-small-right'}
                  className='mt-3.5'
                  size={26}
                  color={iconColor}
                />
              </View>
            </TouchableOpacity>

            {langOpen && (
              <View className='mt-3 mx-3 bg-white/80 dark:bg-[#0B0F15] rounded-xl border border-black/20 dark:border-[#FFFFFF0D] overflow-hidden'>
                {langOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.code}
                    onPress={async () => {
                      setLanguage(opt.code);
                      setLangOpen(false);
                      try {
                        await updateLanguage({
                          preferredLanguage: opt.code,
                          autoTranslateEnabled: true,
                        });
                      } catch {
                        // keep local preference even if API fails
                      }
                    }}
                    className='px-4 py-3 border-b border-black/10 dark:border-[#FFFFFF0D]'
                  >
                    <Text className='text-primary dark:text-white'>
                      {opt.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Dark/Light Mode */}
            <View className='flex-row justify-between items-center mt-4'>
              <View className='flex-row gap-2'>
                <Ionicons
                  name={isDarkMode ? 'moon-outline' : 'sunny-outline'}
                  size={24}
                  className='mt-3'
                  color={iconColor}
                />
                <Text className='mx-3 mt-3 text-primary dark:text-white font-roboto-regular text-lg'>
                  {isDarkMode ? tx(11, 'Dark Mode') : tx(12, 'Light Mode')}
                </Text>
              </View>
              <ToggleButton
                isOn={isDarkMode}
                setIsOn={(value: boolean) => setMode(value ? 'dark' : 'light')}
              />
            </View>

            {/* Log Out */}
            <TouchableOpacity
              onPress={hendleLogout}
              className='flex-row justify-between items-center mt-4'
            >
              <View className='flex-row gap-2'>
                <Image
                  source={require('@/assets/images/logout.svg')}
                  contentFit='contain'
                  style={{
                    height: 24,
                    width: 24,
                    marginTop: 8,
                    tintColor: iconColor,
                  }}
                />
                <Text className='mx-3 mt-3 text-primary dark:text-white font-roboto-regular text-lg'>
                  {tx(13, 'Log Out')}
                </Text>
              </View>
              <Entypo
                name='chevron-small-right'
                className='mt-3.5'
                size={26}
                color={iconColor}
              />
            </TouchableOpacity>
            {/* Delete Account */}
            <TouchableOpacity
              onPress={() => setShowDeleteModal(true)}
              className='flex-row justify-between items-center mt-4'>
              <View className='flex-row gap-2'>
                <Ionicons
                  name='trash-outline'
                  size={24}
                  color='red'
                  className='mt-3'
                />
                <Text className='mx-3 mt-3 text-[#FF0000] font-roboto-regular text-lg'>
                  {tx(14, 'Delete Account')}
                </Text>
              </View>
              <Entypo
                name='chevron-small-right'
                className='mt-3.5'
                size={26}
                color={iconColor}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal
          visible={showDeleteModal}
          transparent
          animationType='fade'
          onRequestClose={closeDeleteModal}
        >
          <View className='flex-1 bg-black/60 justify-center px-6'>
            <View className='bg-white dark:bg-[#0B0F15] rounded-2xl p-5 border border-black/10 dark:border-[#FFFFFF1A]'>
              <Text className='text-lg font-roboto-semibold text-black dark:text-white'>
                Delete Account Confirmation
              </Text>
              <Text className='text-sm mt-2 text-gray-600 dark:text-gray-300'>
                This action is permanent. If you tap Delete, your account will be removed.
              </Text>



              <View className='flex-row mt-5 gap-3'>
                <TouchableOpacity
                  onPress={closeDeleteModal}
                  className='flex-1 py-3 rounded-xl items-center bg-[#F0F2F5] dark:bg-[#FFFFFF0D]'
                >
                  <Text className='text-black dark:text-white font-roboto-medium'>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  className={`flex-1 py-3 rounded-xl items-center ${isDeletingAccount ? 'bg-red-300' : 'bg-red-600'}`}
                >
                  {isDeletingAccount ? (
                    <ActivityIndicator color='#fff' />
                  ) : (
                    <Text className='text-white font-roboto-medium'>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
};

export default Settings;










