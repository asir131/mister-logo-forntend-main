import {
  useDeleteComment,
  useUserCreateComment,
  useUserFollow,
  useUserGetComment,
  useUserLike,
  useUserUnFollow,
  useUserUnLike,
} from '@/hooks/app/home';
import {
  useCancelScheduledPost,
  useDeletePost,
  useSavePost,
  useSharePost,
  useUnsavePost,
} from '@/hooks/app/post';
import { useCreateUCuts } from '@/hooks/app/ucuts';
import api, { SOCIAL_AUTH_BASE_URL } from '@/api/axiosInstance';
import { useTranslateTexts } from '@/hooks/app/translate';
import { useGetMyProfile } from '@/hooks/app/profile';
import useLanguageStore from '@/store/language.store';
import useThemeStore from '@/store/theme.store';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

// Define the Post interface matching the one in home.tsx
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

interface Post {
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
  scheduledFor?: string; // Add scheduledFor property
  shareToFacebook?: boolean;
  shareToInstagram?: boolean;
  dueAt?: string;
}

const PostCard = ({
  className,
  img,
  post,
  currentUserId,
  isSavedScreen = false,
  isScheduled = false,
  showOwnerActions = false, // Only show Edit/Delete on Profile screen
  hideFollowButton = false, // Hide follow button for UBlast submissions
  hideActions = false, // Hide like/comment/share/bookmark actions
  isVisible, // Optional: control auto play/pause for video
  officeVariant = false,
  disableShare = false,
  shareDisabledMessage,
}: {
  className?: string;
  img?: any;
  post?: Post;
  currentUserId?: string;
  isSavedScreen?: boolean;
  isScheduled?: boolean;
  showOwnerActions?: boolean;
  hideFollowButton?: boolean;
  hideActions?: boolean;
  isVisible?: boolean;
  officeVariant?: boolean;
  disableShare?: boolean;
  shareDisabledMessage?: string;
}) => {
  const [isFollowing, setIsFollowing] = useState(
    post?.viewerIsFollowing || false
  );

  const [isLiked, setIsLiked] = useState(post?.viewerHasLiked || false);
  const [likeCount, setLikeCount] = useState(post?.likeCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  const {
    data: commentData,
    fetchNextPage: fetchNextComments,
    hasNextPage: hasNextComments,
    isFetchingNextPage: isFetchingNextComments,
  } = useUserGetComment(post?._id || '', { limit: 5 });
  const { mutate: addComment } = useUserCreateComment();
  const { mutate: deleteComment } = useDeleteComment();

  // Video player setup
  const player = useVideoPlayer(post?.mediaUrl || '', player => {
    player.loop = true;
  });

  const { mutate: followUser } = useUserFollow();
  const { mutate: unfollowUser } = useUserUnFollow();
  const { mutate: likeUser } = useUserLike();
  const { mutate: unLikeUser } = useUserUnLike();
  const { mutate: savePost } = useSavePost();
  const { mutate: unsavePost } = useUnsavePost();
  const { mutate: deletePost } = useDeletePost();
  const { mutate: cancelScheduledPost } = useCancelScheduledPost();
  const { mutate: sharePost } = useSharePost();
  const { mutateAsync: createUcut } = useCreateUCuts();
  const { data: profileData } = useGetMyProfile();
  const { language: storedLanguage } = useLanguageStore();

  const [isBookmarked, setIsBookmarked] = useState(
    // @ts-ignore
    post?.viewerHasBookmarked || false
  );
  const { mode } = useThemeStore();
  const iconColor = mode === 'light' ? 'black' : 'white';

  useEffect(() => {
    if (post) {
      setIsFollowing(post.viewerIsFollowing);
      setIsLiked(post.viewerHasLiked);
      setLikeCount(post.likeCount);
      // @ts-ignore
      setIsBookmarked(post.viewerHasBookmarked || false);
    }
  }, [
    post?.viewerIsFollowing,
    post?.viewerHasLiked,
    post?.likeCount,
    // @ts-ignore
    post?.viewerHasBookmarked,
  ]);

  useEffect(() => {
    if (isVisible === undefined) return;
    if (post?.mediaType === 'video') {
      if (isVisible) {
        player.play();
      } else {
        player.pause();
      }
      return;
    }
    if (post?.mediaType === 'audio' && !isVisible) {
      player.pause();
    }
  }, [isVisible, post?.mediaType, player]);

  const handleLikeToggle = () => {
    if (!post?._id) return;

    if (isLiked) {
      unLikeUser(post._id);
      setIsLiked(false);
      setLikeCount(prev => Math.max(0, prev - 1));
    } else {
      likeUser({ postId: post._id });
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
    }
  };

  const handleFollowToggle = () => {
    if (!post?.author.id) return;

    if (isFollowing) {
      unfollowUser(post.author.id);
      setIsFollowing(prev => !prev);
    } else {
      followUser({ userId: post.author.id });
      setIsFollowing(prev => !prev);
    }
  };

  const handleBookmarkToggle = () => {
    if (!post?._id) return;

    if (isSavedScreen) {
      // On saved screen, only allowed to unsave (delete)
      unsavePost(post._id);
      setIsBookmarked(false);
    } else {
      // On home screen, only allowed to save
      if (!isBookmarked) {
        savePost(post._id);
        setIsBookmarked(true);
      } else {
        Toast.show({
          type: 'info',
          text1: uiTexts(8, 'Post Saved'),
          text2: uiTexts(9, 'This post is already in your saved collection.'),
        });
      }
    }
  };

  const handlePostComment = () => {
    if (!commentText.trim() || !post?._id) return;
    addComment({ postId: post._id, text: commentText });
    setCommentText('');
  };

  const handleDeleteComment = (commentId: string) => {
    if (!post?._id) return;
    deleteComment({ commentId, postId: post._id });
  };

  const handleOpenCommentUserProfile = (comment: any) => {
    const commentUserId = String(
      comment?.user?.id || comment?.user?._id || comment?.userId || ''
    );
    if (!commentUserId) return;

    if (currentUserId && String(currentUserId) === commentUserId) {
      router.push('/(tabs)/profile');
      return;
    }

    router.push({
      pathname: '/screens/profile/other-profile',
      params: { id: commentUserId },
    });
  };

  const handleDeletePost = () => {
    if (!post?._id) return;
    // Show confirmation dialog before deleting
    Alert.alert(
      uiTexts(10, 'Delete Post'),
      uiTexts(11, 'Are you sure you want to delete this post?'),
      [
        { text: uiTexts(6, 'Cancel'), style: 'cancel' },
        {
          text: uiTexts(2, 'Delete'),
          style: 'destructive',
          onPress: () => deletePost(post._id),
        },
      ]
    );
  };

  const handleCancelScheduled = () => {
    if (!post?._id) return;
    Alert.alert(
      uiTexts(12, 'Cancel Scheduled Post'),
      uiTexts(13, 'Are you sure you want to cancel this scheduled post?'),
      [
        { text: uiTexts(14, 'No'), style: 'cancel' },
        {
          text: uiTexts(15, 'Yes, Cancel'),
          style: 'destructive',
          onPress: () => cancelScheduledPost(post._id),
        },
      ]
    );
  };

  const handleSharePost = () => {
    if (!post?._id) return;
    if (disableShare) {
      Toast.show({
        type: 'error',
        text1: 'Share Unavailable',
        text2: shareDisabledMessage || 'You are not eligible to share UBlast now',
      });
      return;
    }
    setShowShareModal(true);
  };

  const buildPublicShareUrl = () => {
    if (!post?._id) return '';
    const base = SOCIAL_AUTH_BASE_URL?.replace(/\/$/, '') || '';
    return base ? `${base}/share/${post._id}` : '';
  };

  const buildSharePayload = () => {
    const description = post?.description?.trim() || '';
    const mediaUrl = post?.mediaUrl?.trim() || '';
    const shareUrl = buildPublicShareUrl();
    const message = [description, shareUrl || mediaUrl].filter(Boolean).join('\n');
    return { description, mediaUrl, shareUrl, message };
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
    const mediaType = post?.mediaType;
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
          const ext = post?.mediaType === 'video' ? 'mp4' : 'jpg';
          const mimeType = post?.mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
          const localFile = `${FileSystem.cacheDirectory}instagram-share-${post?._id || Date.now()}.${ext}`;

          await FileSystem.downloadAsync(mediaUrl, localFile);

          await Sharing.shareAsync(localFile, {
            dialogTitle: 'Share to Instagram',
            mimeType,
            UTI: post?.mediaType === 'video' ? 'public.movie' : 'public.image',
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
    const { description, mediaUrl, shareUrl, message } = buildSharePayload();

    try {
      const tweetText = description || message || '';
      const targetUrl = shareUrl || mediaUrl;
      const canOpenTwitterApp =
        (await Linking.canOpenURL('twitter://')) ||
        (await Linking.canOpenURL('x://'));

      if (canOpenTwitterApp) {
        const appMessage = [tweetText, targetUrl].filter(Boolean).join(' ');
        const appUrl = `twitter://post?message=${encodeURIComponent(appMessage)}`;
        await Linking.openURL(appUrl);
        return true;
      }

      const baseUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText
      )}`;
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

      const ext = post?.mediaType === 'video' ? 'mp4' : 'jpg';
      const mimeType = post?.mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
      const localFile = `${FileSystem.cacheDirectory}tiktok-share-${post?._id || Date.now()}.${ext}`;

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
            // try next scheme
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
    if (!post?._id) return false;

    const connectRedirect = ExpoLinking.createURL('auth/youtube');

    const tryUpload = async () => {
      const result = await api.post('/api/youtube/share', { postId: post._id });
      return result;
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

      if (!needsConnect) {
        return false;
      }
    }

    try {
      const authRes = await api.get(
        '/api/youtube/connect-url?clientRedirect=' + encodeURIComponent(connectRedirect)
      );
      const authUrl = String(authRes?.url || '');
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
    const mediaType = post?.mediaType;
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
        // fall through to scheme-based attempt
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
    if (!post?._id) return;
    try {
      if (target === 'feed') {
        sharePost({ postId: post._id });
      } else if (target === 'story') {
        await createUcut({
          text: post?.description || '',
          mediaUrl: post?.mediaUrl || undefined,
          mediaType: post?.mediaType || undefined,
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
        if (post?.mediaType === 'audio' || !post?.mediaUrl) {
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
      // Error toast is handled in corresponding hooks.
    }
  };

  // Use post data if provided, otherwise use defaults
  const authorName =
    post?.profile?.displayName || post?.author?.name || 'Maya Lin';
  const authorProfession = post?.profile?.role || 'Painter';
  const authorAvatar =
    post?.profile?.profileImageUrl ||
    'https://thelightcommittee.com/wp-content/uploads/elementor/thumbs/studio-business-headshot-of-a-black-man-in-Los-Angeles-r42uipeyz48g590yz1bhrtos4flfu3q2tuzohhy7f4.jpg';
  const postText =
    post?.description ||
    'New abstract series exploring the \n intersection of light and shadow. What do you see? #AbstractArt #Minimalism #BlackAndWhite';
  const postImage = post?.mediaUrl || img;
  // Format timestamp if needed, or just use raw string for now
  const timestamp = post?.createdAt
    ? new Date(post.createdAt).toLocaleDateString()
    : '2h ago';

  const scheduledTime = post?.scheduledFor
    ? new Date(post.scheduledFor).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '';

  // Check if current user is the author
  const isOwner = currentUserId && post?.author?.id === currentUserId;

  const comments =
    commentData?.pages?.flatMap((page: any) => page?.comments || []) || [];
  // @ts-ignore
  const preferredLanguage =
    (profileData as any)?.profile?.preferredLanguage || storedLanguage;
  // @ts-ignore
  const autoTranslateEnabled =
    (profileData as any)?.profile?.autoTranslateEnabled === true;
  const uiLanguage = storedLanguage || preferredLanguage;

  const { data: translatedDesc } = useTranslateTexts({
    texts: [postText],
    targetLang: preferredLanguage,
    enabled: autoTranslateEnabled,
  });

  const { data: translatedComments } = useTranslateTexts({
    texts: comments.map((c: any) => c?.text || ''),
    targetLang: preferredLanguage,
    enabled: autoTranslateEnabled && showComments && comments.length > 0,
  });

  const { data: translatedUI } = useTranslateTexts({
    texts: [
      'Like',
      'Reply',
      'Delete',
      'No comments yet. Be the first to comment!',
      'Write a comment...',
      'Share Post',
      'Cancel',
      'Share',
      'Post Saved',
      'This post is already in your saved collection.',
      'Delete Post',
      'Are you sure you want to delete this post?',
      'Cancel Scheduled Post',
      'Are you sure you want to cancel this scheduled post?',
      'No',
      'Yes, Cancel',
      'Are you sure you want to share this post?',
      'Edit',
      'Unfollow',
      'Follow',
      'Audio Post',
      'Click to play/pause',
      'Scheduled:',
      'Anonymous',
      'Share to Facebook',
      'Share to Instagram',
      'Share to Feed',
      'Share to Story',
      'Share to Twitter',
      'Share to TikTok',
      'Share to YouTube',
      'Share to Snapchat',
      'Share to Spotify',
      'Share to Facebook Story',
      'Share to Instagram Story',
    ],
    targetLang: uiLanguage,
    enabled: !!uiLanguage && uiLanguage !== 'EN',
  });

  const uiTexts = (index: number, fallback: string) =>
    translatedUI?.translations?.[index] || fallback;

  const { data: translatedOffice } = useTranslateTexts({
    texts: ['UNAP Official', 'Share required:', 'Share window expired'],
    targetLang: uiLanguage,
    enabled: !!uiLanguage && uiLanguage !== 'EN',
  });

  const officeTexts = (index: number, fallback: string) =>
    translatedOffice?.translations?.[index] || fallback;

  const getShareRemaining = () => {
    const dueAt = post?.dueAt ? new Date(post.dueAt) : null;
    if (!dueAt || Number.isNaN(dueAt.getTime())) return null;

    const msLeft = dueAt.getTime() - Date.now();
    if (msLeft <= 0) {
      return { expired: true, text: officeTexts(2, 'Share window expired') };
    }

    const totalMinutes = Math.ceil(msLeft / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);

    return {
      expired: false,
      text: `${officeTexts(1, 'Share required:')} ${parts.join(' ')} remaining`,
    };
  };

  return (
    <View
      className={`bg-[#F0F2F5] dark:bg-[#FFFFFF0D] rounded-3xl ${className}`}
    >
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
                  {uiTexts(5, 'Share Post')}
                </Text>
                <ScrollView
                  style={{ maxHeight: 380 }}
                  showsVerticalScrollIndicator={false}
                >
                  <TouchableOpacity
                    onPress={() => handleShareTarget('feed')}
                    className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                  >
                    <Text className='text-black dark:text-white font-roboto-medium'>
                      {uiTexts(26, 'Share to Feed')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleShareTarget('story')}
                    className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                  >
                    <Text className='text-black dark:text-white font-roboto-medium'>
                      {uiTexts(27, 'Share to Story')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleShareTarget('facebook')}
                    className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                  >
                    <Text className='text-black dark:text-white font-roboto-medium'>
                      {uiTexts(24, 'Share to Facebook')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleShareTarget('instagram')}
                    className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                  >
                    <Text className='text-black dark:text-white font-roboto-medium'>
                      {uiTexts(25, 'Share to Instagram')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleShareTarget('twitter')}
                    className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                  >
                    <Text className='text-black dark:text-white font-roboto-medium'>
                      {uiTexts(28, 'Share to Twitter')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleShareTarget('tiktok')}
                    className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                  >
                    <Text className='text-black dark:text-white font-roboto-medium'>
                      {uiTexts(29, 'Share to TikTok')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleShareTarget('youtube')}
                    className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                  >
                    <Text className='text-black dark:text-white font-roboto-medium'>
                      {uiTexts(30, 'Share to YouTube')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleShareTarget('snapchat')}
                    className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                  >
                    <Text className='text-black dark:text-white font-roboto-medium'>
                      {uiTexts(31, 'Share to Snapchat')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleShareTarget('facebook_story')}
                    className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                  >
                    <Text className='text-black dark:text-white font-roboto-medium'>
                      {uiTexts(33, 'Share to Facebook Story')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleShareTarget('instagram_story')}
                    className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                  >
                    <Text className='text-black dark:text-white font-roboto-medium'>
                      {uiTexts(34, 'Share to Instagram Story')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleShareTarget('spotify')}
                    className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-1'
                  >
                    <Text className='text-black dark:text-white font-roboto-medium'>
                      {uiTexts(32, 'Share to Spotify')}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
                <TouchableOpacity
                  onPress={() => setShowShareModal(false)}
                  className='mt-4 py-3 px-4 rounded-xl border border-black/10 dark:border-white/10'
                >
                  <Text className='text-center text-black dark:text-white font-roboto-medium'>
                    {uiTexts(6, 'Cancel')}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* post header */}
      <View className='p-4 flex-row justify-between items-center'>
        <TouchableOpacity
          onPress={() => {
            if (isOwner) {
              router.push('/(tabs)/profile');
            } else {
              router.push({
                pathname: '/screens/profile/other-profile',
                params: { id: post?.author?.id },
              });
            }
          }}
          className='flex-row gap-3'
        >
          <Image
            source={authorAvatar}
            style={{ width: 40, height: 40, borderRadius: 100 }}
            contentFit='cover'
          />
          <View>
            {officeVariant ? (
              <>
                <View className='flex-row gap-2 items-center'>
                  <MaterialCommunityIcons
                    name='check-decagram'
                    size={18}
                    color={iconColor}
                  />
                  <Text className='font-roboto-semibold text-sm text-primary dark:text-white'>
                    {officeTexts(0, authorName)}
                  </Text>
                </View>
                <Text className='font-roboto-regular text-sm text-primary dark:text-white mt-2.5'>
                  {timestamp}
                </Text>
              </>
            ) : (
              <>
                <Text className='font-roboto-semibold text-sm text-primary dark:text-white'>
                  {authorName}
                </Text>
                {isScheduled ? (
                  <Text className='font-roboto-medium text-xs text-blue-400'>
                    {uiTexts(22, 'Scheduled:')} {scheduledTime}
                  </Text>
                ) : (
                  <Text className='font-roboto-regular text-sm text-secondary dark:text-white/80'>
                    {authorProfession}
                  </Text>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>

        {isScheduled ? (
          <View className='flex-row gap-2'>
            <TouchableOpacity
              className='py-1.5 px-3 rounded-full bg-[#F0F2F5] dark:bg-white/10 border border-black/20 dark:border-[#FFFFFF0D]'
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/create',
                  params: {
                    postId: post?._id,
                    description: post?.description,
                    mediaUrl: post?.mediaUrl,
                    mediaType: post?.mediaType,
                    scheduledFor: post?.scheduledFor,
                    shareToFacebook: post?.shareToFacebook ? 'true' : 'false',
                    shareToInstagram: post?.shareToInstagram ? 'true' : 'false',
                  },
                })
              }
            >
              <Text className='font-roboto-medium text-black dark:text-white text-xs'>
                {uiTexts(17, 'Edit')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className='py-1.5 px-3 rounded-full bg-red-500/20 border border-red-500/50'
              onPress={handleCancelScheduled}
            >
              <Text className='font-roboto-medium text-red-400 text-xs'>
                {uiTexts(6, 'Cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : isOwner && showOwnerActions ? (
          <View className='flex-row gap-2'>
            <TouchableOpacity
              className='py-1.5 px-3 rounded-full bg-[#F0F2F5] dark:bg-white/10 border border-black/20 dark:border-[#FFFFFF0D]'
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/create',
                  params: {
                    postId: post?._id,
                    description: post?.description,
                    mediaUrl: post?.mediaUrl,
                    mediaType: post?.mediaType,
                    shareToFacebook: post?.shareToFacebook ? 'true' : 'false',
                    shareToInstagram: post?.shareToInstagram ? 'true' : 'false',
                    isPublishedConfig: 'true', // Flag to indicate editing a published post
                  },
                })
              }
            >
              <Text className='font-roboto-medium text-black dark:text-white text-xs'>
                {uiTexts(17, 'Edit')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className='py-1.5 px-3 rounded-full bg-red-500/20 border border-red-500/50'
              onPress={handleDeletePost}
            >
              <Text className='font-roboto-medium text-red-400 text-xs'>
                {uiTexts(2, 'Delete')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : !isOwner && !hideFollowButton ? (
          <TouchableOpacity
            className={`py-2 px-6 rounded-full items-center justify-center ${isFollowing ? 'bg-transparent border border-secondary/30' : ''}`}
            onPress={handleFollowToggle}
          >
            <Text
              className={`font-roboto-semibold ${isFollowing ? 'text-secondary dark:text-white/80' : 'text-primary dark:text-white'}`}
            >
              {isFollowing ? uiTexts(18, 'Unfollow') : uiTexts(19, 'Follow')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {officeVariant && (
        <View className='flex-row items-center justify-center gap-4 pb-2.5'>
          <MaterialCommunityIcons
            name='clock-time-four-outline'
            size={24}
            color={iconColor}
          />
          <Text className='text-red-500 text-center'>
            {getShareRemaining()?.text || officeTexts(1, 'Share required:')}
          </Text>
        </View>
      )}

      {/* post media content  */}
      <View>
        {post?.mediaType === 'image' && postImage && (
          <Image
            source={postImage}
            style={{ width: '100%', height: 345 }}
            contentFit='cover'
          />
        )}

        {post?.mediaType === 'video' && post?.mediaUrl && (
          <VideoView
            style={{ width: '100%', height: 345 }}
            player={player}
            fullscreenOptions={{ enable: true }}
            allowsPictureInPicture
          />
        )}

        {post?.mediaType === 'audio' && post?.mediaUrl && (
          <View className='bg-[#F0F2F5] dark:bg-white/5 p-6 rounded-2xl mx-3 items-center flex-row gap-4'>
            <TouchableOpacity
              className='bg-primary/20 p-3 rounded-full'
              onPress={() => {
                if (player.playing) player.pause();
                else player.play();
              }}
            >
              <Ionicons
                name={player.playing ? 'pause' : 'play'}
                size={24}
                color={iconColor}
              />
            </TouchableOpacity>
            <View className='flex-1'>
              <Text className='text-black dark:text-white font-roboto-medium'>
                {uiTexts(20, 'Audio Post')}
              </Text>
              <Text className='text-secondary dark:text-white/80 text-xs'>
                {uiTexts(21, 'Click to play/pause')}
              </Text>
            </View>
            <Ionicons name='musical-note' size={24} color={iconColor} />
          </View>
        )}
      </View>

      {/* like comment share */}
      {!hideActions && (
        <View className='p-3 flex-row justify-between items-center'>
          <View className='flex-row gap-4'>
            <TouchableOpacity
              onPress={handleLikeToggle}
              className='flex-row items-center gap-1.5'
              disabled={isScheduled} // Disable interactions on scheduled posts
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={26}
                color={isLiked ? 'red' : iconColor}
                style={{ opacity: isScheduled ? 0.5 : 1 }}
              />
              {likeCount > 0 && (
                <Text className='text-black dark:text-white font-roboto-medium'>
                  {likeCount}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowComments(!showComments)}
              className='flex-row items-center gap-1.5'
              disabled={isScheduled}
            >
              <Ionicons
                name='chatbubble-outline'
                size={24}
                color={iconColor}
                style={{ opacity: isScheduled ? 0.5 : 1 }}
              />
              {post?.commentCount !== undefined && post.commentCount > 0 && (
                <Text className='text-black dark:text-white font-roboto-medium'>
                  {post.commentCount}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity disabled={isScheduled} onPress={handleSharePost}>
              <Ionicons
                name='share-social-outline'
                size={24}
                color={iconColor}
                style={{ opacity: isScheduled ? 0.5 : 1 }}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleBookmarkToggle} disabled={isScheduled}>
            <Ionicons
              name={
                isSavedScreen
                  ? 'trash-outline'
                  : isBookmarked
                    ? 'bookmark'
                    : 'bookmark-outline'
              }
              size={24}
              color={isSavedScreen ? '#FF4B4B' : iconColor}
              style={{ opacity: isScheduled ? 0.5 : 1 }}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* post description */}
      <View className='px-3 pb-3'>
        <Text className='font-roboto-regular text-primary dark:text-white'>
          {translatedDesc?.translations?.[0] || postText}
        </Text>
        <Text className='font-roboto-semibold text-sm text-secondary dark:text-white/80 mt-2.5'>
          {timestamp}
        </Text>
      </View>

      {/* expandable comment section */}
      {showComments && !isScheduled && !hideActions && (
        <View className='px-3 pb-4 border-t border-black/20 dark:border-white/10 pt-3'>
          {/* Comment Input */}
          <View className='flex-row items-center gap-2 mb-4'>
            <TextInput
              className='flex-1 bg-[#F0F2F5] dark:bg-white/10 text-black dark:text-white p-3 rounded-2xl font-roboto-regular'
              placeholder={uiTexts(4, 'Write a comment...')}
              placeholderTextColor='#999'
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity
              onPress={handlePostComment}
              className='bg-white p-2 rounded-2xl h-[35px] justify-center items-center'
              disabled={!commentText.trim()}
            >
              <Ionicons name='send' size={16} color='black' />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {comments.length > 0 ? (
            <ScrollView
              style={{ maxHeight: 260 }}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {comments.map((comment: any, index: number) => (
                <View
                  className='mb-4'
                  key={`${comment?._id || 'comment'}-${index}`}
                >
                  <View className='flex-row gap-2'>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleOpenCommentUserProfile(comment)}
                    >
                      <Image
                        source={
                          comment.profile?.profileImageUrl ||
                          comment.user?.profileImageUrl ||
                          'https://via.placeholder.com/40'
                        }
                        style={{ width: 32, height: 32, borderRadius: 100 }}
                      />
                    </TouchableOpacity>
                    <View className='flex-1'>
                      <View className='bg-[#F0F2F5] dark:bg-white/5 p-3 rounded-2xl'>
                        <Text className='text-primary dark:text-white text-sm font-roboto-semibold mb-1'>
                          {comment.profile?.displayName ||
                            comment.user?.name ||
                            uiTexts(23, 'Anonymous')}
                        </Text>
                        <Text className='text-primary dark:text-white text-sm font-roboto-regular'>
                          {translatedComments?.translations?.[index] ||
                            comment.text}
                        </Text>
                      </View>
                      <View className='flex-row gap-4 mt-1 px-2'>
                        <TouchableOpacity>
                          <Text className='text-secondary dark:text-white/80 text-xs font-roboto-medium'>
                            {uiTexts(0, 'Like')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity>
                          <Text className='text-secondary dark:text-white/80 text-xs font-roboto-medium'>
                            {uiTexts(1, 'Reply')}
                          </Text>
                        </TouchableOpacity>
                        {(comment.user?._id === currentUserId ||
                          comment.user?.id === currentUserId) && (
                          <TouchableOpacity
                            onPress={() => handleDeleteComment(comment._id)}
                          >
                            <Text className='text-red-400 text-xs font-roboto-medium'>
                              {uiTexts(2, 'Delete')}
                            </Text>
                          </TouchableOpacity>
                        )}
                        <Text className='text-secondary dark:text-white/80/50 text-xs font-roboto-regular ml-auto'>
                          {new Date(comment.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
              {hasNextComments && (
                <TouchableOpacity
                  className='self-center mb-1 mt-1'
                  disabled={isFetchingNextComments}
                  onPress={() => {
                    if (!isFetchingNextComments) fetchNextComments();
                  }}
                >
                  <Text className='text-secondary dark:text-white/80 text-xs font-roboto-medium'>
                    {isFetchingNextComments ? 'Loading...' : 'Load more'}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : (
            <View className='bg-[#F0F2F5] dark:bg-white/5 p-4 rounded-2xl items-center'>
              <Text className='text-secondary dark:text-white/80 text-sm font-roboto-regular italic'>
                {uiTexts(3, 'No comments yet. Be the first to comment!')}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default PostCard;


























