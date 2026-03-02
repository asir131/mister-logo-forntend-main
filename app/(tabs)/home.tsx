import OfficePostCard from '@/components/card/OfficePostCard';
import PostCard from '@/components/card/PostCard';
import SuggestedArtistsCard from '@/components/card/SuggestedArtistsCard';
import UserAvatar from '@/components/ui/UserAvatar';
import GradientBackground from '@/components/main/GradientBackground';
import StorySection from '@/components/main/StorySection';
import { useGetAllPost } from '@/hooks/app/home';
import { useGetMyProfile } from '@/hooks/app/profile';
import { useTranslateTexts } from '@/hooks/app/translate';
import useAuthStore from '@/store/auth.store';
import useLanguageStore from '@/store/language.store';
import useNotificationStore from '@/store/notification.store';
import useThemeStore from '@/store/theme.store';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';

interface Author {
  email: string;
  id: string;
  name: string;
}

interface Profile {
  displayName: string;
  profileImageUrl: string;
  role: string;
  username: string;
}

export interface Post {
  _id: string;
  author: Author;
  commentCount: number;
  createdAt: string;
  description: string;
  likeCount: number;
  mediaType: 'image' | 'video' | 'audio';
  mediaUrl: string;
  profile: Profile;
  viewerHasLiked: boolean;
  viewerIsFollowing: boolean;
  ublastId?: string;
}

const Home = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
  } = useGetAllPost();
  const { user } = useAuthStore();
  const { data: profileData, isLoading: isProfileLoading } = useGetMyProfile({ enabled: !!user?.token });
  const profileImageUrl =
    (profileData as any)?.profile?.profileImageUrl ||
    (profileData as any)?.profileImageUrl ||
    '';
  const { language } = useLanguageStore();
  const { mode } = useThemeStore();
  const unreadCount = useNotificationStore(state => state.badgeCount);
  const isLight = mode === 'light';
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();
  const { data: t } = useTranslateTexts({
    texts: ["What's on your mind?", 'No posts found'],
    targetLang: language,
    enabled: !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;
  const createPlaceholder = tx(0, "What's on your mind?");

  const posts = useMemo(() => {
    const pages = Array.isArray((data as any)?.pages)
      ? (data as any).pages
      : [];
    const all = pages.flatMap((page: any) =>
      Array.isArray(page?.posts) ? page.posts : []
    );
    const seen = new Set<string>();
    return all.filter((item: any) => {
      const id = String(item?._id || '');
      if (!id) return false;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [data]);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const firstVisibleId = String(viewableItems?.[0]?.item?._id || '') || null;
    setActivePostId(prev => (prev === firstVisibleId ? prev : firstVisibleId));
  });

  const header = useMemo(
    () => (
      <View>
        {/* home header */}
        <View className='flex-row justify-between items-center mx-4 mt-3'>
          <TouchableOpacity>
            <View
              className={`px-2 py-1 rounded-lg ${
                isLight ? 'bg-black' : 'bg-transparent'
              }`}
            >
              <Image
                source={require('@/assets/images/logo.png')}
                style={{ width: 60, height: 26 }}
                contentFit='contain'
              />
            </View>
          </TouchableOpacity>
          <View className='flex-row gap-3 items-center'>
            <TouchableOpacity
              onPress={() => router.push('/screens/home/notification')}
              className='relative'
            >
              <Ionicons
                name='notifications-outline'
                size={24}
                color={isLight ? 'black' : 'white'}
              />
              {unreadCount > 0 && (
                <View className='absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 items-center justify-center'>
                  <Text className='text-white text-[10px] font-roboto-bold'>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
              <UserAvatar
                uri={profileImageUrl || null}
                isLoading={isProfileLoading}
                size={30}
              />
            </TouchableOpacity>
          </View>
        </View>

        <StorySection />

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/create')}
          className='bg-[#F0F2F5] dark:bg-[#FFFFFF0D] rounded-2xl px-4 py-2 mt-4 h-11'
        >
          <Text className='text-[#9CA3AF] text-base flex-1'>
            {createPlaceholder}
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [isLight, unreadCount, profileImageUrl, isProfileLoading, createPlaceholder]
  );

  const renderPost = useCallback(
    ({ item, index }: { item: Post; index: number }) => {
      if (!item?._id) return null;
      return (
        <View>
          {item?.ublastId ? (
            <OfficePostCard
              post={item}
              className='mt-4'
              currentUserId={user?.id}
              isVisible={isFocused && activePostId === item._id}
            />
          ) : (
            <PostCard
              post={item}
              className='mt-4'
              currentUserId={user?.id}
              isVisible={isFocused && activePostId === item._id}
            />
          )}
          {index === 1 ? <SuggestedArtistsCard className='mt-4' /> : null}
        </View>
      );
    },
    [user?.id, isFocused, activePostId]
  );

  const listFooter = useMemo(() => {
    if (!isFetchingNextPage) return <View className='h-20' />;
    return (
      <View className='py-4 items-center'>
        <ActivityIndicator size='small' color='black' />
      </View>
    );
  }, [isFetchingNextPage]);

  const keyExtractor = useCallback(
    (item: Post, index: number) =>
      item?._id ? String(item._id) : `home-${index}`,
    []
  );

  const onRefresh = useCallback(() => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['ucuts-feed'] });
  }, [refetch, queryClient]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading && !isRefetching) {
    return (
      <GradientBackground>
        <SafeAreaView
          className='flex-1 mx-6 mt-2.5 mb-17'
          edges={['top', 'left', 'right']}
        >
          {header}
          <View className='flex-1 justify-center items-center'>
            <ActivityIndicator size='large' color='black' />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView
        className='flex-1 mx-6 mt-2.5 mb-17'
        edges={['top', 'left', 'right']}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={keyExtractor}
            viewabilityConfig={viewabilityConfig.current}
            onViewableItemsChanged={onViewableItemsChanged.current}
            ListHeaderComponent={header}
            ListFooterComponent={listFooter}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            showsVerticalScrollIndicator={false}
            refreshing={isRefetching}
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={5}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={true}
            onRefresh={onRefresh}
            ListEmptyComponent={
              <View className='mt-10'>
                <Text className='text-black dark:text-white text-center'>
                  {tx(1, 'No posts found')}
                </Text>
              </View>
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
};

export default Home;

