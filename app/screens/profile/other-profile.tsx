import ShadowButton from '@/components/button/ShadowButton';
import UserAvatar from '@/components/ui/UserAvatar';
import GradientBackground from '@/components/main/GradientBackground';
import { useUserFollow, useUserUnFollow } from '@/hooks/app/home';
import { useGetOtherProfile } from '@/hooks/app/profile';
import { useTranslateTexts } from '@/hooks/app/translate';
import useAuthStore from '@/store/auth.store';
import useLanguageStore from '@/store/language.store';
import useThemeStore from '@/store/theme.store';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Foundation from '@expo/vector-icons/Foundation';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useMemo, useState } from 'react';
import { toProxyMediaUrl } from '@/lib/mediaProxy';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Share,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const toPlayableVideoUrl = (rawUrl?: string | null) => {
  const url = String(rawUrl || '').trim();
  if (!url) return '';

  if (url.includes('/res.cloudinary.com/') && url.includes('/video/upload/')) {
    if (url.includes('/video/upload/f_mp4,') || url.includes('/video/upload/f_mp4/')) {
      return url;
    }

    return url.replace(
      '/video/upload/',
      '/video/upload/f_mp4,vc_h264,ac_aac,q_auto:good/'
    );
  }

  return url;
};

const getGridMediaUrl = (item: any) =>
  toProxyMediaUrl(String(item?.mediaUrl || item?.url || item?.videoUrl || ''));
const getGridPreviewUrl = (item: any) =>
  toProxyMediaUrl(
    String(item?.mediaPreviewUrl || item?.thumbnailUrl || item?.previewUrl || '')
  );

const getGridItemId = (item: any) =>
  String(item?.postId || item?._id || item?.id || getGridMediaUrl(item));

const VideoGridItem = ({
  uri,
  isActive,
  previewUri,
}: {
  uri: string;
  isActive: boolean;
  previewUri?: string;
}) => {
  const playbackUrl = React.useMemo(() => toPlayableVideoUrl(uri), [uri]);
  const player = useVideoPlayer(playbackUrl, player => {
    player.muted = true;
    player.loop = true;
  });

  React.useEffect(() => {
    if (!playbackUrl) return;
    if (!isActive) {
      player.pause();
      return;
    }
    player.play();
  }, [player, playbackUrl, isActive]);

  if (!isActive) {
    if (previewUri) {
      return (
        <Image
          source={{ uri: previewUri }}
          style={{ width: '100%', height: '100%' }}
          contentFit='cover'
        />
      );
    }
    return (
      <View className='items-center justify-center w-full h-full bg-black/10 dark:bg-white/5'>
        <Feather name='video' size={24} color='white' />
      </View>
    );
  }

  return (
    <VideoView
      style={{ width: '100%', height: '100%' }}
      player={player}
      nativeControls={false}
      contentFit='cover'
      surfaceType='textureView'
    />
  );
};

const getAgeFromDate = (value?: string | Date | null) => {
  if (!value) return null;
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
};

