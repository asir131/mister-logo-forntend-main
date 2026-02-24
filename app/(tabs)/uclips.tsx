import GradientBackground from '@/components/main/GradientBackground';
import UserAvatar from '@/components/ui/UserAvatar';
import {
  useUserCreateComment,
  useUserGetComment,
  useUserLike,
  useUserUnLike,
} from '@/hooks/app/home';
import { useSavePost, useSharePost, useUnsavePost } from '@/hooks/app/post';
import { useGetUclips } from '@/hooks/app/uclips';
import { useTranslateTexts } from '@/hooks/app/translate';
import { useGetMyProfile } from '@/hooks/app/profile';
import useLanguageStore from '@/store/language.store';
import useThemeStore from '@/store/theme.store';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';

const { height, width } = Dimensions.get('window');

type UclipPost = {
  _id: string;
  description: string;
  mediaType: 'video';
  mediaUrl: string;
  postType: 'uclip';
  viewCount: number;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  profile: {
    username: string;
    displayName: string;
    role: string;
    profileImageUrl: string;
  };
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewerHasLiked: boolean;
  viewerIsFollowing: boolean;
  viewerHasSaved: boolean;
};

const toPlayableUclipUrl = (rawUrl?: string) => {
  if (!rawUrl) return '';
  const url = String(rawUrl).trim();
  if (!url) return '';

  // Force Cloudinary delivery to H.264 MP4 for consistent Android playback.
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
const UclipItem = ({ item, isVisible }: { item: UclipPost; isVisible: boolean }) => {
  const { mode } = useThemeStore();
  const isLight = mode === 'light';
  const [liked, setLiked] = useState(!!item.viewerHasLiked);
  const [saved, setSaved] = useState(!!item.viewerHasSaved);
  const [likes, setLikes] = useState(item.likeCount || 0);
  const [shares, setShares] = useState(item.shareCount || 0);
  const [activeComment, setActiveComment] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  const { mutate: likePost } = useUserLike();
  const { mutate: unlikePost } = useUserUnLike();
  const { mutate: savePost } = useSavePost();
  const { mutate: unsavePost } = useUnsavePost();
  const { mutate: sharePost } = useSharePost();
  const { data: commentData } = useUserGetComment(item._id);
  const { mutate: addComment } = useUserCreateComment();
  const comments = (commentData as any)?.comments || [];
  const { data: profileData } = useGetMyProfile();
  const { language: storedLanguage } = useLanguageStore();
  // @ts-ignore
  const preferredLanguage =
    (profileData as any)?.profile?.preferredLanguage || storedLanguage;
  // @ts-ignore
  const autoTranslateEnabled =
    (profileData as any)?.profile?.autoTranslateEnabled === true;

  const { data: translatedDesc } = useTranslateTexts({
    texts: [item.description || ''],
    targetLang: preferredLanguage,
    enabled: autoTranslateEnabled,
  });

  const { data: translatedComments } = useTranslateTexts({
    texts: comments.map((c: any) => c?.text || ''),
    targetLang: preferredLanguage,
    enabled: autoTranslateEnabled && activeComment && comments.length > 0,
  });

  const { data: translatedUI } = useTranslateTexts({
    texts: ['Comments', 'No comments yet. Be the first to comment!', 'Send'],
    targetLang: preferredLanguage,
    enabled: autoTranslateEnabled,
  });

  const uiTexts = (index: number, fallback: string) =>
    translatedUI?.translations?.[index] || fallback;

  const playbackUrl = React.useMemo(
    () => toPlayableUclipUrl(item.mediaUrl),
    [item.mediaUrl]
  );

  const player = useVideoPlayer(playbackUrl, p => {
    p.loop = true;
  });

  React.useEffect(() => {
    if (!isVisible) {
      player.pause();
      return;
    }
    setIsPaused(false);
    player.play();
  }, [isVisible, player]);

  React.useEffect(() => {
    if (!isVisible) return;
    if (isPaused) {
      player.pause();
    } else {
      player.play();
    }
  }, [isPaused, isVisible, player]);

  const formatCount = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return `${value}`;
  };

  return (
    <View style={{ height, width }} className='relative overflow-hidden'>
      <VideoView
        player={player}
        style={{ width: '100%', height: '100%', position: 'absolute' }}
        nativeControls={false}
        contentFit='cover'
      />

      <View className='absolute inset-0 bg-black/20 z-10' />
      <View className='absolute top-20 right-6 z-30'>
        <TouchableOpacity
          onPress={() => {
            setIsPaused(prev => !prev);
          }}
          className='h-10 w-10 rounded-full bg-black/60 items-center justify-center'
        >
          <Ionicons
            name={isPaused ? 'play' : 'pause'}
            size={20}
            color='white'
          />
        </TouchableOpacity>
      </View>

      <SafeAreaView
        edges={['top', 'left', 'right', 'bottom']}
        className='flex-1 justify-between z-20 mt-5 mb-16'
      >
        <View className='px-6 pt-3 flex-row items-center justify-between'>
          <Text className='text-black dark:text-white font-roboto-bold text-2xl'>
            UClips
          </Text>
        </View>

        <View className='flex-row justify-between items-end px-6 pb-12'>
          <View className='w-3/4'>
            <View className='flex-row items-center gap-3 mb-3'>
              <UserAvatar
                uri={item.profile?.profileImageUrl || null}
                size={44}
              />
              <View>
                <Text className='text-black dark:text-white font-roboto-semibold text-base'>
                  {item.profile?.displayName || item.author?.name || 'User'}
                </Text>
                <Text className='text-black/70 dark:text-white/70 text-xs'>
                  @{item.profile?.username || 'uclip'}
                </Text>
              </View>
            </View>

            <Text className='text-black dark:text-white text-sm'>
              {translatedDesc?.translations?.[0] || item.description}
            </Text>
          </View>

          <View className='items-center gap-5'>
            <TouchableOpacity
              className='items-center'
              onPress={() => {
                const next = !liked;
                setLiked(next);
                setLikes(prev => (next ? prev + 1 : Math.max(0, prev - 1)));
                if (next) likePost({ postId: item._id });
                else unlikePost(item._id);
              }}
            >
              <View className='h-12 w-12 rounded-full bg-black/40 items-center justify-center'>
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={26}
                  color={liked ? '#E11D48' : 'white'}
                />
              </View>
              <Text className='text-black dark:text-white text-xs mt-1'>
                {formatCount(likes)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className='items-center'
              onPress={() => setActiveComment(true)}
            >
              <View className='h-12 w-12 rounded-full bg-black/40 items-center justify-center'>
                <Ionicons
                  name='chatbubble-ellipses-outline'
                  size={24}
                  color='white'
                />
              </View>
              <Text className='text-black dark:text-white text-xs mt-1'>
                {formatCount(item.commentCount || 0)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className='items-center'
              onPress={() => {
                setShares(prev => prev + 1);
                sharePost({ postId: item._id });
              }}
            >
              <View className='h-12 w-12 rounded-full bg-black/40 items-center justify-center'>
                <Ionicons name='share-social-outline' size={24} color='white' />
              </View>
              <Text className='text-black dark:text-white text-xs mt-1'>
                {formatCount(shares)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className='items-center'
              onPress={() => {
                const next = !saved;
                setSaved(next);
                if (next) savePost(item._id);
                else unsavePost(item._id);
              }}
            >
              <View className='h-12 w-12 rounded-full bg-black/40 items-center justify-center'>
                <Ionicons
                  name={saved ? 'bookmark' : 'bookmark-outline'}
                  size={24}
                  color={saved ? '#2563EB' : 'white'}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <Modal
        visible={!!activeComment}
        transparent
        animationType='slide'
        onRequestClose={() => setActiveComment(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setActiveComment(false)}
          className='flex-1 justify-end bg-black/50'
        >
          <TouchableOpacity
            activeOpacity={1}
            className='bg-[#F0F2F5] dark:bg-[#FFFFFF0D] px-6 pt-4 pb-10 rounded-t-3xl'
          >
            <View className='w-12 h-1.5 bg-black/20 dark:bg-white/20 rounded-full self-center mb-4' />
            <Text className='text-black dark:text-white font-roboto-semibold text-lg'>
              {uiTexts(0, 'Comments')}
            </Text>
            <View className='mt-4'>
              {comments.length === 0 ? (
                <Text className='text-black/70 dark:text-white/70'>
                  {uiTexts(1, 'No comments yet. Be the first to comment!')}
                </Text>
              ) : (
                comments.map((c: any, index: number) => (
                  <View key={`${c?._id || 'comment'}-${index}`} className='mb-3'>
                    <Text className='text-black dark:text-white font-roboto-semibold'>
                      {c?.profile?.displayName || c?.user?.name || 'User'}
                    </Text>
                    <Text className='text-black/70 dark:text-white/70'>
                      {translatedComments?.translations?.[index] || c?.text}
                    </Text>
                  </View>
                ))
              )}
            </View>
            <View className='mt-4 flex-row items-center gap-2'>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder='Write a comment...'
                placeholderTextColor={isLight ? '#6B7280' : '#BBBBBB'}
                className='flex-1 bg-white/80 dark:bg-white/10 text-black dark:text-white p-3 rounded-2xl'
              />
              <TouchableOpacity
                onPress={() => {
                  if (!commentText.trim()) return;
                  addComment({ postId: item._id, text: commentText.trim() });
                  setCommentText('');
                }}
                className='bg-black/80 px-4 py-3 rounded-2xl'
              >
                <Text className='text-white'>{uiTexts(2, 'Send')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const Uclips = () => {
  const isFocused = useIsFocused();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useGetUclips(10);
  const clips = useMemo(() => {
    const all = data?.pages.flatMap((page: any) => page?.posts || []) || [];
    const seen = new Set<string>();
    return all.filter((item: any) => {
      const id = String(item?._id || '');
      if (!id) return false;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [data]);
  const [visibleId, setVisibleId] = useState<string | null>(null);
  const viewabilityConfig = React.useRef({ itemVisiblePercentThreshold: 80 });
  const onViewableItemsChanged = React.useRef(({ viewableItems }: any) => {
    const firstVisible = viewableItems?.[0]?.item?._id || null;
    setVisibleId(firstVisible);
  });
  React.useEffect(() => {
    if (!isFocused) setVisibleId(null);
  }, [isFocused]);

  return (
    <GradientBackground>
      <View className='flex-1'>
        <FlatList
          data={clips}
          renderItem={({ item }) => (
            <UclipItem item={item} isVisible={isFocused && visibleId === item._id} />
          )}
          keyExtractor={(item, index) =>
            item?._id ? String(item._id) : `uclip-${index}`
          }
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToAlignment='start'
          decelerationRate='fast'
          viewabilityConfig={viewabilityConfig.current}
          onViewableItemsChanged={onViewableItemsChanged.current}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            !isLoading ? (
              <View className='flex-1 items-center justify-center mt-10'>
                <Text className='text-black dark:text-white'>
                  No clips found
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    </GradientBackground>
  );
};

export default Uclips;

