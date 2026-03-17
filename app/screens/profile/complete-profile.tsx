import ShadowButton from '@/components/button/ShadowButton';
import Input from '@/components/inpute/Inpute';
import GradientBackground from '@/components/main/GradientBackground';
import {
  useConnectAccount,
  useDisconnectAccount,
  useGetAccounts,
} from '@/hooks/app/accounts';
import { useCompleteProfile, useGetMyProfile } from '@/hooks/app/profile';
import { useTranslateTexts } from '@/hooks/app/translate';
import { toProxyMediaUrl } from '@/lib/mediaProxy';
import Feather from '@expo/vector-icons/Feather';
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

const CompleteProfile = () => {
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
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [snapchat, setSnapchat] = useState('');
  const [youtube, setYoutube] = useState('');
  const [spotify, setSpotify] = useState('');
  const [businessLink, setBusinessLink] = useState('');

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: profileData } = useGetMyProfile();
  // @ts-ignore
  const profile = profileData?.profile;
  const { mutate: completeProfile, isPending: loading } = useCompleteProfile();
  const { mutateAsync: connectAccount } = useConnectAccount();
  const { mutateAsync: disconnectAccount } = useDisconnectAccount();
  const { data: accountsData, refetch: refetchAccounts } = useGetAccounts();
  const [busyPlatform, setBusyPlatform] = useState<string | null>(null);
  const { data: t } = useTranslateTexts({
    texts: [
      'Complete Your Profile',
      'Let other artists know more about you',
      'Upload Photo',
      'Username',
      'Display Name',
      'Date of Birth',
      'Select Your Role',
      'Bio',
      'Connect Instagram',
      'Connect YouTube',
      'Connect TikTok',
      'Connect Facebook',
      'Connect Twitter',
      'Connect Spotify',
      'Complete Setup',
      'Write something...',
      'Tell us about yourself and your music...',
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
          text2: tx(24, 'Disconnected successfully'),
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
            text2: tx(23, 'Connected successfully'),
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
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        refetchAccounts();
      }
    });
    return () => sub.remove();
  }, [refetchAccounts]);

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
      setFacebook(profile.facebookUrl || '');
      setTwitter(profile.twitterUrl || '');
      setTiktok(profile.tiktokUrl || '');
      setSnapchat(profile.snapchatUrl || '');
      setYoutube(profile.youtubeUrl || '');
      setSpotify(profile.spotifyArtistUrl || '');
      setBusinessLink(profile.businessLink || '');
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
    if (platform === 'facebook' && !cleanUrl.includes('.')) {
      return `https://facebook.com/${cleanUrl}`;
    }
    if (platform === 'twitter' && !cleanUrl.includes('.')) {
      return `https://x.com/${cleanUrl}`;
    }
    if (platform === 'tiktok' && !cleanUrl.includes('.')) {
      return `https://tiktok.com/@${cleanUrl}`;
    }
    if (platform === 'snapchat' && !cleanUrl.includes('.')) {
      return `https://snapchat.com/add/${cleanUrl}`;
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

  const handleCompleteProfile = async () => {
    if (!profileImage) {
      setErrorMsg('Profile image is required.');
      return;
    }

    setErrorMsg(null);

    try {
      const formData = new FormData();

      // profileImage (required)
      // If it's a new local image
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
      formData.append('facebookUrl', formatUrl(facebook, 'facebook'));
      formData.append('twitterUrl', formatUrl(twitter, 'twitter'));
      formData.append('tiktokUrl', formatUrl(tiktok, 'tiktok'));
      formData.append('snapchatUrl', formatUrl(snapchat, 'snapchat'));
      formData.append('youtubeUrl', formatUrl(youtube, 'youtube'));
      formData.append('spotifyArtistUrl', formatUrl(spotify, 'spotify'));
      formData.append('businessLink', formatUrl(businessLink));

      completeProfile(formData, {
        onSuccess: () => {
          router.push('/(tabs)/profile');
        },
        onError: (error: any) => {
          const errorResponse = error?.response?.data;
          if (errorResponse?.error === 'Profile already completed.') {
            router.push('/(tabs)/profile');
            return;
          }
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* headers */}
            <View className='mx-6 mt-10'>
              <Text className='font-roboto-bold text-primary dark:text-white text-2xl text-center flex-1'>
                {tx(0, 'Complete Your Profile')}
              </Text>
              <Text className='font-roboto-regular text-secondary dark:text-white/80 text-center flex-1'>
                {tx(1, 'Let other artists know more about you')}
              </Text>
            </View>

            {/* profile image */}
            <View className='items-center mt-6'>
              <View className='relative'>
                <TouchableOpacity onPress={pickImage}>
                  {profileImage ? (
                    <Image
                      source={{ uri: toProxyMediaUrl(profileImage) }}
                      style={{ width: 100, height: 100, borderRadius: 100 }}
                      contentFit='cover'
                    />
                  ) : (
                    <View
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 100,
                        backgroundColor: '#F0F2F5',
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(0,0,0,0.2)',
                      }}
                    >
                      <Feather name='camera' size={30} color='rgba(0,0,0,0.5)' />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <Text className='text-primary dark:text-white text-xl font-roboto-semibold text-center mt-3'>
              {tx(2, 'Upload Photo')}
            </Text>

            {/* input fields */}
            <View className='mx-6 mt-6'>
              {/* Username */}
              <Text className='text-primary dark:text-white'>Username</Text>
              <Input
                className='mt-2'
                placeholder='@yourhandle'
                value={username}
                onChangeText={setUsername}
              />

              {/* Display Name */}
              <Text className='text-primary dark:text-white mt-3'>Display Name</Text>
              <Input
                className='mt-2'
                placeholder='Rokey Mahmud'
                value={displayName}
                onChangeText={setDisplayName}
              />

              <Text className='text-primary dark:text-white mt-3'>
                {tx(5, 'Date of Birth')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDobPicker(true)}
                className='mt-2 bg-[#F0F2F5] dark:bg-[#FFFFFF0D] border border-black/20 dark:border-[#FFFFFF0D] rounded-xl px-4 py-4'
              >
                <Text className='text-primary dark:text-white'>
                  {dateOfBirth
                    ? new Date(`${dateOfBirth}T00:00:00`).toLocaleDateString()
                    : tx(25, 'Select Date of Birth')}
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
                          {tx(26, 'Done')}
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
                {tx(6, 'Select Your Role')}
              </Text>
              <Input
                className='mt-2'
                placeholder='Rokey Mahmud'
                value={selectedRole}
                onChangeText={setSelectedRole}
              />
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

              {/* Bio */}
              <Text className='text-primary dark:text-white mt-3 mb-2 text-base'>Bio</Text>
              <TextInput
                placeholder={tx(16, 'Tell us about yourself and your music...')}
                placeholderTextColor='rgba(0,0,0,0.5)'
                multiline
                numberOfLines={4}
                className='bg-[#F0F2F5] dark:bg-[#FFFFFF0D] border border-black/20 dark:border-[#FFFFFF0D] rounded-xl p-4 text-primary dark:text-white'
                style={{ textAlignVertical: 'top' }}
                value={bio}
                onChangeText={setBio}
              />

              <Text className='text-primary dark:text-white mt-3'>Buseness Link</Text>
              <Input
                className='mt-2'
                placeholder='https://yourwebsite.com'
                value={businessLink}
                onChangeText={setBusinessLink}
                type='url'
              />

              <Text className='text-primary dark:text-white mt-3'>Instagram Link</Text>
              <Input
                className='mt-2'
                placeholder='https://instagram.com/username'
                value={instagram}
                onChangeText={setInstagram}
                type='url'
              />

              <Text className='text-primary dark:text-white mt-3'>Facebook Link</Text>
              <Input
                className='mt-2'
                placeholder='https://facebook.com/username'
                value={facebook}
                onChangeText={setFacebook}
                type='url'
              />

              <Text className='text-primary dark:text-white mt-3'>Twitter/X Link</Text>
              <Input
                className='mt-2'
                placeholder='https://x.com/username'
                value={twitter}
                onChangeText={setTwitter}
                type='url'
              />

              <Text className='text-primary dark:text-white mt-3'>TikTok Link</Text>
              <Input
                className='mt-2'
                placeholder='https://tiktok.com/@username'
                value={tiktok}
                onChangeText={setTiktok}
                type='url'
              />

              <Text className='text-primary dark:text-white mt-3'>Snapchat Link</Text>
              <Input
                className='mt-2'
                placeholder='https://snapchat.com/add/username'
                value={snapchat}
                onChangeText={setSnapchat}
                type='url'
              />

              {/* Social Accounts Status */}
              {/* <View className='mt-8 rounded-2xl bg-[#F0F2F5] dark:bg-[#FFFFFF0D] p-4 border border-black/10 dark:border-[#FFFFFF0D]'>
                <Text className='text-primary dark:text-white font-roboto-semibold text-base mb-3'>
                  {tx(19, 'Social Accounts')}
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

                      <View className='flex-row items-center gap-2'
                      >
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
                              ? tx(22, 'Connecting...')
                              : connected
                                ? tx(21, 'Disconnect')
                                : tx(20, 'Connect')}
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
                            {connected ? tx(17, 'Connected') : tx(18, 'Not Connected')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View> */}
            </View>

            <View className='pb-8'>
              {errorMsg ? (
                <Text className='text-red-400 text-center mt-4 mx-6'>
                  {errorMsg}
                </Text>
              ) : null}

              <ShadowButton
                text={loading ? 'Saving...' : tx(14, 'Complete Setup')}
                textColor='#2B2B2B'
                backGroundColor='#E8EBEE'
                onPress={handleCompleteProfile}
                className='mt-8 mx-6'
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
};

export default CompleteProfile;