const OtherProfile = () => {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = params?.id;
  const profileId = Array.isArray(rawId) ? rawId[0] : rawId;
  const safeProfileId = String(profileId || '').trim();
  const { user } = useAuthStore();
  const { mode } = useThemeStore();
  const isLight = mode === 'light';
  const iconColor = isLight ? 'black' : 'white';
  const { language } = useLanguageStore();
  const { data, isLoading, refetch, isRefetching } =
    useGetOtherProfile(safeProfileId);
  const { data: t } = useTranslateTexts({
    texts: [
      'Profile',
      'Posts',
      'Followers',
      'Following',
      'Follow',
      'Unfollow',
      'Message',
      'Photo',
      'Video',
      'Music',
      'Loading...',
      'No bio yet',
      'Age',
      'Not set',
      'No photo posts found',
      'No video posts found',
      'No music posts found',
      'Audio File',
    ],
    targetLang: language,
    enabled: !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;

  const { mutate: followUser } = useUserFollow();
  const { mutate: unfollowUser } = useUserUnFollow();

  // @ts-ignore
  const profile = data?.profile;
  // @ts-ignore
  const viewerIsFollowingInitial = data?.viewerIsFollowing || false;
  const bioValue = profile?.bio?.trim();
  const ageFromApi =
    typeof profile?.age === 'number' && Number.isFinite(profile.age)
      ? profile.age
      : null;
  const ageFromDob = getAgeFromDate(profile?.dateOfBirth);
  const ageLabel = ageFromApi ?? ageFromDob ?? tx(13, 'Not set');
  const normalizeLink = (value?: string) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `https://${raw}`;
  };
  const businessLink = normalizeLink(profile?.businessLink);
  const extractHandle = (url: string, marker: string) => {
    const idx = url.indexOf(marker);
    if (idx < 0) return '';
    const tail = url.slice(idx + marker.length);
    const first = tail.split('/')[0]?.split('?')[0]?.split('#')[0] || '';
    return first.replace(/^@/, '').trim();
  };
  const openSocialLink = async (webUrl: string, appUrl?: string) => {
    try {
      if (appUrl) {
        const canOpen = await Linking.canOpenURL(appUrl);
        if (canOpen) {
          await Linking.openURL(appUrl);
          return;
        }
      }
      await Linking.openURL(webUrl);
    } catch (error) {
      console.log('[other-profile] failed to open social link', { webUrl, appUrl, error });
    }
  };
  const instagramUrl = normalizeLink(profile?.instagramUrl);
  const facebookUrl = normalizeLink(profile?.facebookUrl);
  const twitterUrl = normalizeLink(profile?.twitterUrl);
  const tiktokUrl = normalizeLink(profile?.tiktokUrl);
  const snapchatUrl = normalizeLink(profile?.snapchatUrl);
  const instagramHandle = extractHandle(instagramUrl, 'instagram.com/');
  const twitterHandle =
    extractHandle(twitterUrl, 'x.com/') || extractHandle(twitterUrl, 'twitter.com/');
  const tiktokHandle = extractHandle(tiktokUrl, 'tiktok.com/');
  const snapchatHandle = extractHandle(snapchatUrl, 'snapchat.com/add/');
  const socialLinks = [
    {
      key: 'facebook',
      label: 'Facebook',
      url: facebookUrl,
      icon: 'facebook-f' as const,
      appUrl: facebookUrl
        ? `fb://facewebmodal/f?href=${encodeURIComponent(facebookUrl)}`
        : undefined,
    },
    {
      key: 'instagram',
      label: 'Instagram',
      url: instagramUrl,
      icon: 'instagram' as const,
      appUrl: instagramHandle
        ? `instagram://user?username=${encodeURIComponent(instagramHandle)}`
        : undefined,
    },
    {
      key: 'twitter',
      label: 'Twitter/X',
      url: twitterUrl,
      icon: 'twitter' as const,
      appUrl: twitterHandle
        ? `twitter://user?screen_name=${encodeURIComponent(twitterHandle)}`
        : undefined,
    },
    {
      key: 'tiktok',
      label: 'TikTok',
      url: tiktokUrl,
      icon: 'tiktok' as const,
      appUrl: tiktokHandle
        ? `snssdk1233://user/profile/${encodeURIComponent(tiktokHandle)}`
        : undefined,
    },
    {
      key: 'snapchat',
      label: 'Snapchat',
      url: snapchatUrl,
      icon: 'snapchat-ghost' as const,
      appUrl: snapchatHandle
        ? `snapchat://add/${encodeURIComponent(snapchatHandle)}`
        : undefined,
    },
  ].filter(item => !!item.url);
  const { data: translatedBio } = useTranslateTexts({
    texts: [bioValue || ''],
    targetLang: language,
    enabled: !!language && language !== 'EN' && !!bioValue,
  });

  const [isFollowing, setIsFollowing] = useState(viewerIsFollowingInitial);
  const [selectedType, setSelectedType] = useState<
    'photo' | 'video' | 'music'
  >('photo');
  const [activeVideoPostId, setActiveVideoPostId] = useState('');

  useEffect(() => {
    setIsFollowing(viewerIsFollowingInitial);
  }, [viewerIsFollowingInitial]);

  const handleFollowToggle = () => {
    if (!safeProfileId) return;
    if (isFollowing) {
      unfollowUser(safeProfileId);
    } else {
      followUser({ userId: safeProfileId });
    }
    setIsFollowing(!isFollowing);
  };

  const handleShareProfile = async () => {
    try {
      if (!safeProfileId) return;

      const profileDeepLink = Linking.createURL('/screens/profile/other-profile', {
        queryParams: { id: safeProfileId },
      });

      await Share.share({
        message: `Check out this profile on UNAP: ${profileDeepLink}`,
        url: profileDeepLink,
      });
    } catch (error) {
      console.log('[other-profile] share profile failed', error);
    }
  };
  const handleRefresh = async () => {
    if (!safeProfileId) return;
    await refetch();
  };

  const displayPosts = useMemo(() => {
    if (selectedType === 'photo') return profile?.imagePosts || [];
    if (selectedType === 'video') return profile?.videoPosts || [];
    return profile?.audioPosts || [];
  }, [selectedType, profile?.imagePosts, profile?.videoPosts, profile?.audioPosts]);

  useEffect(() => {
    if (selectedType !== 'video' || !Array.isArray(displayPosts) || !displayPosts.length) {
      setActiveVideoPostId('');
      return;
    }

    const hasActive = displayPosts.some(
      (item: any) => getGridItemId(item) === activeVideoPostId
    );
    if (!hasActive) {
      setActiveVideoPostId(getGridItemId(displayPosts[0]));
    }
  }, [selectedType, displayPosts, activeVideoPostId]);


  if (isLoading) {
    return (
      <GradientBackground>
        <SafeAreaView className='flex-1 justify-center items-center'>
          <Text className='text-primary dark:text-white'>
            {tx(10, 'Loading...')}
          </Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (!safeProfileId) {
    return (
      <GradientBackground>
        <SafeAreaView className='flex-1 justify-center items-center px-6'>
          <Text className='text-primary dark:text-white text-center font-roboto-medium text-base'>
            Invalid user profile.
          </Text>
          <TouchableOpacity onPress={() => router.back()} className='mt-4 px-4 py-2 rounded-lg border border-black/20 dark:border-white/20'>
            <Text className='text-primary dark:text-white'>Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView className='flex-1' edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* header */}
          <View className='mt-3 flex-row items-center mx-6'>
            <TouchableOpacity onPress={() => router.back()} className='p-2 -ml-2'>
              <Ionicons name='chevron-back' size={28} color={iconColor} />
            </TouchableOpacity>
            <Text className='font-roboto-bold text-primary dark:text-white text-2xl text-center flex-1'>
              {tx(0, 'Profile')}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <View className='border-b border-black/20 dark:border-[#292929] w-full mt-2'></View>

          <ScrollView
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={handleRefresh}
                tintColor={isLight ? '#000000' : '#FFFFFF'}
              />
            }
          >
            {/* profile picture */}
            <View className='flex-row gap-4 mt-4 items-center mx-6'>
              <View className='mt-2'>
                <UserAvatar
                  uri={profile?.profileImageUrl || null}
                  isLoading={isLoading}
                  size={100}
                />
              </View>
              <View>
                <Text className='text-primary dark:text-white font-roboto-bold text-2xl'>
                  {profile?.displayName || 'User'}
                </Text>
                <Text className='text-primary dark:text-white font-roboto-regular text-lg'>
                  {profile?.role || 'User'}
                </Text>
              </View>
            </View>

            {/* details */}
            <View className='mt-3 mx-6'>
              <Text className='font-roboto-medium text-primary dark:text-white'>
                {bioValue
                  ? translatedBio?.translations?.[0] || bioValue
                  : tx(11, 'No bio yet')}
              </Text>
              <Text className='font-roboto-regular text-primary dark:text-white mt-2'>
                {tx(12, 'Age')}: {ageLabel}
              </Text>
              {businessLink ? (
                <TouchableOpacity
                  className='mt-2'
                  onPress={() => Linking.openURL(businessLink)}
                >
                  <Text className='font-roboto-medium text-blue-600 dark:text-blue-300'>
                    Buseness Link: {businessLink}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {socialLinks.length > 0 ? (
                <View className='mt-3 flex-row flex-wrap gap-2'>
                  {socialLinks.map(item => (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => openSocialLink(item.url, item.appUrl)}
                      className='h-10 w-10 items-center justify-center rounded-full bg-[#F0F2F5] dark:bg-[#FFFFFF0D] border border-black/10 dark:border-[#FFFFFF22]'
                    >
                      <FontAwesome5
                        name={item.icon}
                        size={18}
                        color={isLight ? '#111827' : '#F3F4F6'}
                        brand
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>

            {/* border */}
            <View className='border-b border-black/20 dark:border-[#292929] w-[90%] my-3 mx-6'></View>

            {/* post stats */}
            <View className='flex-row justify-between items-center mt-3 py-3 mx-6'>
              <View>
                <Text className='text-primary dark:text-white text-center font-roboto-semibold text-2xl'>
                  {profile?.postsCount || 0}
                </Text>
                <Text className='text-secondary dark:text-white/80 text-center font-roboto-regular text-lg'>
                  {tx(1, 'Posts')}
                </Text>
              </View>
              <View>
                <Text className='text-primary dark:text-white text-center font-roboto-semibold text-2xl'>
                  {profile?.followersCount || 0}
                </Text>
                <Text className='text-secondary dark:text-white/80 text-center font-roboto-regular text-lg'>
                  {tx(2, 'Followers')}
                </Text>
              </View>
              <View>
                <Text className='text-primary dark:text-white text-center font-roboto-semibold text-2xl'>
                  {profile?.followingCount || 0}
                </Text>
                <Text className='text-secondary dark:text-white/80 text-center font-roboto-regular text-lg'>
                  {tx(3, 'Following')}
                </Text>
              </View>
            </View>

            {/* border */}
            <View className='border-b border-black/20 dark:border-[#292929] w-[90%] my-3 mx-6'></View>

            {/* follow/message buttons */}
            <View className='flex-row justify-center items-center gap-3 mx-6'>
              <ShadowButton
                text={isFollowing ? tx(5, 'Unfollow') : tx(4, 'Follow')}
                textColor={isFollowing ? '#000000' : '#2B2B2B'}
                backGroundColor={isFollowing ? '#000000' : '#E8EBEE'}
                onPress={handleFollowToggle}
                className={`mt-4 ${isFollowing ? 'border border-black/20 dark:border-[#292929]' : ''}`}
              />
              <ShadowButton
                text={tx(6, 'Message')}
                textColor={isLight ? '#000000' : '#E6E6E6'}
                backGroundColor={isLight ? '#F0F2F5' : '#000000'}
                onPress={() => {
                  if (!safeProfileId) return;
                  router.push({
                    pathname: '/screens/chat/chat-screen',
                    params: {
                      userId: safeProfileId,
                      receiverId: safeProfileId,
                      senderId: user?.id || '',
                      conversationId: '',
                      userName: profile?.displayName || 'User',
                      userImage: profile?.profileImageUrl || '',
                    },
                  });
                }}
                className={`mt-4 border ${isLight ? 'border-black/20' : 'border-[#E6E6E6]'}`}
              />
              <TouchableOpacity
                onPress={handleShareProfile}
                className={`mt-4 px-3 py-2 rounded-xl items-center justify-center border ${
                  isLight ? 'bg-[#F0F2F5] border-black/20' : 'bg-[#000000] border-[#E6E6E6]'
                }`}
              >
                <Ionicons
                  name='share-social-outline'
                  size={16}
                  color={isLight ? '#111827' : '#E6E6E6'}
                />
                <Text className='text-[10px] mt-1 text-black dark:text-[#E6E6E6] font-roboto-medium'>
                  Share
                </Text>
              </TouchableOpacity>
            </View>

            {/* border */}
            <View className='border-b border-black/20 dark:border-[#292929] w-[90%] mt-24 mx-6'></View>

            {/* post filter buttons */}
            <View className='flex-row justify-between items-center gap-6 mt-3 mx-6'>
              {['photo', 'video', 'music'].map(type => {
                const Icon = type === 'photo' ? Foundation : Feather;
                const iconName =
                  type === 'photo'
                    ? 'photo'
                    : type === 'video'
                      ? 'video'
                      : 'music';
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() =>
                      setSelectedType(
                        type as 'photo' | 'video' | 'music'
                      )
                    }
                    className={`px-2 py-3 rounded-lg flex-row gap-2 items-center ${
                      selectedType === type
                        ? isLight
                          ? 'bg-[#F0F2F5]'
                          : 'bg-[#444]'
                        : 'bg-transparent'
                    }`}
                  >
                    <Icon name={iconName as any} size={24} color={iconColor} />
                    <Text className='text-primary dark:text-white font-roboto-regular mt-1'>
                      {type === 'photo'
                        ? tx(7, 'Photo')
                        : type === 'video'
                          ? tx(8, 'Video')
                          : tx(9, 'Music')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* post data */}
            <View className='flex-row flex-wrap mt-3 mx-6'>
              {displayPosts.length > 0 ? (
                displayPosts.map((item: any) => (
                  <View
                    key={item._id}
                    className='w-1/3 border border-black/20 dark:border-white'
                  >
                    {selectedType === 'photo' && (
                      <Image
                        source={{ uri: toProxyMediaUrl(item.mediaUrl) }}
                        style={{
                          width: '100%',
                          height: 130,
                          borderWidth: 1,
                          borderColor: isLight
                            ? 'rgba(0,0,0,0.2)'
                            : 'white',
                        }}
                        contentFit='cover'
                      />
                    )}
                    {selectedType === 'video' && (
                          <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() =>
                              setActiveVideoPostId(getGridItemId(item))
                            }
                            style={{ width: '100%', height: 130, padding: 2 }}
                          >
                            <VideoGridItem
                              uri={getGridMediaUrl(item)}
                              previewUri={getGridPreviewUrl(item)}
                              isActive={activeVideoPostId === getGridItemId(item)}
                            />
                            <View
                              pointerEvents='none'
                              className='absolute inset-0 items-center justify-center'
                            >
                              <Feather
                                name='video'
                                size={24}
                                color={iconColor}
                                opacity={0.7}
                              />
                            </View>
                          </TouchableOpacity>
                        )}
                        {selectedType === 'music' && (
                      <View className='p-4 bg-[#F0F2F5] dark:bg-[#FFFFFF0D] items-center justify-center w-full aspect-square'>
                        <Feather name='music' size={40} color='#F54900' />
                        <Text className='text-black dark:text-white mt-2 text-center text-xs'>
                          {item.description || tx(17, 'Audio File')}
                        </Text>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <Text className='text-primary dark:text-white font-roboto-regular mt-1'>
                  {selectedType === 'photo'
                    ? tx(14, 'No photo posts found')
                    : selectedType === 'video'
                      ? tx(15, 'No video posts found')
                      : tx(16, 'No music posts found')}
                </Text>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
};

export default OtherProfile;


