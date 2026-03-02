import PostCard from '@/components/card/PostCard';
import GradientBackground from '@/components/main/GradientBackground';
import { useGetAllSavePost } from '@/hooks/app/post';
import { useTranslateTexts } from '@/hooks/app/translate';
import useAuthStore from '@/store/auth.store';
import useLanguageStore from '@/store/language.store';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';

const SavedPosts = () => {
  const {
    data,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetAllSavePost({ limit: 10 });
  const { user } = useAuthStore();
  const isFocused = useIsFocused();
  const { language } = useLanguageStore();
  const { data: t } = useTranslateTexts({
    texts: [
      'Saved Posts',
      'No saved posts yet',
      'Explore Posts',
      'Loading your collection...',
    ],
    targetLang: language,
    enabled: !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;

  // Handle both bookmarks structure and direct posts array
  // @ts-ignore
  const posts =
    data?.pages?.flatMap((page: any) => {
      if (page?.bookmarks) return page.bookmarks.map((b: any) => b.post);
      if (page?.posts) return page.posts;
      return Array.isArray(page) ? page : [];
    }) || [];

  const renderHeader = () => (
    <View className='flex-row items-center mx-6 mt-3 mb-6'>
      <TouchableOpacity onPress={() => router.back()} className='p-2 mr-2 bg-[#F0F2F5] dark:bg-[#FFFFFF0D] rounded-full'>
        <Ionicons name='chevron-back' size={24} color='black' />
      </TouchableOpacity>
      <Text className='font-roboto-bold text-primary dark:text-white text-2xl flex-1 text-center pr-10'>
        {tx(0, 'Saved Posts')}
      </Text>
    </View>
  );

  const [activePostId, setActivePostId] = useState<string | null>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const firstVisibleId = String(viewableItems?.[0]?.item?._id || '') || null;
    setActivePostId(prev => (prev === firstVisibleId ? prev : firstVisibleId));
  }).current;

  return (
    <GradientBackground>
      <SafeAreaView className='flex-1' edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <FlatList
            data={posts}
            renderItem={({ item }) => (
              <PostCard
                post={item}
                className='mt-0 mb-6 mx-4'
                currentUserId={user?.id}
                isSavedScreen={true}
                isVisible={isFocused && activePostId === item?._id}
              />
            )}
            keyExtractor={(item, index) =>
              item?._id ? String(item._id) : `saved-post-${index}`
            }
            ListHeaderComponent={renderHeader}
            showsVerticalScrollIndicator={false}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={5}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={true}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.4}
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
            refreshing={isRefetching}
            onRefresh={refetch}
            ListEmptyComponent={
              !isLoading ? (
                <View className='mt-20 items-center'>
                  <Ionicons name='bookmark-outline' size={64} color='#666' />
                  <Text className='text-secondary dark:text-white/80 text-lg font-roboto-medium mt-4'>
                    {tx(1, 'No saved posts yet')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/(tabs)/home')}
                    className='mt-6 px-8 py-3 bg-white rounded-full'
                  >
                    <Text className='text-black dark:text-white font-roboto-bold'>
                      {tx(2, 'Explore Posts')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
          {isLoading && (
            <View className='absolute inset-0 justify-center items-center'>
              <Text className='text-black dark:text-white font-roboto-medium'>
                {tx(3, 'Loading your collection...')}
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
};

export default SavedPosts;
