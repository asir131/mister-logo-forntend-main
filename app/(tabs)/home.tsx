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
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewToken,
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

interface SearchUser {
  userId: string;
  name: string;
  username: string;
  profileImageUrl: string;
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
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visiblePostIds, setVisiblePostIds] = useState<Set<string>>(new Set());
  const searchAnim = React.useRef(new Animated.Value(0)).current;
  const { data: t } = useTranslateTexts({
    texts: ["What's on your mind?", 'No posts found', 'Search users...'],
    targetLang: language,
    enabled: !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;
  const createPlaceholder = tx(0, "What's on your mind?");
  const searchPlaceholder = tx(2, 'Search users...');

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

  const searchableUsers = useMemo<SearchUser[]>(() => {
    const unique = new Map<string, SearchUser>();

    posts.forEach((item: any) => {
      const userId = String(item?.author?.id || item?.author?._id || '');
      if (!userId || unique.has(userId)) return;

      unique.set(userId, {
        userId,
        name: String(item?.profile?.displayName || item?.author?.name || 'User'),
        username: String(item?.profile?.username || ''),
        profileImageUrl: String(item?.profile?.profileImageUrl || ''),
      });
    });

    return Array.from(unique.values());
  }, [posts]);

  const filteredPosts = posts;

  const matchedUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    return searchableUsers
      .filter(item => {
        const name = String(item?.name || '').toLowerCase();
        const username = String(item?.username || '').toLowerCase();
        return name.includes(query) || username.includes(query);
      })
      .slice(0, 8);
  }, [searchableUsers, searchQuery]);

  const handleOpenSearchUser = useCallback(
    (targetUserId: string) => {
      if (!targetUserId) return;

      setSearchQuery('');
      setIsSearchVisible(false);

      if (String(targetUserId) === String(user?.id || '')) {
        router.push('/(tabs)/profile');
        return;
      }

      router.push({
        pathname: '/screens/profile/other-profile',
        params: { id: String(targetUserId) },
      });
    },
    [user?.id]
  );

  const toggleSearch = useCallback(() => {
    setIsSearchVisible(prev => {
      const nextVisible = !prev;
      if (!nextVisible) setSearchQuery('');
      return nextVisible;
    });
  }, []);

  React.useEffect(() => {
    Animated.timing(searchAnim, {
      toValue: isSearchVisible ? 1 : 0,
      duration: isSearchVisible ? 220 : 180,
      easing: isSearchVisible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isSearchVisible, searchAnim]);

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
            <TouchableOpacity onPress={toggleSearch}>
              <Ionicons
                name='search-outline'
                size={23}
                color={isLight ? 'black' : 'white'}
              />
            </TouchableOpacity>
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

        <View style={{ position: 'relative', zIndex: 50, elevation: 50 }}>
          <Animated.View
            style={{
              marginTop: searchAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 12],
              }),
              height: searchAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 44],
              }),
              opacity: searchAnim,
              transform: [
                {
                  translateY: searchAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-14, 0],
                  }),
                },
              ],
              overflow: 'hidden',
            }}
            pointerEvents={isSearchVisible ? 'auto' : 'none'}
          >
            <View className='flex-1 flex-row items-center gap-2 bg-[#F0F2F5] dark:bg-[#FFFFFF14] rounded-xl px-3 h-11'>
              <Ionicons
                name='search-outline'
                size={18}
                color={isLight ? '#6B7280' : '#D1D5DB'}
              />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor={isLight ? '#9CA3AF' : '#9CA3AF'}
                className='flex-1 text-black dark:text-white font-roboto-regular'
                returnKeyType='search'
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons
                    name='close-circle'
                    size={18}
                    color={isLight ? '#6B7280' : '#D1D5DB'}
                  />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          {isSearchVisible && searchQuery.trim().length > 0 && matchedUsers.length > 0 && (
            <View className='absolute left-0 right-0 top-14 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#111827] overflow-hidden'>
              {matchedUsers.map((item: SearchUser) => (
                <TouchableOpacity
                  key={item.userId}
                  className='px-3 py-2.5 flex-row items-center gap-3 border-b border-black/5 dark:border-white/10'
                  onPress={() => handleOpenSearchUser(item.userId)}
                  activeOpacity={0.8}
                >
                  <UserAvatar uri={item.profileImageUrl || null} size={34} />
                  <View className='flex-1'>
                    <Text className='text-black dark:text-white font-roboto-medium text-sm' numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className='text-[#6B7280] dark:text-[#9CA3AF] text-xs' numberOfLines={1}>
                      @{item.username || 'user'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
    [
      isLight,
      unreadCount,
      profileImageUrl,
      isProfileLoading,
      createPlaceholder,
      isSearchVisible,
      searchQuery,
      searchPlaceholder,
      searchAnim,
      toggleSearch,
      matchedUsers,
      handleOpenSearchUser,
    ]
  );

  const renderPost = useCallback(
    ({ item, index }: { item: Post; index: number }) => {
      if (!item?._id) return null;
      const isItemVisible = visiblePostIds.has(String(item._id));

      return (
        <View>
          {item?.ublastId ? (
            <OfficePostCard
              post={item}
              className='mt-4'
              currentUserId={user?.id}
              isVisible={isFocused && isItemVisible}
            />
          ) : (
            <PostCard
              post={item}
              className='mt-4'
              currentUserId={user?.id}
              isVisible={isFocused && isItemVisible}
            />
          )}
          {index === 1 ? <SuggestedArtistsCard className='mt-4' /> : null}
        </View>
      );
    },
    [user?.id, isFocused, visiblePostIds]
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

  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 55,
    minimumViewTime: 120,
  });

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const nextIds = new Set<string>();

      viewableItems.forEach(viewable => {
        const id = String((viewable?.item as Post | undefined)?._id || '');
        if (id) nextIds.add(id);
      });

      setVisiblePostIds(prevIds => {
        if (prevIds.size === nextIds.size) {
          let unchanged = true;
          for (const id of nextIds) {
            if (!prevIds.has(id)) {
              unchanged = false;
              break;
            }
          }
          if (unchanged) return prevIds;
        }

        return nextIds;
      });
    }
  ).current;

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
            data={filteredPosts}
            renderItem={renderPost}
            keyExtractor={keyExtractor}
            ListHeaderComponent={header}
            ListFooterComponent={listFooter}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfigRef.current}
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

