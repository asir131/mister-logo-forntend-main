import ShadowButton from '@/components/button/ShadowButton';
import PostCard from '@/components/card/PostCard';
import UserAvatar from '@/components/ui/UserAvatar';
import GradientBackground from '@/components/main/GradientBackground';
import { useGetMyPostsInfinite } from '@/hooks/app/post';
import { useGetMyProfile } from '@/hooks/app/profile';
import { useTranslateTexts } from '@/hooks/app/translate';
import useAuthStore from '@/store/auth.store';
import useLanguageStore from '@/store/language.store';
import useThemeStore from '@/store/theme.store';
import Feather from '@expo/vector-icons/Feather';
import Foundation from '@expo/vector-icons/Foundation';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  RefreshControl,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const VideoGridItem = ({ uri }: { uri: string }) => {
  const player = useVideoPlayer(uri, player => {
    player.muted = true;
    player.loop = true;
  });

  return (
    <VideoView
      style={{ width: '100%', height: '100%' }}
      player={player}
      nativeControls={false}
      contentFit='cover'
    />
  );
};

const Profiles = () => {
  const { user } = useAuthStore();
  const { mode } = useThemeStore();
  const isLight = mode === 'light';
  const iconColor = isLight ? 'black' : 'white';
  const { language } = useLanguageStore();
  const { data: t } = useTranslateTexts({
    texts: [
      'Profile',
      'Posts',
      'Followers',
      'Following',
      'Edit Profile',
      'Saved Posts',
      'Options',
      'Scheduled Posts',
      'Share Profile',
      'Cancel',
      'All Posts',
      'Photo',
      'Video',
      'Music',
      'No posts found',
      'No photo posts found',
      'No video posts found',
      'No music posts found',
      'Audio File',
      'No bio yet',
    ],
    targetLang: language,
    enabled: !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;
  const normalizeLink = (value?: string) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `https://${raw}`;
  };

  const {
    data,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
    isRefetching: isProfileRefetching,
  } = useGetMyProfile();
  // @ts-ignore
  const profile = data?.profile;
  const bioValue = profile?.bio?.trim();
  const businessLink = normalizeLink(profile?.businessLink);
  const { data: translatedBio } = useTranslateTexts({
    texts: [bioValue || ''],
    targetLang: language,
    enabled: !!language && language !== 'EN' && !!bioValue,
  });

  // ... existing state and logic ...
  // Selected post type state
  const [selectedType, setSelectedType] = useState<
    'photo' | 'video' | 'music' | 'all'
  >('all');

  // Map API posts to the format used in render
  const displayPosts =
    selectedType === 'photo'
      ? profile?.imagePosts || []
      : selectedType === 'video'
        ? profile?.videoPosts || []
        : selectedType === 'music'
          ? profile?.audioPosts || []
          : null; // 'all' will use myPosts hook

  // Get all posts for the 'all' tab
  const {
    data: myPostsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isMyPostsLoading,
    refetch: refetchMyPosts,
    isRefetching: isMyPostsRefetching,
  } = useGetMyPostsInfinite({ limit: 10, enabled: selectedType === 'all' });
  const allPosts =
    myPostsData?.pages?.flatMap((page: any) => page?.posts || []) || [];

  const [showShareModal, setShowShareModal] = useState(false);

  const isPullRefreshing =
    isProfileRefetching || (selectedType === 'all' && isMyPostsRefetching);

  const handleRefresh = async () => {
    await refetchProfile();
    if (selectedType === 'all') {
      await refetchMyPosts();
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
            <Text className='font-roboto-bold text-primary dark:text-white text-2xl text-center flex-1'>
              {tx(0, 'Profile')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/screens/profile/settings/settings')}
            >
              <Ionicons name='settings-outline' size={24} color={iconColor} />
            </TouchableOpacity>
          </View>

          <View className='border-b border-black/20 dark:border-[#292929] w-full mt-2'></View>

          <ScrollView
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isPullRefreshing}
                onRefresh={handleRefresh}
                tintColor={isLight ? '#000000' : '#FFFFFF'}
              />
            }
            onScroll={({ nativeEvent }) => {
              const paddingToBottom = 200;
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              const canScroll =
                contentSize.height > layoutMeasurement.height + 20;
              if (!canScroll) return;
              if (
                layoutMeasurement.height + contentOffset.y >=
                contentSize.height - paddingToBottom
              ) {
                if (hasNextPage && !isFetchingNextPage) {
                  fetchNextPage();
                }
              }
            }}
            scrollEventThrottle={200}
          >
            {/* profile picture */}
            <View className='flex-row gap-4 mt-4 items-center mx-6'>
              <TouchableOpacity className='mt-2'>
                <UserAvatar
                  uri={profile?.profileImageUrl || null}
                  isLoading={isProfileLoading}
                  size={100}
                />
              </TouchableOpacity>
              <View>
                <Text className='text-primary dark:text-white font-roboto-bold text-2xl'>
                  {profile?.displayName || user?.name || 'User'}
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
                  : tx(19, 'No bio yet')}
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

            {/* edit/share buttons */}
            {/* edit/share/saved buttons */}
            <View className='flex-row justify-center items-center gap-3 mx-4'>
              <ShadowButton
                text={tx(4, 'Edit Profile')}
                textColor='#2B2B2B'
                backGroundColor='#E8EBEE'
                onPress={() => router.push('/screens/profile/edit-profile')}
                className='mt-4 flex-1'
              />
              <ShadowButton
                text={tx(5, 'Saved Posts')}
                textColor={isLight ? '#000000' : '#E6E6E6'}
                backGroundColor={isLight ? '#F0F2F5' : '#000000'}
                onPress={() => router.push('/screens/profile/saved-posts')}
                className={`mt-4 border flex-1 ${isLight ? 'border-black/20' : 'border-[#E6E6E6]'}`}
              />
              <TouchableOpacity
                onPress={() => setShowShareModal(true)}
                className={`mt-4 p-3 rounded-2xl items-center justify-center ${
                  isLight
                    ? 'bg-[#F0F2F5] border border-black/20'
                    : 'bg-[#FFFFFF0D] border border-[#E6E6E6]'
                }`}
              >
                <Ionicons name='menu' size={24} color={iconColor} />
              </TouchableOpacity>
            </View>

            {/* border */}
            <View className='border-b border-black/20 dark:border-[#292929] w-[90%] mt-24 mx-6'></View>

            {/* post filter buttons */}
            <View className='flex-row justify-between items-center gap-2 mt-3 mx-4'>
              {['all', 'photo', 'video', 'music'].map(type => {
                const Icon = type === 'photo' ? Foundation : Feather;
                const iconName =
                  type === 'photo'
                    ? 'photo'
                    : type === 'video'
                      ? 'video'
                      : type === 'music'
                        ? 'music'
                        : 'grid';
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() =>
                      setSelectedType(
                        type as 'photo' | 'video' | 'music' | 'all'
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
                    <Icon name={iconName as any} size={20} color={iconColor} />
                    <Text className='text-primary dark:text-white font-roboto-regular text-sm'>
                      {type === 'all'
                        ? tx(10, 'All Posts')
                        : type === 'photo'
                          ? tx(11, 'Photo')
                          : type === 'video'
                            ? tx(12, 'Video')
                            : tx(13, 'Music')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* post data */}
            <View className='mt-3 mx-6'>
              {selectedType === 'all' ? (
                <View className='gap-4'>
                  {allPosts.length > 0 ? (
                    allPosts.map((post: any) => (
                      <PostCard
                        key={post._id}
                        post={post}
                        currentUserId={user?.id}
                        className='mb-4'
                        showOwnerActions={true}
                      />
                    ))
                  ) : !isMyPostsLoading ? (
                    <Text className='text-primary dark:text-white font-roboto-regular text-center mt-8'>
                      {tx(14, 'No posts found')}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View className='flex-row flex-wrap'>
                  {displayPosts && displayPosts.length > 0 ? (
                    displayPosts.map((item: any) => (
                      <View
                        key={item._id}
                        className='w-1/3 border border-black/20 dark:border-white'
                      >
                        {selectedType === 'photo' && (
                          <Image
                            source={{ uri: item.mediaUrl }}
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
                          <View
                            style={{ width: '100%', height: 130, padding: 2 }}
                          >
                            <VideoGridItem uri={item.mediaUrl} />
                            <View className='absolute inset-0 items-center justify-center'>
                              <Feather
                                name='video'
                                size={24}
                                color={iconColor}
                                opacity={0.7}
                              />
                            </View>
                          </View>
                        )}
                        {selectedType === 'music' && (
                          <View className='p-4 bg-[#F0F2F5] dark:bg-[#FFFFFF0D] items-center justify-center w-full aspect-square'>
                            <Feather name='music' size={40} color='#F54900' />
                            <Text className='text-black dark:text-white mt-2 text-center text-xs'>
                              {item.description || tx(18, 'Audio File')}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text className='text-primary dark:text-white font-roboto-regular mt-1'>
                      {selectedType === 'photo'
                        ? tx(15, 'No photo posts found')
                        : selectedType === 'video'
                          ? tx(16, 'No video posts found')
                          : tx(17, 'No music posts found')}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Share Modal */}
        <Modal
          visible={showShareModal}
          transparent={true}
          animationType='fade'
          onRequestClose={() => setShowShareModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowShareModal(false)}>
            <View className='flex-1 bg-black/50 justify-center items-center'>
              <TouchableWithoutFeedback>
                <View
                  className={`w-[80%] rounded-2xl p-4 border ${
                    isLight
                      ? 'bg-[#F0F2F5] border-black/20'
                      : 'bg-[#00000090] border-[#ffffff7a]'
                  }`}
                >
                  <Text className='text-black dark:text-white text-lg font-roboto-bold text-center mb-4'>
                    {tx(6, 'Options')}
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      setShowShareModal(false);
                      router.push('/screens/profile/scheduled-posts');
                    }}
                    className={`flex-row items-center gap-3 p-3 rounded-xl mb-3 ${
                      isLight ? 'bg-[#F0F2F5]' : 'bg-[#FFFFFF50]'
                    }`}
                  >
                    <Ionicons name='time-outline' size={24} color={iconColor} />
                    <Text className='text-black dark:text-white font-roboto-medium text-base'>
                      {tx(7, 'Scheduled Posts')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setShowShareModal(false);
                      // Add share logic here if needed, for now just close
                    }}
                    className={`flex-row items-center gap-3 p-3 rounded-xl ${
                      isLight ? 'bg-[#F0F2F5]' : 'bg-[#FFFFFF50]'
                    }`}
                  >
                    <Ionicons
                      name='share-outline'
                      size={24}
                      color={iconColor}
                    />
                    <Text className='text-black dark:text-white font-roboto-medium text-base'>
                      {tx(8, 'Share Profile')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setShowShareModal(false)}
                    className='mt-4 p-2 items-center'
                  >
                    <Text className='text-gray-400'>{tx(9, 'Cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
};

export default Profiles;

