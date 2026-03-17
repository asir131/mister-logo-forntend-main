import {
  useCommentUCuts,
  useDeleteUCuts,
  useGetUCutsComments,
  useGetUCutsFeed,
  useLikeUCuts,
  useUnlikeUCuts,
} from '@/hooks/app/ucuts';
import { useTranslateTexts } from '@/hooks/app/translate';
import { useGetMyProfile } from '@/hooks/app/profile';
import useLanguageStore from '@/store/language.store';
import useAuthStore from '@/store/auth.store';
import useThemeStore from '@/store/theme.store';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import UserAvatar from '@/components/ui/UserAvatar';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toProxyMediaUrl } from '@/lib/mediaProxy';
import {
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

const StoryItem = ({
  item,
  isVisible,
  isFocused,
}: {
  item: any;
  isVisible: boolean;
  isFocused: boolean;
}) => {
  const { user } = useAuthStore();
  const { mode } = useThemeStore();
  const isLight = mode === 'light';
  const [comment, setComment] = useState('');
  const reaction = '❤️';
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [liked, setLiked] = useState(!!item.viewerHasLiked);
  const [likeCount, setLikeCount] = useState(item.likeCount || 0);
  const { mutateAsync: likeUCut, isPending: isLiking } = useLikeUCuts();
  const { mutateAsync: unlikeUCut, isPending: isUnliking } = useUnlikeUCuts();
  const { mutateAsync: commentUCut, isPending: isCommenting } =
    useCommentUCuts();
  const { mutateAsync: deleteUCut, isPending: isDeleting } = useDeleteUCuts();
  const {
    data: commentsData,
    fetchNextPage: fetchNextComments,
    hasNextPage: hasNextComments,
    isFetchingNextPage: isFetchingNextComments,
  } = useGetUCutsComments(item.ucutId, {
    enabled: commentsOpen && !!item.ucutId,
    limit: 20,
  });
  const comments =
    commentsData?.pages?.flatMap((page: any) => page?.comments || []) || [];
  const { data: profileData } = useGetMyProfile();
  const { language: storedLanguage } = useLanguageStore();
  const isStoryActive = isVisible && isFocused;
  // @ts-ignore
  const preferredLanguage =
    (profileData as any)?.profile?.preferredLanguage || storedLanguage;
  // @ts-ignore
  const autoTranslateEnabled =
    (profileData as any)?.profile?.autoTranslateEnabled === true;

  const { data: translatedText } = useTranslateTexts({
    texts: [item.text || ''],
    targetLang: preferredLanguage,
    enabled: autoTranslateEnabled && isStoryActive,
  });

  const { data: translatedComments } = useTranslateTexts({
    texts: comments.map((c: any) => c?.text || ''),
    targetLang: preferredLanguage,
    enabled: autoTranslateEnabled && commentsOpen && comments.length > 0,
  });

  const { data: translatedUI } = useTranslateTexts({
    texts: ['Comments', 'Write a comment...', 'No comments yet'],
    targetLang: preferredLanguage,
    enabled: autoTranslateEnabled && isStoryActive,
  });

  const uiTexts = (index: number, fallback: string) =>
    translatedUI?.translations?.[index] || fallback;
  const storyMediaUrl = toProxyMediaUrl(item.storyImage);
  const previewUrl = React.useMemo(() => {
    const raw =
      item?.previewImage || item?.thumbnailUrl || item?.previewUrl || '';
    const proxy = toProxyMediaUrl(String(raw || ''));
    return proxy || String(raw || '');
  }, [item]);
  const player = useVideoPlayer(
    item.mediaType === 'video' ? storyMediaUrl : '',
    mediaTypePlayer => {
      if (item.mediaType === 'video') {
        mediaTypePlayer.loop = true;
      }
    }
  );

  useEffect(() => {
    if (!__DEV__) return;
    if (!isStoryActive) return;
    console.log('[video][ucuts]', {
      id: item?.id,
      mediaType: item?.mediaType,
      storyMediaUrl,
      previewUrl,
      isStoryActive,
    });
  }, [isStoryActive, item?.id, item?.mediaType, storyMediaUrl, previewUrl]);
  useEffect(() => {
    if (item.mediaType !== 'video') return;
    if (isVisible && isFocused) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible, isFocused, item.mediaType, player]);

  useEffect(() => {
    setLiked(!!item.viewerHasLiked);
    setLikeCount(item.likeCount || 0);
  }, [item.viewerHasLiked, item.likeCount, item.id]);

  const handleToggleLike = async () => {
    if (!item.ucutId || isLiking || isUnliking) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((prev: number) =>
      Math.max(0, prev + (nextLiked ? 1 : -1))
    );
    try {
      if (nextLiked) {
        await likeUCut(item.ucutId);
      } else {
        await unlikeUCut(item.ucutId);
      }
    } catch {
      // rollback on error
      setLiked(!nextLiked);
      setLikeCount((prev: number) =>
        Math.max(0, prev + (nextLiked ? -1 : 1))
      );
    }
  };

  const handleSendComment = async () => {
    const text = comment.trim();
    if (!text || !item.ucutId || isCommenting) return;
    if (item.canComment === false) {
      return;
    }
    setComment('');
    try {
      await commentUCut({ ucutId: item.ucutId, text });
    } catch {
      // no-op, user can retry
    }
  };

  const handleDelete = async () => {
    if (!item.ucutId || isDeleting) return;
    try {
      await deleteUCut(item.ucutId);
      router.back();
    } catch {
      // handled by toast
    }
  };

  const openInstagramStoryShare = async () => {
    const mediaUrl = String(storyMediaUrl || '');
    const mediaType = String(item.mediaType || '').toLowerCase();
    const appId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || '';
    const isHttpMedia = /^https?:\/\//i.test(mediaUrl);
    if (!isHttpMedia || (mediaType !== 'image' && mediaType !== 'video')) {
      return false;
    }

    try {
      const canOpenStory = await Linking.canOpenURL('instagram-stories://share');
      if (canOpenStory) {
        const mediaParam =
          mediaType === 'video' ? 'backgroundVideo' : 'backgroundImage';
        const queryParts = [
          `source_application=${encodeURIComponent(appId)}`,
          `${mediaParam}=${encodeURIComponent(mediaUrl)}`,
        ];
        if (item.text) {
          queryParts.push(`content_url=${encodeURIComponent(String(item.text))}`);
        }
        await Linking.openURL(`instagram-stories://share?${queryParts.join('&')}`);
        return true;
      }

      const canOpenInstagram = await Linking.canOpenURL('instagram://');
      if (canOpenInstagram) {
        await Linking.openURL('instagram://camera');
        return true;
      }
    } catch {
      // no-op
    }

    return false;
  };

  const openFacebookStoryShare = async () => {
    const mediaUrl = String(storyMediaUrl || '');
    const mediaType = String(item.mediaType || '').toLowerCase();
    const appId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || '';
    const isHttpMedia = /^https?:\/\//i.test(mediaUrl);
    const canAttachMedia =
      isHttpMedia && (mediaType === 'image' || mediaType === 'video');
    if (!canAttachMedia) {
      return false;
    }

    if (Platform.OS === 'android') {
      try {
        if (appId) {
          await Linking.sendIntent('com.facebook.stories.ADD_TO_STORY', [
            { key: 'com.facebook.platform.extra.APPLICATION_ID', value: appId },
            { key: 'source_application', value: appId },
            { key: 'interactive_asset_uri', value: mediaUrl },
            { key: 'content_url', value: mediaUrl },
          ]);
          return true;
        }
      } catch {
        // fall through to scheme-based attempt
      }
    }

    try {
      const canOpenStory = await Linking.canOpenURL('facebook-stories://share');
      if (canOpenStory) {
        const mediaParam =
          mediaType === 'video' ? 'backgroundVideo' : 'backgroundImage';
        const queryParts = [
          `${mediaParam}=${encodeURIComponent(mediaUrl)}`,
          `content_url=${encodeURIComponent(mediaUrl)}`,
        ];
        if (appId) {
          queryParts.push(`app_id=${encodeURIComponent(appId)}`);
          queryParts.push(`source_application=${encodeURIComponent(appId)}`);
        }
        await Linking.openURL(`facebook-stories://share?${queryParts.join('&')}`);
        return true;
      }
    } catch {
      // no-op
    }

    return false;
  };

  const handleShareStoryTarget = async (
    target: 'instagram_story' | 'facebook_story'
  ) => {
    setShowShareModal(false);
    const success =
      target === 'instagram_story'
        ? await openInstagramStoryShare()
        : await openFacebookStoryShare();

    if (success) {
      Toast.show({
        type: 'success',
        text1: target === 'instagram_story' ? 'Instagram Opened' : 'Facebook Opened',
        text2: 'Story share screen opened.',
      });
      return;
    }

    Toast.show({
      type: 'error',
      text1: 'Share Unavailable',
      text2: 'App install/login and valid media are required.',
    });
  };

  return (
    <View style={{ width, height }} className='bg-black'>
      {item.mediaType === 'video' ? (
        isStoryActive ? (
          <VideoView
            style={{ width, height, position: 'absolute' }}
            player={player}
            contentFit='contain'
          />
        ) : previewUrl ? (
          <Image
            source={{ uri: previewUrl }}
            style={{ width, height, position: 'absolute' }}
            contentFit='contain'
          />
        ) : (
          <View
            style={{ width, height, position: 'absolute' }}
            className='items-center justify-center bg-black'
          >
            <Ionicons name='play' size={40} color='white' />
          </View>
        )
      ) : (
        <Image
          source={{ uri: storyMediaUrl || item.storyImage }}
          style={{ width, height, position: 'absolute' }}
          contentFit='contain'
        />
      )}

      <View className='absolute inset-0 bg-black/20' />

      <SafeAreaView className='flex-1'>
        <View className='flex-row items-center justify-between px-4 pt-2.5'>
          <View className='flex-row items-center flex-1'>
            <UserAvatar
              uri={item.avatar || null}
              size={40}
              borderWidth={1}
              borderColor='white'
            />
            <View className='ml-2.5'>
              <Text className='text-white text-sm font-semibold'>
                {item.user}
              </Text>
              <Text className='text-[#CCCCCC] text-xs'>Just now</Text>
            </View>
          </View>
          <View className='flex-row items-center gap-2'>
            {item.ownerId === user?.id ? (
              <TouchableOpacity onPress={handleDelete} className='p-1.5'>
                <Ionicons
                  name='trash-outline'
                  size={24}
                  color={isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)'}
                />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => router.back()} className='p-1.5'>
              <Ionicons
                name='close'
                size={28}
                color={isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)'}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View className='absolute bottom-7 left-0 right-0 px-4'>
          {item.text ? (
            <Text
              className='text-white text-[13px] mt-4 px-4 mb-3'
              numberOfLines={2}
            >
              {translatedText?.translations?.[0] || item.text}
            </Text>
          ) : null}
          <View className='flex-row items-center gap-3'>
            <TouchableOpacity
              className='w-11 h-11 rounded-full items-center justify-center bg-white/15'
              onPress={handleToggleLike}
            >
              <Text className='text-2xl'>{liked ? reaction : '🤍'}</Text>
            </TouchableOpacity>
            <Text className='text-white/80 text-xs w-10'>{likeCount}</Text>
            <TouchableOpacity
              className='w-11 h-11 rounded-full items-center justify-center bg-white/15'
              onPress={() => setCommentsOpen(true)}
            >
              <Ionicons
                name='chatbubble-ellipses-outline'
                size={20}
                color='white'
              />
            </TouchableOpacity>
            <TouchableOpacity
              className='w-11 h-11 rounded-full items-center justify-center bg-white/15'
              onPress={() => setShowShareModal(true)}
            >
              <Ionicons name='share-social-outline' size={20} color='white' />
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          visible={commentsOpen}
          animationType='slide'
          transparent
          onRequestClose={() => setCommentsOpen(false)}
        >
          <View className='flex-1 justify-end bg-black/40'>
            <View className='bg-white dark:bg-[#0B0F15] rounded-t-3xl max-h-[70%]'>
              <View className='px-5 pt-4 pb-2 flex-row items-center justify-between'>
                <Text className='text-black dark:text-white text-base font-semibold'>
                  {uiTexts(0, 'Comments')}
                </Text>
                <TouchableOpacity onPress={() => setCommentsOpen(false)}>
                  <Ionicons
                    name='close'
                    size={22}
                    color={isLight ? 'black' : 'white'}
                  />
                </TouchableOpacity>
              </View>

              <View className='px-5 pb-3'>
                <View className='flex-row items-center h-12 rounded-full bg-[#F0F2F5] dark:bg-[#FFFFFF0D] px-4 border border-black/10 dark:border-white/10'>
                  <TextInput
                    className='flex-1 text-black dark:text-white text-sm'
                    placeholder={uiTexts(1, 'Write a comment...')}
                    placeholderTextColor={isLight ? '#6B7280' : '#BBBBBB'}
                    value={comment}
                    onChangeText={setComment}
                    onSubmitEditing={handleSendComment}
                    editable={item.canComment !== false}
                  />
                  <TouchableOpacity onPress={handleSendComment}>
                    <Ionicons
                      name='send'
                      size={18}
                      color={isLight ? 'black' : 'white'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <FlatList
                data={comments}
                keyExtractor={(c: any, idx: number) => c?._id || `${idx}`}
                className='px-5 pb-6'
                showsVerticalScrollIndicator={false}
                renderItem={({ item: c, index }: { item: any; index: number }) => (
                  <View className='flex-row gap-3 py-3 border-b border-black/10 dark:border-white/10'>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        const commentUserId = String(
                          c?.user?.id || c?.user?._id || c?.userId || ''
                        );
                        if (!commentUserId) return;
                        if (String(commentUserId) === String(user?.id || '')) {
                          router.push('/(tabs)/profile');
                          return;
                        }
                        router.push({
                          pathname: '/screens/profile/other-profile',
                          params: { id: commentUserId },
                        });
                      }}
                    >
                      <UserAvatar
                        uri={c?.user?.profileImageUrl || c?.profileImageUrl || null}
                        size={36}
                      />
                    </TouchableOpacity>
                    <View className='flex-1'>
                      <Text className='text-black dark:text-white text-sm font-semibold'>
                        {c?.user?.name || c?.name || 'User'}
                      </Text>
                      <Text className='text-black/70 dark:text-white/80 text-sm mt-1'>
                        {translatedComments?.translations?.[index] || c?.text || ''}
                      </Text>
                    </View>
                  </View>
                )}
                onEndReached={() => {
                  if (hasNextComments && !isFetchingNextComments) {
                    fetchNextComments();
                  }
                }}
                onEndReachedThreshold={0.3}
                ListEmptyComponent={
                  <View className='py-6 items-center'>
                    <Text className='text-black/60 dark:text-white/70 text-sm'>
                      {uiTexts(2, 'No comments yet')}
                    </Text>
                  </View>
                }
              />
            </View>
          </View>
        </Modal>
        <Modal
          visible={showShareModal}
          transparent
          animationType='fade'
          onRequestClose={() => setShowShareModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowShareModal(false)}>
            <View className='flex-1 bg-black/50 justify-end'>
              <TouchableWithoutFeedback>
                <View className='bg-white dark:bg-[#111111] p-6 rounded-t-3xl'>
                  <Text className='text-black dark:text-white font-roboto-semibold text-lg mb-4'>
                    Share UCut
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleShareStoryTarget('instagram_story')}
                    className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                  >
                    <Text className='text-black dark:text-white font-roboto-medium'>
                      Share to Instagram Story
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleShareStoryTarget('facebook_story')}
                    className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                  >
                    <Text className='text-black dark:text-white font-roboto-medium'>
                      Share to Facebook Story
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowShareModal(false)}
                    className='mt-1 py-3 px-4 rounded-xl border border-black/10 dark:border-white/10'
                  >
                    <Text className='text-center text-black dark:text-white font-roboto-medium'>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const StoryView = () => {
  const { user } = useAuthStore();
  const { ownerId } = useLocalSearchParams<{ ownerId?: string }>();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetUCutsFeed({ limit: 20 });
  const ucuts = useMemo(
    () => data?.pages?.flatMap((page: any) => page?.ucuts || []) || [],
    [data]
  );
  const listRef = useRef<FlatList<any>>(null);
  const didInitialScroll = useRef(false);
  const isFocused = useIsFocused();
  const [visibleId, setVisibleId] = useState<string | null>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 });
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const firstVisible = viewableItems?.[0]?.item?.id || null;
    setVisibleId((prev: string | null) =>
      prev === firstVisible ? prev : firstVisible
    );
  });

  const segments = useMemo(() => {
    const groups = new Map<
      string,
      {
        ownerId: string;
        ownerName: string;
        ownerAvatar: string;
        latestAt: number;
        items: any[];
      }
    >();

    ucuts.forEach((ucut: any) => {
      const owner = ucut?.owner || {};
      const id = owner?.id || ucut?.userId;
      if (!id) return;
      const createdAt = new Date(ucut?.createdAt || 0).getTime();
      const existing = groups.get(id);
      const ownerName = owner?.name || 'User';
      const ownerAvatar = owner?.profileImageUrl || '';

      if (!existing) {
        groups.set(id, {
          ownerId: id,
          ownerName,
          ownerAvatar,
          latestAt: createdAt,
          items: [ucut],
        });
      } else {
        existing.items.push(ucut);
        if (createdAt > existing.latestAt) {
          existing.latestAt = createdAt;
        }
      }
    });

    const orderedGroups = Array.from(groups.values()).sort((a, b) => {
      if (a.ownerId === user?.id) return -1;
      if (b.ownerId === user?.id) return 1;
      return b.latestAt - a.latestAt;
    });

    return orderedGroups.flatMap(group => {
      const orderedUCuts = [...group.items].sort((a: any, b: any) => {
        const aTime = new Date(a?.createdAt || 0).getTime();
        const bTime = new Date(b?.createdAt || 0).getTime();
        return aTime - bTime;
      });

      return orderedUCuts.flatMap((ucut: any) => {
        const segs = [...(ucut.segments || [])].sort(
          (a: any, b: any) => (a.order || 0) - (b.order || 0)
        );
        return segs.map((seg: any) => ({
          id: `${ucut._id}-${seg.order}`,
          ucutId: ucut._id,
          ownerId: group.ownerId,
          user: group.ownerName,
          avatar: group.ownerAvatar,
          storyImage: seg.url,
          mediaType: ucut.mediaType || ucut.type || 'image',
          text: ucut.text || '',
          likeCount: ucut.likeCount || 0,
          viewerHasLiked: !!ucut.viewerHasLiked,
          canComment: ucut.canComment,
        }));
      });
    });
  }, [ucuts, user?.id]);

  const startIndex = useMemo(() => {
    if (!ownerId) return 0;
    const idx = segments.findIndex(item => item.ownerId === ownerId);
    return idx >= 0 ? idx : 0;
  }, [ownerId, segments]);

  useEffect(() => {
    if (!segments.length) return;
    if (didInitialScroll.current) return;
    listRef.current?.scrollToIndex({
      index: startIndex,
      animated: false,
    });
    didInitialScroll.current = true;
  }, [segments.length, startIndex]);
  useEffect(() => {
    if (!isFocused) setVisibleId(null);
  }, [isFocused]);

  return (
    <View className='flex-1 bg-black'>
      <FlatList
        ref={listRef}
        data={segments}
        renderItem={({ item }) => (
          <StoryItem
            item={item}
            isVisible={isFocused && visibleId === item.id}
            isFocused={isFocused}
          />
        )}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={startIndex}
        viewabilityConfig={viewabilityConfig.current}
        onViewableItemsChanged={onViewableItemsChanged.current}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={true}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        onScrollToIndexFailed={() => {
          listRef.current?.scrollToIndex({ index: 0, animated: false });
        }}
        getItemLayout={(data, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />
    </View>
  );
};

export default StoryView;

