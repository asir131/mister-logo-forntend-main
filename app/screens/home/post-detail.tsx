import BackButton from '@/components/button/BackButton';
import OfficePostCard from '@/components/card/OfficePostCard';
import PostCard from '@/components/card/PostCard';
import GradientBackground from '@/components/main/GradientBackground';
import { useGetPostById } from '@/hooks/app/post';
import useAuthStore from '@/store/auth.store';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PostDetailScreen = () => {
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const { user } = useAuthStore();
  const normalizedPostId = typeof postId === 'string' ? postId : '';
  const { data: post, isLoading, isError, refetch } = useGetPostById(
    normalizedPostId
  );

  return (
    <GradientBackground>
      <SafeAreaView className='flex-1 mt-2.5' edges={['top', 'left', 'right']}>
        <View className='flex-row mt-4 mx-6 items-center'>
          <BackButton />
          <Text className='text-primary dark:text-white font-roboto-bold text-2xl text-center flex-1'>
            Post
          </Text>
        </View>

        <View className='border-b border-black/20 dark:border-[#FFFFFF0D] w-full mt-2' />

        {isLoading ? (
          <View className='flex-1 items-center justify-center'>
            <ActivityIndicator size='large' color='black' />
          </View>
        ) : isError || !post ? (
          <View className='flex-1 items-center justify-center px-6'>
            <Text className='text-primary dark:text-white text-center font-roboto-regular'>
              Post not found.
            </Text>
            <TouchableOpacity
              className='mt-4 px-4 py-2 rounded-xl bg-[#F0F2F5] dark:bg-[#FFFFFF0D]'
              onPress={() => refetch()}
            >
              <Text className='text-primary dark:text-white font-roboto-medium'>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 72 }}
          >
            {post?.ublastId ? (
              <OfficePostCard
                post={post}
                className='mt-4'
                currentUserId={user?.id}
                isVisible
              />
            ) : (
              <PostCard
                post={post}
                className='mt-4'
                currentUserId={user?.id}
                isVisible
                preferPreview={false}
              />
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
};

export default PostDetailScreen;
