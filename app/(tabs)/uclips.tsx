import GradientBackground from '@/components/main/GradientBackground';
import UserAvatar from '@/components/ui/UserAvatar';
import {
  useUserCreateComment,
  useUserGetComment,
  useUserLike,
  useUserUnLike,
} from '@/hooks/app/home';
import api, { SOCIAL_AUTH_BASE_URL } from '@/api/axiosInstance';
import { useCreateUCuts } from '@/hooks/app/ucuts';
import { useSavePost, useSharePost, useUnsavePost } from '@/hooks/app/post';
import { useGetUclips } from '@/hooks/app/uclips';
import { useTranslateTexts } from '@/hooks/app/translate';
import { useGetMyProfile } from '@/hooks/app/profile';
import useLanguageStore from '@/store/language.store';
import useThemeStore from '@/store/theme.store';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Platform,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

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
  const [showShareModal, setShowShareModal] = useState(false);

  const { mutate: likePost } = useUserLike();
  const { mutate: unlikePost } = useUserUnLike();
  const { mutate: savePost } = useSavePost();
  const { mutate: unsavePost } = useUnsavePost();
  const { mutateAsync: sharePost } = useSharePost();
  const { mutateAsync: createUcut } = useCreateUCuts();
  const { data: commentData } = useUserGetComment(item._id, {
    enabled: activeComment,
  });
  const { mutate: addComment } = useUserCreateComment();
  const comments =
    (commentData as any)?.pages?.flatMap((page: any) => page?.comments || []) ||
    (commentData as any)?.comments ||
    [];
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
    enabled: autoTranslateEnabled && isVisible,
  });

  const { data: translatedComments } = useTranslateTexts({
    texts: comments.map((c: any) => c?.text || ''),
    targetLang: preferredLanguage,
    enabled: autoTranslateEnabled && activeComment && comments.length > 0,
  });

  const { data: translatedUI } = useTranslateTexts({
    texts: ['Comments', 'No comments yet. Be the first to comment!', 'Send'],
    targetLang: preferredLanguage,
    enabled: autoTranslateEnabled && isVisible,
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

  const buildPublicShareUrl = () => {
    if (!item?._id) return '';
    const base = SOCIAL_AUTH_BASE_URL?.replace(/\/$/, '') || '';
    return base ? `${base}/share/${item._id}` : '';
  };

  const buildPostDeepLink = () => {
    if (!item?._id) return '';
    return ExpoLinking.createURL('/screens/home/post-detail', {
      queryParams: { postId: String(item._id) },
    });
  };

  const buildSharePayload = () => {
    const description = item?.description?.trim() || '';
    const mediaUrl = item?.mediaUrl?.trim() || '';
    const publicShareUrl = buildPublicShareUrl();
    const deepLink = buildPostDeepLink();
    const shareUrl = deepLink || publicShareUrl;
    const message = [description, shareUrl || mediaUrl].filter(Boolean).join('\n');
    return { description, mediaUrl, shareUrl, publicShareUrl, message };
  };

  const openFacebookShare = async () => {
    const { description, mediaUrl, message } = buildSharePayload();
    const fallbackUrl = mediaUrl || 'https://www.facebook.com';
    const webShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      fallbackUrl
    )}${description ? `&quote=${encodeURIComponent(description)}` : ''}`;

    try {
      const canOpenFacebook = await Linking.canOpenURL('fb://');
      if (canOpenFacebook) {
        const appShareUrl = `fb://facewebmodal/f?href=${encodeURIComponent(webShareUrl)}`;
        await Linking.openURL(appShareUrl);
        return true;
      }
      await Linking.openURL(webShareUrl);
      return true;
    } catch {
      try {
        await Share.share({ message, url: mediaUrl || undefined });
        return true;
      } catch {
        return false;
      }
    }
  };

  const openInstagramStoryShare = async () => {
    const { description, mediaUrl, message } = buildSharePayload();
    const mediaType = item?.mediaType;
    const appId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || '';

    try {
      const canOpenStory = await Linking.canOpenURL('instagram-stories://share');
      if (canOpenStory && mediaUrl) {
        const mediaParam =
          mediaType === 'video' ? 'backgroundVideo' : 'backgroundImage';
        const storyUrl = `instagram-stories://share?source_application=${encodeURIComponent(
          appId
        )}&${mediaParam}=${encodeURIComponent(mediaUrl)}${
          description ? `&content_url=${encodeURIComponent(description)}` : ''
        }`;
        await Linking.openURL(storyUrl);
        return true;
      }

      const canOpenInstagram = await Linking.canOpenURL('instagram://');
      if (canOpenInstagram) {
        await Linking.openURL('instagram://camera');
        return true;
      }

      await Share.share({ message, url: mediaUrl || undefined });
      return true;
    } catch {
      return false;
    }
  };

  const openInstagramShare = async () => {
    const { mediaUrl, message } = buildSharePayload();

    try {
      if (mediaUrl && /^https?:\/\//i.test(mediaUrl)) {
        const isShareAvailable = await Sharing.isAvailableAsync();
        if (isShareAvailable) {
          const ext = item?.mediaType === 'video' ? 'mp4' : 'jpg';
          const mimeType = item?.mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
          const localFile = `${FileSystem.cacheDirectory}instagram-share-${item?._id || Date.now()}.${ext}`;

          await FileSystem.downloadAsync(mediaUrl, localFile);

          await Sharing.shareAsync(localFile, {
            dialogTitle: 'Share to Instagram',
            mimeType,
            UTI: item?.mediaType === 'video' ? 'public.movie' : 'public.image',
          });
          return true;
        }
      }

      const canOpenInstagram = await Linking.canOpenURL('instagram://app');
      if (canOpenInstagram) {
        await Linking.openURL('instagram://camera');
        return true;
      }

      await Share.share({ message, url: mediaUrl || undefined });
      return true;
    } catch {
      return false;
    }
  };

  const openTwitterShare = async () => {
    const { description, mediaUrl, shareUrl, publicShareUrl, message } = buildSharePayload();

    try {
      const tweetText = description || message || '';
      const targetUrl = publicShareUrl || shareUrl || mediaUrl;
      const canOpenTwitterApp =
        (await Linking.canOpenURL('twitter://')) ||
        (await Linking.canOpenURL('x://'));

      if (canOpenTwitterApp) {
        const appMessage = [tweetText, targetUrl].filter(Boolean).join(' ');
        const appUrl = `twitter://post?message=${encodeURIComponent(appMessage)}`;
        await Linking.openURL(appUrl);
        return true;
      }

      const baseUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
      const intentUrl = targetUrl
        ? `${baseUrl}&url=${encodeURIComponent(targetUrl)}`
        : baseUrl;
      await Linking.openURL(intentUrl);
      return true;
    } catch {
      return false;
    }
  };

  const openTikTokShare = async () => {
    const { mediaUrl, message } = buildSharePayload();

    try {
      if (!mediaUrl || !/^https?:\/\//i.test(mediaUrl)) {
        return false;
      }

      const isShareAvailable = await Sharing.isAvailableAsync();
      if (!isShareAvailable) {
        return false;
      }

      const ext = item?.mediaType === 'video' ? 'mp4' : 'jpg';
      const mimeType = item?.mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
      const localFile = `${FileSystem.cacheDirectory}tiktok-share-${item?._id || Date.now()}.${ext}`;

      await FileSystem.downloadAsync(mediaUrl, localFile);

      await Sharing.shareAsync(localFile, {
        dialogTitle: 'Share to TikTok',
        mimeType,
      });

      return true;
    } catch {
      try {
        const schemes = ['snssdk1233://', 'snssdk1180://', 'tiktok://', 'musically://'];
        for (const scheme of schemes) {
          try {
            await Linking.openURL(scheme);
            return true;
          } catch {
            // try next
          }
        }
      } catch {
        // no-op
      }

      try {
        await Share.share({ message, url: mediaUrl || undefined });
        return true;
      } catch {
        return false;
      }
    }
  };

  const openYouTubeShare = async () => {
    if (!item?._id) return false;
    const connectRedirect = ExpoLinking.createURL('auth/youtube');

    const tryUpload = async (): Promise<any> => {
      const result = await api.post('/api/youtube/share', { postId: item._id });
      return (result as any)?.data ?? result;
    };

    try {
      const result = await tryUpload();
      if (result?.url) {
        Toast.show({
          type: 'success',
          text1: 'YouTube Upload Complete',
          text2: 'Your video was uploaded successfully.',
        });
      }
      return true;
    } catch (error: any) {
      const status = Number(error?.response?.status || 0);
      const code = String(error?.response?.data?.code || '');
      const needsConnect = status === 428 || code === 'YOUTUBE_AUTH_REQUIRED';
      if (!needsConnect) return false;
    }

    try {
      const authRes = await api.get(
        '/api/youtube/connect-url?clientRedirect=' + encodeURIComponent(connectRedirect)
      );
      const authPayload = (authRes as any)?.data ?? authRes;
      const authUrl = String(authPayload?.url || '');
      if (!authUrl) return false;

      const authResult = await WebBrowser.openAuthSessionAsync(authUrl, connectRedirect);
      if (authResult.type !== 'success' || !authResult.url) {
        return false;
      }

      const parsed = ExpoLinking.parse(authResult.url);
      const status = String(parsed?.queryParams?.status || '');
      if (status !== 'success') {
        return false;
      }

      const uploaded = await tryUpload();
      if (uploaded?.url) {
        Toast.show({
          type: 'success',
          text1: 'YouTube Upload Complete',
          text2: 'Your video was uploaded successfully.',
        });
      }
      return true;
    } catch {
      return false;
    }
  };

  const openFacebookStoryShare = async () => {
    const { mediaUrl } = buildSharePayload();
    const mediaType = item?.mediaType;
    const appId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || '';
    const isHttpMedia = /^https?:\/\//i.test(mediaUrl);
    const canAttachMedia =
      Boolean(mediaUrl) && (mediaType === 'image' || mediaType === 'video');

    if (Platform.OS === 'android') {
      try {
        if (appId && canAttachMedia && isHttpMedia) {
          await Linking.sendIntent('com.facebook.stories.ADD_TO_STORY', [
            { key: 'com.facebook.platform.extra.APPLICATION_ID', value: appId },
            { key: 'source_application', value: appId },
            { key: 'interactive_asset_uri', value: mediaUrl },
            { key: 'content_url', value: mediaUrl },
          ]);
          return true;
        }
      } catch {
        // fall through
      }
    }

    try {
      const canOpenStory = await Linking.canOpenURL('facebook-stories://share');
      if (canOpenStory && canAttachMedia && isHttpMedia) {
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
        const storyUrl = `facebook-stories://share?${queryParts.join('&')}`;
        await Linking.openURL(storyUrl);
        return true;
      }
    } catch {
      // no-op
    }

    return false;
  };

  const handleShareTarget = async (
    target:
      | 'facebook'
      | 'instagram'
      | 'facebook_story'
      | 'instagram_story'
      | 'feed'
      | 'story'
      | 'twitter'
      | 'tiktok'
      | 'youtube'
      | 'snapchat'
      | 'spotify'
  ) => {
    if (!item?._id) return;
    try {
      if (target === 'feed') {
        await sharePost({ postId: item._id });
        setShares(prev => prev + 1);
      } else if (target === 'story') {
        await createUcut({
          text: item.description || '',
          mediaUrl: item.mediaUrl || undefined,
          mediaType: item.mediaType || undefined,
        });
      } else if (target === 'facebook_story') {
        const appId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || '';
        if (!appId) {
          Toast.show({
            type: 'error',
            text1: 'Facebook Story unavailable',
            text2: 'Set EXPO_PUBLIC_FACEBOOK_APP_ID first.',
          });
          return;
        }
        if (item?.mediaType === 'audio' || !item?.mediaUrl) {
          Toast.show({
            type: 'error',
            text1: 'Facebook Story unavailable',
            text2: 'Only image or video can be shared to story.',
          });
          return;
        }
        const opened = await openFacebookStoryShare();
        if (!opened) {
          Toast.show({
            type: 'error',
            text1: 'Facebook story failed',
            text2: 'Story composer did not open with media.',
          });
          return;
        }
      } else if (target === 'instagram_story') {
        const opened = await openInstagramStoryShare();
        if (!opened) {
          Toast.show({
            type: 'error',
            text1: 'Instagram story failed',
            text2: 'Could not open Instagram story share.',
          });
        }
      } else if (target === 'twitter') {
        const opened = await openTwitterShare();
        if (!opened) {
          Toast.show({
            type: 'error',
            text1: 'Twitter share failed',
            text2: 'Could not open Twitter share.',
          });
        }
      } else if (target === 'instagram') {
        const opened = await openInstagramShare();
        if (!opened) {
          Toast.show({
            type: 'error',
            text1: 'Instagram share failed',
            text2: 'Could not open Instagram share.',
          });
        }
      } else if (target === 'tiktok') {
        const opened = await openTikTokShare();
        if (!opened) {
          Toast.show({
            type: 'error',
            text1: 'TikTok share failed',
            text2: 'Could not open TikTok share.',
          });
        }
      } else if (target === 'facebook') {
        const opened = await openFacebookShare();
        if (!opened) {
          Toast.show({
            type: 'error',
            text1: 'Facebook share failed',
            text2: 'Could not open Facebook share.',
          });
        }
      } else if (target === 'youtube') {
        const opened = await openYouTubeShare();
        if (!opened) {
          Toast.show({
            type: 'error',
            text1: 'YouTube share failed',
            text2: 'Could not open YouTube share.',
          });
        }
      } else if (target === 'snapchat' || target === 'spotify') {
        const { message, mediaUrl } = buildSharePayload();
        await Share.share({
          message,
          url: mediaUrl || undefined,
        });
      }
      setShowShareModal(false);
    } catch {
      // errors handled above or by hooks
    }
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
              onPress={() => setShowShareModal(true)}
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
                  Share UClip
                </Text>
                <TouchableOpacity
                  onPress={() => handleShareTarget('feed')}
                  className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                >
                  <Text className='text-black dark:text-white font-roboto-medium'>
                    Share to Feed
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleShareTarget('story')}
                  className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                >
                  <Text className='text-black dark:text-white font-roboto-medium'>
                    Share to Story
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleShareTarget('facebook')}
                  className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                >
                  <Text className='text-black dark:text-white font-roboto-medium'>
                    Share to Facebook
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleShareTarget('instagram')}
                  className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                >
                  <Text className='text-black dark:text-white font-roboto-medium'>
                    Share to Instagram
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleShareTarget('twitter')}
                  className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                >
                  <Text className='text-black dark:text-white font-roboto-medium'>
                    Share to Twitter
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleShareTarget('tiktok')}
                  className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                >
                  <Text className='text-black dark:text-white font-roboto-medium'>
                    Share to TikTok
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleShareTarget('youtube')}
                  className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                >
                  <Text className='text-black dark:text-white font-roboto-medium'>
                    Share to YouTube
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleShareTarget('snapchat')}
                  className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                >
                  <Text className='text-black dark:text-white font-roboto-medium'>
                    Share to Snapchat
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleShareTarget('spotify')}
                  className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                >
                  <Text className='text-black dark:text-white font-roboto-medium'>
                    Share to Spotify
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleShareTarget('facebook_story')}
                  className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                >
                  <Text className='text-black dark:text-white font-roboto-medium'>
                    Share to Facebook Story
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleShareTarget('instagram_story')}
                  className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                >
                  <Text className='text-black dark:text-white font-roboto-medium'>
                    Share to Instagram Story
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
    setVisibleId(prev => (prev === firstVisible ? prev : firstVisible));
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
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={4}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
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




