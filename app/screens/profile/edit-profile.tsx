import BackButton from '@/components/button/BackButton';
import ShadowButton from '@/components/button/ShadowButton';
import Input from '@/components/inpute/Inpute';
import GradientBackground from '@/components/main/GradientBackground';
import { useGetMyProfile, useUpdateProfile } from '@/hooks/app/profile';
import {
  useConnectAccount,
  useDisconnectAccount,
  useGetAccounts,
} from '@/hooks/app/accounts';
import { useTranslateTexts } from '@/hooks/app/translate';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const EditProfile = () => {
  const [roleOpen, setRoleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('Singer');

  const roles = ['Singer', 'Dancer', 'Actor', 'Model', 'Photographer'];

  // form state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [spotify, setSpotify] = useState('');

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: profileData } = useGetMyProfile();
  // @ts-ignore
  const profile = profileData?.profile;
  const { mutate: updateProfile, isPending: loading } = useUpdateProfile();
  const { mutateAsync: connectAccount } = useConnectAccount();
  const { mutateAsync: disconnectAccount } = useDisconnectAccount();
  const { data: accountsData, refetch: refetchAccounts } = useGetAccounts();
  const [busyPlatform, setBusyPlatform] = useState<string | null>(null);
  const { data: t } = useTranslateTexts({
    texts: [
      'Edit profile',
      'Upload Photo',
      'Username',
      'Display Name',
      'Date of Birth',
      'Select Your Role',
      'Bio',
      'Instagram',
      'YouTube',
      'Spotify',
      'Save',
      'Tell us about yourself and your music...',
      'Singer',
      'Connected',
      'Not Connected',
      'Social Accounts',
      'Connect',
      'Disconnect',
      'Connecting...',
      'Connected successfully',
      'Disconnected successfully',
      'Select Date of Birth',
      'Done',
    ],
    targetLang: profile?.preferredLanguage,
    enabled: !!profile?.preferredLanguage,
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;

  const connectedPlatforms = new Set(
    (accountsData?.accounts || []).map((acc: any) =>
      String(acc?.platform || '').toLowerCase()
    )
  );
  const isConnected = (platform: string) =>
    connectedPlatforms.has(String(platform).toLowerCase());
  const socialPlatforms = [
    'Instagram',
    'YouTube',
    'TikTok',
    'Facebook',
    'Twitter',
    'Spotify',
  ];

  const toDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDobDate = (value: string) => {
    if (!value) return new Date(2000, 0, 1);
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return new Date(2000, 0, 1);
    return parsed;
  };

  const onDobChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDobPicker(false);
    }
    if (event?.type === 'dismissed') return;
    if (selectedDate) {
      setDateOfBirth(toDateString(selectedDate));
    }
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        refetchAccounts();
      }
    });
    return () => sub.remove();
  }, [refetchAccounts]);

  const handleToggleAccount = async (platform: string) => {
    const key = String(platform).toLowerCase();
    const connected = isConnected(platform);
    setBusyPlatform(key);
    try {
      if (connected) {
        await disconnectAccount(key);
        Toast.show({
          type: 'success',
          text1: platform,
          text2: tx(20, 'Disconnected successfully'),
        });
        await refetchAccounts();
        return;
      }

      const appRedirectUri = Linking.createURL('accounts-callback');
      const response = await connectAccount({
        platform: key,
        appRedirectUri,
      });
      const authUrl = response?.authUrl || response?.url;
      if (!authUrl) {
        throw new Error('Missing authorization url.');
      }

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        appRedirectUri
      );
      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const params = parsed?.queryParams || {};
        const status = Array.isArray(params.status)
          ? params.status[0]
          : params.status;
        const error = Array.isArray(params.error) ? params.error[0] : params.error;
        if (status === 'success') {
          Toast.show({
            type: 'success',
            text1: platform,
            text2: tx(19, 'Connected successfully'),
          });
        } else if (error) {
          Toast.show({
            type: 'error',
            text1: platform,
            text2: String(error),
          });
        }
      }
      await refetchAccounts();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: platform,
        text2: error?.message || 'Connection failed.',
      });
    } finally {
      setBusyPlatform(null);
    }
  };

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setDisplayName(profile.displayName || '');
      setDateOfBirth(
        profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : ''
      );
      setBio(profile.bio || '');
      if (profile.role) {
        const capitalizedRole =
          profile.role.charAt(0).toUpperCase() + profile.role.slice(1);
        if (roles.includes(capitalizedRole)) {
          setSelectedRole(capitalizedRole);
        }
      }
      setInstagram(profile.instagramUrl || '');
      setYoutube(profile.youtubeUrl || '');
      setSpotify(profile.spotifyArtistUrl || '');
      if (profile.profileImageUrl) {
        setProfileImage(profile.profileImageUrl);
      }
    }
  }, [profile]);

  // Helper function to format URLs properly
  const formatUrl = (url: string, platform?: string) => {
    if (!url || url.trim() === '') return '';
    const trimmed = url.trim();

    // If it already starts with http:// or https://, return as is
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    // Handle @ prefix (remove it before adding domain)
    const cleanUrl = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;

    // If it's just a username without domain, add the platform domain
    if (platform === 'instagram' && !cleanUrl.includes('.')) {
      return `https://instagram.com/${cleanUrl}`;
    }
    if (platform === 'youtube' && !cleanUrl.includes('.')) {
      return `https://youtube.com/@${cleanUrl}`;
    }
    if (platform === 'spotify' && !cleanUrl.includes('.')) {
      return `https://open.spotify.com/artist/${cleanUrl}`;
    }

    // Otherwise, add https://
    return `https://${cleanUrl}`;
  };

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.status !== 'granted') {
      setErrorMsg('Permission to access media library is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      setErrorMsg(null);
    }
  };

  const handleUpdateProfile = async () => {
    setErrorMsg(null);

    try {
      const formData = new FormData();

      // profileImage (optional for update)
      // Only append if it's a new image (local URI)
      if (profileImage && !profileImage.startsWith('http')) {
        const filename = profileImage.split('/').pop() || 'profile.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const ext = match?.[1]?.toLowerCase() || 'jpg';
        const mimeType =
          ext === 'png'
            ? 'image/png'
            : ext === 'jpeg' || ext === 'jpg'
              ? 'image/jpeg'
              : 'image/*';

        formData.append('profileImage', {
          uri: profileImage,
          name: filename,
          type: mimeType,
        } as any);
      }

      // other fields
      formData.append('username', username);
      formData.append('role', selectedRole.toLowerCase());
      formData.append('bio', bio);
      formData.append('displayName', displayName);
      formData.append('dateOfBirth', dateOfBirth.trim());

      // Format URLs properly
      formData.append('instagramUrl', formatUrl(instagram, 'instagram'));
      formData.append('youtubeUrl', formatUrl(youtube, 'youtube'));
      formData.append('spotifyArtistUrl', formatUrl(spotify, 'spotify'));

      // optional socials (as per postman image)
      formData.append('tiktokUrl', '');
      formData.append('facebookUrl', '');

      updateProfile(formData, {
        onSuccess: (data: any) => {
          const nextProfile = data?.profile;
          if (nextProfile?.profileImageUrl) {
            setProfileImage(nextProfile.profileImageUrl);
          }
          router.back();
        },
        onError: (error: any) => {
          const errorResponse = error?.response?.data;
          setErrorMsg(
            errorResponse?.error ||
              error?.message ||
              'Something went wrong. Please try again.'
          );
        },
      });
    } catch (error: any) {
      setErrorMsg(error?.message || 'Failed to prepare data');
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView className='flex-1' edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* headers */}
          <View className='mt-3 flex-row items-center mx-6 justify-between'>
            <BackButton />
            <Text className='font-roboto-bold text-primary dark:text-white text-2xl text-center flex-1'>
              {tx(0, 'Edit profile')}
            </Text>
          </View>
          {/* border */}
          <View className='border-b border-black/20 dark:border-[#FFFFFF0D] w-full mt-2'></View>

          {/* photo */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <View className='items-center mt-6'>
              <View className='relative'>
                {/* Profile Image */}
                <TouchableOpacity onPress={pickImage}>
                  <Image
                    source={
                      profileImage
                        ? { uri: profileImage }
                        : {
                            uri: 'data:image/png;base64,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',
                          }
                    }
                    style={{ width: 100, height: 100, borderRadius: 100 }}
                    contentFit='cover'
                  />
                </TouchableOpacity>

                {/* Camera Icon - Center Bottom */}
                {/* <View className="absolute top-9 left-9 bg-white h-10 w-10 rounded-full items-center justify-center">
                  <Feather name="camera" size={22} color="black" />
                  <View className="absolute -right-1 -top-1 bg-white h-4 w-4 rounded-full items-center justify-center">
                    <Feather name="plus" size={10} color="black" />
                  </View>
                </View> */}
              </View>
            </View>
            <Text className='text-primary dark:text-white text-xl font-roboto-semibold text-center mt-3'>
              {tx(1, 'Upload Photo')}
            </Text>

            {/* input fields */}
            <View className='mx-6 mt-6'>
              <Text className='text-primary dark:text-white'>Username</Text>
              <Input
                className='mt-2'
                placeholder='@yourhandle'
                value={username}
                onChangeText={setUsername}
              />

              <Text className='text-primary dark:text-white mt-3'>Display Name</Text>
              <Input
                className='mt-2'
                placeholder='Rokey Mahmud'
                value={displayName}
                onChangeText={setDisplayName}
              />

              <Text className='text-primary dark:text-white mt-3'>
                {tx(4, 'Date of Birth')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDobPicker(true)}
                className='mt-2 bg-[#F0F2F5] dark:bg-[#FFFFFF0D] border border-black/20 dark:border-[#FFFFFF0D] rounded-xl px-4 py-4'
              >
                <Text className='text-primary dark:text-white'>
                  {dateOfBirth
                    ? new Date(`${dateOfBirth}T00:00:00`).toLocaleDateString()
                    : tx(21, 'Select Date of Birth')}
                </Text>
              </TouchableOpacity>
              {showDobPicker && (
                <View className='mt-2'>
                  {Platform.OS === 'ios' && (
                    <View className='flex-row justify-end mb-2'>
                      <TouchableOpacity
                        onPress={() => setShowDobPicker(false)}
                        className='bg-[#F0F2F5] dark:bg-[#FFFFFF0D] px-3 py-1 rounded-md'
                      >
                        <Text className='text-primary dark:text-white font-medium'>
                          {tx(22, 'Done')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <DateTimePicker
                    value={parseDobDate(dateOfBirth)}
                    mode='date'
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDobChange}
                    maximumDate={new Date()}
                  />
                </View>
              )}

              {/* Select Your Role */}
              <Text className='text-primary dark:text-white mb-2 mt-3 text-base'>
                {tx(5, 'Select Your Role')}
              </Text>

              {/* <View className='w-full'>
                <TouchableOpacity
                  onPress={() => setRoleOpen(!roleOpen)}
                  className='w-full bg-[#F0F2F5] dark:bg-[#FFFFFF0D] border border-black/20 dark:border-[#FFFFFF0D] dark:border-[#FFFFFF0D] rounded-xl p-4 flex-row justify-between items-center'
                >
                  <Text className='text-gray-200 text-base'>
                    {selectedRole}
                  </Text>
                  <Feather
                    name={roleOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color='#fff'
                  />
                </TouchableOpacity>

                {roleOpen && (
                  <View className='mt-1 bg-[#121212] rounded-xl border border-gray-700'>
                    {roles.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          setSelectedRole(item);
                          setRoleOpen(false);
                        }}
                        className='p-4 border-b border-gray-800'
                      >
                        <Text className='text-gray-200'>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View> */}
              <Input
                className='mt-2'
                placeholder={tx(12, 'Singer')}
                value={selectedRole}
                onChangeText={setSelectedRole}
              />

              {/* Bio */}
              <Text className='text-primary dark:text-white mt-3 mb-2 text-base'>
                {tx(6, 'Bio')}
              </Text>
              <TextInput
                placeholder={tx(11, 'Tell us about yourself and your music...')}
                placeholderTextColor='rgba(0,0,0,0.5)'
                multiline
                numberOfLines={4}
                className='bg-[#F0F2F5] dark:bg-[#FFFFFF0D] border border-black/20 dark:border-[#FFFFFF0D] rounded-xl p-4 text-primary dark:text-white'
                style={{ textAlignVertical: 'top' }}
                value={bio}
                onChangeText={setBio}
              />

              {/* Social Accounts Status */}
              <View className='mt-6 rounded-2xl bg-[#F0F2F5] dark:bg-[#FFFFFF0D] p-4 border border-black/10 dark:border-[#FFFFFF0D]'>
                <Text className='text-primary dark:text-white font-roboto-semibold text-base mb-3'>
                  {tx(15, 'Social Accounts')}
                </Text>
                {socialPlatforms.map(platform => {
                  const connected = isConnected(platform);
                  const key = String(platform).toLowerCase();
                  const isBusy = busyPlatform === key;
                  return (
                    <View
                      key={platform}
                      className='flex-row items-center justify-between py-2 border-b border-black/10 dark:border-[#FFFFFF0D]'
                    >
                      <Text className='text-primary dark:text-white'>
                        {platform}
                      </Text>
                      <View className='flex-row items-center gap-2'>
                        <TouchableOpacity
                          disabled={isBusy}
                          onPress={() => handleToggleAccount(platform)}
                          className={`px-3 py-1 rounded-full ${
                            connected
                              ? 'bg-red-500/10 border border-red-500/40'
                              : 'bg-blue-500/10 border border-blue-500/40'
                          }`}
                        >
                          <Text
                            className={`text-xs ${
                              connected ? 'text-red-500' : 'text-blue-500'
                            }`}
                          >
                            {isBusy
                              ? tx(18, 'Connecting...')
                              : connected
                                ? tx(17, 'Disconnect')
                                : tx(16, 'Connect')}
                          </Text>
                        </TouchableOpacity>
                        <View
                          className={`px-3 py-1 rounded-full ${
                            connected
                              ? 'bg-green-500/10 border border-green-500/40'
                              : 'bg-gray-500/10 border border-gray-500/40'
                          }`}
                        >
                          <Text
                            className={`text-xs ${
                              connected ? 'text-green-600' : 'text-gray-500'
                            }`}
                          >
                            {connected ? tx(13, 'Connected') : tx(14, 'Not Connected')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <View className='pb-5'>
              {errorMsg ? (
                <Text className='text-red-400 text-center mt-4 mx-6'>
                  {errorMsg}
                </Text>
              ) : null}

              <ShadowButton
                text={loading ? 'Saving...' : tx(10, 'Save')}
                textColor='#2B2B2B'
                backGroundColor='#E8EBEE'
                onPress={handleUpdateProfile}
                className='mt-8 mx-6'
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
};

export default EditProfile;

