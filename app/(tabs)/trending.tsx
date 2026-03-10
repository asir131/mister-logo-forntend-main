import PostCard from '@/components/card/PostCard';
import GradientBackground from '@/components/main/GradientBackground';
import { useGetMyPostsInfinite } from '@/hooks/app/post';
import { useGetTrendingPost } from '@/hooks/app/trending';
import {
  useCancelUblastOffer,
  useCheckoutUblastOffer,
  useGetActiveUblasts,
  useGetUblastOffers,
  useGetUblastEligibility,
  useShareUblast,
} from '@/hooks/app/ublast';
import { getShortErrorMessage } from '@/lib/error';
import { useTranslateTexts } from '@/hooks/app/translate';
import useAuthStore from '@/store/auth.store';
import useLanguageStore from '@/store/language.store';
import useThemeStore from '@/store/theme.store';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Modal,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useIsFocused } from '@react-navigation/native';

type TabType = 'manual' | 'active' | 'organic';
const TRENDING_PAGE_SIZE = 5;
const TRENDING_MAX_WINDOW_ITEMS = TRENDING_PAGE_SIZE * 3;

const toPlayableVideoUrl = (rawUrl?: string) => {
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

const TrendingScreen = () => {
  const { mode } = useThemeStore();
  const isLight = mode === 'light';
  const { user } = useAuthStore();
  const { language } = useLanguageStore();
  const isFocused = useIsFocused();
  const [selectedTab, setSelectedTab] = useState<TabType>('active');
  const [usernameSearch, setUsernameSearch] = useState('');
  const [querySearch, setQuerySearch] = useState('');
  const [visibleItemIds, setVisibleItemIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuerySearch(usernameSearch.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [usernameSearch]);
  const { data: t } = useTranslateTexts({
    texts: [
      'Trending',
      'Checking...',
      'Eligible',
      'Not Eligible',
      'Checking your eligibility status',
      'You can participate in trending posts',
      'Complete your profile to be eligible',
      'Blocked until',
      'Active',
      'Manual',
      'Organic',
      'No posts found',
      'Check back later for new content',
      'Share by',
      'Share Required',
      'Share to Feed first to enable likes and comments.',
      'Official UBlast',
      'Tap to play audio',
      'Share UBlast',
      'Share to Feed',
      'Share to Story',
      'Share to Facebook',
      'Share to Instagram',
      'Share to Twitter',
      'Share to TikTok',
      'Share to YouTube',
      'Share to Snapchat',
      'Share to Spotify',
      'Cancel',
      'Offer Payment Required',
      'Pay to unlock this UBlast before sharing.',
      'Status',
      'Price',
      'Checkout',
      'Create Payment Intent',
      'Cancel Offer',
      'Paid',
      'Pending',
      'Cancelled',
      'Expired',
      'Sharing...',
      'Pay',
      'You are currently blocked from submitting to UBlast until',
      'because you have not shared the most recent UBlast. Share the current UBlast to become eligible again.',
    ],
    targetLang: language,
    enabled: !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetTrendingPost(selectedTab, {
    enabled: !!user?.token && selectedTab !== 'active',
    search: querySearch,
  });

  const {
    data: activeData,
    isLoading: isActiveLoading,
    refetch: refetchActive,
    fetchNextPage: fetchNextActive,
    hasNextPage: hasNextActive,
    isFetchingNextPage: isFetchingNextActive,
  } = useGetActiveUblasts({
    enabled: !!user?.token && selectedTab === 'active',
    limit: TRENDING_PAGE_SIZE,
    search: querySearch,
  });

  const {
    data: eligibilityData,
    isLoading: isEligibilityLoading,
    refetch: refetchEligibility,
  } = useGetUblastEligibility({ enabled: !!user?.token });
  const { data: myPostsData } = useGetMyPostsInfinite({
    enabled: !!user?.token && selectedTab === 'active',
    limit: 20,
  });

  const {
    data: offersData,
    refetch: refetchOffers,
  } = useGetUblastOffers({
    enabled: !!user?.token && selectedTab === 'active',
    fetchAll: true,
    limit: 50,
    maxPages: 20,
  });

  const [isEligible, setIsEligible] = useState(true);

  const getBlockedUntilText = (blockedUntil?: string | null) => {
    if (!blockedUntil) return '';
    const date = new Date(blockedUntil);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
  };

  const getNotEligibleMessage = (blockedUntil?: string | null) => {
    const blockedUntilText = getBlockedUntilText(blockedUntil);
    if (blockedUntilText) {
      return `${tx(42, 'You are currently blocked from submitting to UBlast until')} ${blockedUntilText} ${tx(43, 'because you have not shared the most recent UBlast. Share the current UBlast to become eligible again.')}`;
    }
    return tx(6, 'Complete your profile to be eligible');
  };

  useEffect(() => {
    if (typeof (eligibilityData as any)?.eligible === 'boolean') {
      setIsEligible((eligibilityData as any).eligible);
    }
  }, [eligibilityData]);

  useEffect(() => {
    if (!isFocused || selectedTab !== 'active') return;
    refetchOffers();
  }, [isFocused, selectedTab, refetchOffers]);

  const trendingData = useMemo(() => {
    const pages = data?.pages || [];
    // Only process the most recent pages to keep list compute cheap.
    const recentPages = pages.slice(-4);
    return recentPages.flatMap((page: any) => page?.[selectedTab] || []);
  }, [data, selectedTab]);
  const activeUblastsRaw = useMemo(
    () => {
      const pages = activeData?.pages || [];
      const recentPages = pages.slice(-4);
      return recentPages.flatMap((page: any) => page?.ublasts || []);
    },
    [activeData]
  );
  const activeUblasts = useMemo(() => {
    const seen = new Set<string>();
    const deduped = activeUblastsRaw.filter((item: any) => {
      const id = String(item?._id || '');
      if (!id) return false;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    return deduped.slice(-TRENDING_MAX_WINDOW_ITEMS);
  }, [activeUblastsRaw]);
  const myPosts = useMemo(
    () => myPostsData?.pages?.flatMap((page: any) => page?.posts || []) || [],
    [myPostsData]
  );

  const sharedByUblastId = useMemo(() => {
    const map = new Map<string, any>();
    myPosts.forEach((post: any) => {
      if (post?.ublastId) {
        map.set(String(post.ublastId), post);
      }
    });
    return map;
  }, [myPosts]);


  const availableUblastsToShare = useMemo(
    () => activeUblasts.filter((item: any) => !item?.viewerHasShared).length,
    [activeUblasts]
  );  const offersByUblastId = useMemo(() => {
    const map = new Map<string, any>();
    const offers = offersData?.offers || [];
    offers.forEach((offer: any) => {
      const ublastId =
        offer?.ublastId?._id ||
        offer?.ublastId?.id ||
        offer?.ublastId ||
        null;
      if (!ublastId) return;
      map.set(String(ublastId), offer);
    });
    return map;
  }, [offersData]);

  const filteredPosts = useMemo(() => {
    if (!Array.isArray(trendingData)) return [];
    const seen = new Set<string>();
    const deduped = trendingData
      .filter((item: any) => item)
      .map((item: any) => {
        const post = item.post || item;
        return {
          ...post,
          author: post.author || {
            id: post.userId || '',
            email: '',
            name: '',
          },
          profile: post.profile || {
            displayName: '',
            profileImageUrl: '',
            role: '',
            username: '',
          },
          commentCount: post.commentCount || 0,
          likeCount: post.likeCount || 0,
          viewerHasLiked: post.viewerHasLiked || false,
          viewerIsFollowing: post.viewerIsFollowing || false,
        };
      })
      .filter((post: any) => {
        const id = String(post?._id || '');
        if (!id) return false;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    return deduped.slice(-TRENDING_MAX_WINDOW_ITEMS);
  }, [trendingData]);

  const normalizedSearch = usernameSearch.trim().toLowerCase();

  const isSearchMatch = useCallback((post: any) => {
    if (!normalizedSearch) return true;
    const username = String(post?.profile?.username || '').toLowerCase();
    const displayName = String(
      post?.profile?.displayName || post?.author?.name || ''
    ).toLowerCase();
    const postText = [post?.description, post?.content, post?.text]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return (
      username.includes(normalizedSearch) ||
      displayName.includes(normalizedSearch) ||
      postText.includes(normalizedSearch)
    );
  }, [normalizedSearch]);

  const searchedFilteredPosts = useMemo(() => {
    if (!normalizedSearch) return filteredPosts;
    return filteredPosts.filter((post: any) => isSearchMatch(post));
  }, [filteredPosts, normalizedSearch, isSearchMatch]);

  const searchedActiveUblasts = useMemo(() => {
    if (!normalizedSearch) return activeUblasts;
    return activeUblasts.filter((item: any) => {
      const sharedPost = sharedByUblastId.get(String(item?._id));
      const ublastTitle = String(item?.title || '').toLowerCase();
      const ublastContent = String(item?.content || '').toLowerCase();

      if (ublastTitle.includes(normalizedSearch) || ublastContent.includes(normalizedSearch)) return true;
      if (!sharedPost) return false;
      return isSearchMatch(sharedPost);
    });
  }, [activeUblasts, sharedByUblastId, normalizedSearch, isSearchMatch]);

  const endReachedLockedRef = useRef(false);

  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 55,
    minimumViewTime: 120,
  });

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const nextIds = new Set<string>();

      viewableItems.forEach(viewable => {
        const id = String((viewable?.item as any)?._id || '');
        if (id) nextIds.add(id);
      });

      setVisibleItemIds(prevIds => {
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

  const renderHeader = () => (
    <View>
      <Text className='font-roboto-bold text-primary dark:text-white text-2xl text-center'>
        {tx(0, 'Trending')}
      </Text>

      {/* Eligibility Status Banner */}
      <View className='mx-5 mt-4'>
        <View
          className={`rounded-2xl p-4 flex-row items-center justify-between ${
            isEligible
              ? 'bg-green-500/20 border border-green-500/50'
              : 'bg-red-500/20 border border-red-500/50'
          }`}
        >
          <View className='flex-row items-center gap-3'>
            <View
              className={`w-10 h-10 rounded-full items-center justify-center ${
                isEligible ? 'bg-green-500/30' : 'bg-red-500/30'
              }`}
            >
              {isEligibilityLoading ? (
                <ActivityIndicator
                  size='small'
                  color={isLight ? 'black' : 'white'}
                />
              ) : (
                <Ionicons
                  name={isEligible ? 'checkmark-circle' : 'close-circle'}
                  size={24}
                  color={isEligible ? '#22c55e' : '#ef4444'}
                />
              )}
            </View>
            <View className='flex-1'>
              <Text className='font-roboto-bold text-primary dark:text-white text-base'>
                {isEligibilityLoading
                  ? tx(1, 'Checking...')
                  : isEligible
                    ? tx(2, 'Eligible')
                    : tx(3, 'Not Eligible')}
              </Text>
              <Text className='font-roboto-regular text-secondary dark:text-white/80 text-sm'>
                {isEligibilityLoading
                  ? tx(4, 'Checking your eligibility status')
                  : isEligible
                    ? tx(5, 'You can participate in trending posts')
                    : getNotEligibleMessage((eligibilityData as any)?.blockedUntil)}
              </Text>
              {!isEligibilityLoading && isEligible ? (
                <Text className='font-roboto-semibold text-green-600 dark:text-green-400 text-sm mt-1'>
                  {availableUblastsToShare > 0
                    ? `${availableUblastsToShare} new UBlasts available to share`
                    : 'No new UBlasts available to share'}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View className='flex-row justify-between items-center gap-3 mt-6 mx-5'>
        {(['manual', 'active', 'organic'] as TabType[]).map(tab => {
          const isTabActive = selectedTab === tab;
          const tabContainerClass = isTabActive
            ? 'flex-1 py-3 rounded-xl flex-row gap-2 items-center justify-center border bg-black border-black dark:bg-white dark:border-white'
            : 'flex-1 py-3 rounded-xl flex-row gap-2 items-center justify-center border bg-[#F0F2F5] border-black/10 dark:bg-[#FFFFFF0D] dark:border-[#FFFFFF1A]';
          const tabTextClass = isTabActive
            ? 'font-roboto-semibold text-sm text-white dark:text-black'
            : 'font-roboto-semibold text-sm text-primary dark:text-white';

          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setSelectedTab(tab)}
              className={tabContainerClass}
            >
              <Ionicons
                name={
                  tab === 'active'
                    ? 'flame'
                    : tab === 'manual'
                      ? 'trophy'
                      : 'leaf'
                }
                size={20}
                color={isTabActive ? (isLight ? 'white' : 'black') : isLight ? 'black' : 'white'}
              />
              <Text className={tabTextClass}>
                {tab === 'active'
                  ? tx(8, 'Active')
                  : tab === 'manual'
                    ? tx(9, 'Manual')
                    : tx(10, 'Organic')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search */}
      <View className='mx-5 mt-3'>
        <View className='flex-row items-center bg-[#F0F2F5] dark:bg-[#FFFFFF0D] border border-black/10 dark:border-[#FFFFFF1A] rounded-xl px-3'>
          <Ionicons
            name='search'
            size={18}
            color={isLight ? '#6B7280' : '#9CA3AF'}
          />
          <TextInput
            value={usernameSearch}
            onChangeText={setUsernameSearch}
            placeholder='Search by username and post content text'
            placeholderTextColor={isLight ? '#9CA3AF' : '#6B7280'}
            autoCapitalize='none'
            autoCorrect={false}
            className='flex-1 ml-2 py-3 text-black dark:text-white font-roboto-regular'
          />
          {!!usernameSearch && (
            <TouchableOpacity onPress={() => setUsernameSearch('')}>
              <Ionicons
                name='close-circle'
                size={18}
                color={isLight ? '#6B7280' : '#9CA3AF'}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const UblastCard = ({
    item,
    isVisible,
    isFocused,
  }: {
    item: any;
    isVisible: boolean;
    isFocused: boolean;
  }) => {
    type ExternalShareTarget =
      | 'facebook'
      | 'instagram'
      | 'twitter'
      | 'tiktok'
      | 'youtube'
      | 'snapchat'
      | 'spotify';
    const { mutateAsync: shareUblast, isPending: isSharePending } = useShareUblast();
    const { mutateAsync: checkoutOffer, isPending: isCheckoutPending } = useCheckoutUblastOffer();
    const { mutateAsync: cancelOffer, isPending: isCancelPending } = useCancelUblastOffer();
    const [isShareBusy, setIsShareBusy] = useState(false);
    const [showShareTypeModal, setShowShareTypeModal] = useState(false);
    const hasShared = Boolean(item?.viewerHasShared);
    const dueAt = item?.dueAt ? new Date(item.dueAt) : null;
    const currentOffer = offersByUblastId.get(String(item?._id));
    const isOfferRequired = item?.rewardType === 'offer';
    const offerStatusRaw = String(currentOffer?.status || 'pending').toLowerCase();
    const isOfferPaid = offerStatusRaw === 'paid';
    const canShare = !isOfferRequired || isOfferPaid;
    const showOfferActionButtons =
      isOfferRequired && !isOfferPaid && offerStatusRaw === 'pending';
    const isBusy =
      isShareBusy || isSharePending || isCheckoutPending || isCancelPending;
    const offerPriceText =
      typeof currentOffer?.priceCents === 'number'
        ? `${(currentOffer.priceCents / 100).toFixed(2)} ${String(
            currentOffer?.currency || 'usd'
          ).toUpperCase()}`
        : '--';
    const statusLabel =
      offerStatusRaw === 'paid'
        ? tx(36, 'Paid')
        : offerStatusRaw === 'cancelled'
          ? tx(38, 'Cancelled')
          : offerStatusRaw === 'expired'
            ? tx(39, 'Expired')
            : tx(37, 'Pending');
    const isLightTheme = isLight;
    const handleDisabledAction = () => {
      Toast.show({
        type: 'info',
        text1: tx(14, 'Share Required'),
        text2: tx(15, 'Share to Feed first to enable likes and comments.'),
      });
    };

    const mediaUrlRaw = String(item?.mediaUrl || '').trim();
    const mediaType = item?.mediaType;
    const shouldUsePlayer = mediaType === 'video' || mediaType === 'audio';
    const mediaPlaybackUrl =
      mediaType === 'video' ? toPlayableVideoUrl(mediaUrlRaw) : mediaUrlRaw;
    const player = useVideoPlayer(shouldUsePlayer ? mediaPlaybackUrl : '', p => {
      p.loop = true;
    });

    useEffect(() => {
      if (mediaType !== 'video' && mediaType !== 'audio') return;
      if (isVisible && isFocused) {
      if (mediaType === 'video') player.play();
      } else {
        player.pause();
      }
    }, [isVisible, isFocused, mediaType, player]);

    const handleShare = async (shareType: 'feed' | 'story', external?: ExternalShareTarget) => {
      if (!item?._id) return;
      if (!canShare) {
        Toast.show({
          type: 'info',
          text1: tx(29, 'Offer Payment Required'),
          text2: tx(30, 'Pay to unlock this UBlast before sharing.'),
        });
        return;
      }
      setIsShareBusy(true);
      try {
        const eligibilitySnapshot = ((await refetchEligibility())?.data ?? eligibilityData) as any;
        if (eligibilitySnapshot?.eligible === false) {
          Toast.show({
            type: 'error',
            text1: tx(3, 'Not Eligible'),
            text2: getNotEligibleMessage(eligibilitySnapshot?.blockedUntil),
          });
          setShowShareTypeModal(false);
          return;
        }

        await shareUblast({ ublastId: item._id, shareType });
        if (external) {
          const label =
            external === 'facebook'
              ? 'Facebook'
              : external === 'instagram'
                ? 'Instagram'
                : external === 'twitter'
                  ? 'Twitter'
                  : external === 'tiktok'
                    ? 'TikTok'
                    : external === 'youtube'
                      ? 'YouTube'
                      : external === 'snapchat'
                        ? 'Snapchat'
                        : 'Spotify';
          Toast.show({
            type: 'info',
            text1: label,
            text2: `Shared to feed (${label} integration pending).`,
          });
        }
        setShowShareTypeModal(false);
      } catch (error: any) {
        const message = getShortErrorMessage(error, 'Share failed.');
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('payment required')) {
          Toast.show({
            type: 'info',
            text1: tx(29, 'Offer Payment Required'),
            text2: tx(30, 'Pay to unlock this UBlast before sharing.'),
          });
        } else if (lowerMessage.includes('not eligible') || lowerMessage.includes('blocked')) {
          Toast.show({
            type: 'error',
            text1: tx(3, 'Not Eligible'),
            text2: getNotEligibleMessage(eligibilitySnapshot?.blockedUntil),
          });
        }
      } finally {
        setIsShareBusy(false);
      }
    };

    const handleCheckout = async () => {
      if (!currentOffer?._id) return;
      try {
        const appRedirectUri = Linking.createURL('payment-return');
        const data = await checkoutOffer({
          offerId: currentOffer._id,
          appRedirectUri,
        });
        const checkoutUrl = data?.url || data?.data?.url;
        if (checkoutUrl) {
          const result = await WebBrowser.openAuthSessionAsync(
            checkoutUrl,
            appRedirectUri
          );
          if (result.type === 'success' && result.url) {
            const parsed = Linking.parse(result.url);
            const qp = parsed?.queryParams || {};
            const payment = Array.isArray(qp.payment) ? qp.payment[0] : qp.payment;
            if (payment === 'success') {
              Toast.show({
                type: 'success',
                text1: 'Payment Complete',
                text2: 'Offer payment completed successfully.',
              });
            } else if (payment === 'cancel') {
              Toast.show({
                type: 'info',
                text1: 'Payment Cancelled',
                text2: 'You cancelled the payment.',
              });
            }
          }
        }
        refetchOffers();
        refetchActive();
        setTimeout(() => {
          refetchOffers();
          refetchActive();
        }, 1200);
      } catch (error) {
        console.log('Checkout error:', error);
      }
    };

    const handleCancelOffer = async () => {
      if (!currentOffer?._id) return;
      try {
        await cancelOffer({ offerId: currentOffer._id });
        setShowShareTypeModal(false);
      } catch (error) {
        console.log('Cancel offer error:', error);
      }
    };

    return (
      <View className='bg-[#F0F2F5] dark:bg-[#FFFFFF0D] rounded-3xl mx-5 mt-4 overflow-hidden'>
        <View className='p-4 flex-row justify-between items-center'>
          <View className='flex-row gap-3'>
            <Image
              source={require('@/assets/images/logo.png')}
              style={{ width: 40, height: 40, borderRadius: 20 }}
              contentFit='cover'
            />
            <View>
              <Text className='font-roboto-semibold text-sm text-primary dark:text-white'>
                {item?.title || 'UBlast'}
              </Text>
              <Text className='font-roboto-regular text-sm text-secondary dark:text-white/80'>
                {tx(16, 'Official UBlast')}
              </Text>
            </View>
          </View>
        </View>

        {mediaType === 'image' && mediaUrlRaw ? (
          <Image
            source={{ uri: mediaUrlRaw }}
            style={{ width: '100%', height: 220 }}
            contentFit='cover'
          />
        ) : mediaType === 'video' && mediaPlaybackUrl ? (
          <VideoView
            style={{ width: '100%', height: 220 }}
            player={player}
            nativeControls={false}
            contentFit='cover'
          />
        ) : mediaType === 'audio' ? (
          <View className='h-[220px] items-center justify-center bg-black/10 dark:bg-white/5'>
            <TouchableOpacity
              className='bg-black/20 dark:bg-white/10 p-4 rounded-full'
              onPress={() => {
                if (player.playing) player.pause();
                else player.play();
              }}
            >
              <Ionicons
                name={player.playing ? 'pause' : 'play'}
                size={28}
                color={isLightTheme ? 'black' : 'white'}
              />
            </TouchableOpacity>
            <Text className='mt-3 text-black/70 dark:text-white/70'>
              {tx(17, 'Tap to play audio')}
            </Text>
          </View>
        ) : (
          <View className='h-[220px] items-center justify-center bg-black/10 dark:bg-white/5'>
            <Ionicons
              name={mediaType === 'audio' ? 'musical-notes' : 'play-circle'}
              size={48}
              color={isLightTheme ? 'black' : 'white'}
            />
          </View>
        )}

        <View className='p-3 flex-row justify-between items-center'>
          <View className='flex-row gap-4'>
            <TouchableOpacity onPress={handleDisabledAction}>
              <Ionicons
                name='heart-outline'
                size={26}
                color={isLightTheme ? 'black' : 'white'}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDisabledAction}>
              <Ionicons
                name='chatbubble-outline'
                size={24}
                color={isLightTheme ? 'black' : 'white'}
              />
            </TouchableOpacity>
            {showOfferActionButtons ? (
              <>
                <TouchableOpacity
                  onPress={handleCheckout}
                  className='py-1.5 px-3 rounded-lg bg-black/10 dark:bg-white/10'
                  disabled={isBusy || !currentOffer?._id}
                >
                  <Text className='text-black dark:text-white font-roboto-medium text-xs'>
                    {isCheckoutPending ? tx(40, 'Sharing...') : tx(41, 'Pay')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCancelOffer}
                  className='py-1.5 px-3 rounded-lg bg-black/10 dark:bg-white/10'
                  disabled={isBusy || !currentOffer?._id}
                >
                  <Text className='text-black dark:text-white font-roboto-medium text-xs'>
                    {isCancelPending ? tx(40, 'Sharing...') : tx(28, 'Cancel')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={async () => {
                  if (!item?._id) return;
                  const eligibilitySnapshot = ((await refetchEligibility())?.data ?? eligibilityData) as any;
                  if (eligibilitySnapshot?.eligible === false) {
                    Toast.show({
                      type: 'error',
                      text1: tx(3, 'Not Eligible'),
                      text2: getNotEligibleMessage(eligibilitySnapshot?.blockedUntil),
                    });
                    return;
                  }
                  setShowShareTypeModal(true);
                }}
                disabled={hasShared || isBusy || !canShare}
              >
                <Ionicons
                  name='share-social-outline'
                  size={24}
                  color={isLightTheme ? 'black' : 'white'}
                  style={{ opacity: hasShared || isBusy || !canShare ? 0.5 : 1 }}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View className='px-3 pb-3'>
          {!!item?.content && (
            <Text className='font-roboto-regular text-primary dark:text-white'>
              {item.content}
            </Text>
          )}

          {isOfferRequired && (
            <View className='mt-2.5'>
              <Text className='font-roboto-semibold text-sm text-secondary dark:text-white/80'>
                {tx(31, 'Status')}: {statusLabel}
              </Text>
              <Text className='font-roboto-semibold text-sm text-secondary dark:text-white/80 mt-1'>
                {tx(32, 'Price')}: {offerPriceText}
              </Text>
            </View>
          )}

          {dueAt && (
            <Text className='font-roboto-semibold text-sm text-secondary dark:text-white/80 mt-2.5'>
              {tx(13, 'Share by')} {dueAt.toLocaleString()}
            </Text>
          )}
        </View>

        <Modal
          visible={showShareTypeModal}
          transparent
          animationType='fade'
          onRequestClose={() => setShowShareTypeModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowShareTypeModal(false)}>
            <View className='flex-1 bg-black/50 justify-end'>
              <TouchableWithoutFeedback>
                <View className='bg-white dark:bg-[#111111] p-6 rounded-t-3xl'>
                  <Text className='text-black dark:text-white font-roboto-semibold text-lg mb-4'>
                    {tx(18, 'Share UBlast')}
                  </Text>
                  <ScrollView
                    style={{ maxHeight: 380 }}
                    showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='always'
            keyboardDismissMode='none'
                  >
                    <TouchableOpacity
                      onPress={() => handleShare('feed')}
                      className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                      disabled={isBusy}
                    >
                      <Text className='text-black dark:text-white font-roboto-medium'>
                        {isShareBusy || isSharePending ? tx(40, 'Sharing...') : tx(19, 'Share to Feed')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleShare('story')}
                      className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                      disabled={isBusy}
                    >
                      <Text className='text-black dark:text-white font-roboto-medium'>
                        {isShareBusy || isSharePending ? tx(40, 'Sharing...') : tx(20, 'Share to Story')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleShare('feed', 'facebook')}
                      className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                      disabled={isBusy}
                    >
                      <Text className='text-black dark:text-white font-roboto-medium'>
                        {isShareBusy || isSharePending ? tx(40, 'Sharing...') : tx(21, 'Share to Facebook')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleShare('feed', 'instagram')}
                      className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                      disabled={isBusy}
                    >
                      <Text className='text-black dark:text-white font-roboto-medium'>
                        {isShareBusy || isSharePending ? tx(40, 'Sharing...') : tx(22, 'Share to Instagram')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleShare('feed', 'twitter')}
                      className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                      disabled={isBusy}
                    >
                      <Text className='text-black dark:text-white font-roboto-medium'>
                        {isShareBusy || isSharePending ? tx(40, 'Sharing...') : tx(23, 'Share to Twitter')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleShare('feed', 'tiktok')}
                      className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                      disabled={isBusy}
                    >
                      <Text className='text-black dark:text-white font-roboto-medium'>
                        {isShareBusy || isSharePending ? tx(40, 'Sharing...') : tx(24, 'Share to TikTok')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleShare('feed', 'youtube')}
                      className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                      disabled={isBusy}
                    >
                      <Text className='text-black dark:text-white font-roboto-medium'>
                        {isShareBusy || isSharePending ? tx(40, 'Sharing...') : tx(25, 'Share to YouTube')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleShare('feed', 'snapchat')}
                      className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-3'
                      disabled={isBusy}
                    >
                      <Text className='text-black dark:text-white font-roboto-medium'>
                        {isShareBusy || isSharePending ? tx(40, 'Sharing...') : tx(26, 'Share to Snapchat')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleShare('feed', 'spotify')}
                      className='py-3 px-4 rounded-xl bg-[#F0F2F5] dark:bg-white/10 mb-1'
                      disabled={isBusy}
                    >
                      <Text className='text-black dark:text-white font-roboto-medium'>
                        {isShareBusy || isSharePending ? tx(40, 'Sharing...') : tx(27, 'Share to Spotify')}
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                  <TouchableOpacity
                    onPress={() => setShowShareTypeModal(false)}
                    className='mt-2 py-3 px-4 rounded-xl border border-black/10 dark:border-white/10'
                  >
                    <Text className='text-center text-black dark:text-white font-roboto-medium'>
                      {tx(28, 'Cancel')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    );
  };

  const hasTrendingPages = (data?.pages?.length ?? 0) > 0;
  const hasActivePages = (activeData?.pages?.length ?? 0) > 0;
  const showInitialLoader =
    !querySearch &&
    (selectedTab === 'active'
      ? isActiveLoading && !hasActivePages
      : isLoading && !hasTrendingPages);

  if (showInitialLoader) {
    return (
      <GradientBackground>
        <SafeAreaView
          className='flex-1 mt-2.5'
          edges={['top', 'left', 'right']}
        >
          {renderHeader()}
          <View className='flex-1 justify-center items-center'>
            <ActivityIndicator
              size='large'
              color={isLight ? 'black' : 'white'}
            />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView className='flex-1 mt-2.5' edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {renderHeader()}
          <FlatList
            data={selectedTab === 'active' ? searchedActiveUblasts : searchedFilteredPosts}
            renderItem={({ item }) => {
              const visibleNow = isFocused && visibleItemIds.has(String(item?._id || ''));
              if (selectedTab === 'active') {
                const sharedPost = sharedByUblastId.get(String(item?._id));
                if (sharedPost) {
                  return (
                    <PostCard
                      post={sharedPost}
                      currentUserId={user?.id}
                      className='mt-4 mx-5'
                      isVisible={visibleNow}
                      disableShare={
                        !isEligible &&
                        (Boolean((sharedPost as any)?.ublastId) ||
                          String((sharedPost as any)?.postType || '').toLowerCase() === 'ublast')
                      }
                      shareDisabledMessage={getNotEligibleMessage((eligibilityData as any)?.blockedUntil)}
                    />
                  );
                }
                return (
                  <UblastCard
                    item={item}
                    isVisible={visibleNow}
                    isFocused={isFocused}
                  />
                );
              }
              return (
                <PostCard
                  post={item}
                  currentUserId={user?.id}
                  className='mt-4 mx-5'
                  isVisible={visibleNow}
                  disableShare={
                    !isEligible &&
                    (Boolean((item as any)?.ublastId) ||
                      String((item as any)?.postType || '').toLowerCase() === 'ublast')
                  }
                  shareDisabledMessage={getNotEligibleMessage((eligibilityData as any)?.blockedUntil)}
                />
              );
            }}
            keyExtractor={(item: any, index: number) =>
              item?._id ? String(item._id) : `trending-${index}`
            }
            contentContainerStyle={{ paddingBottom: 100 }}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfigRef.current}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='always'
            keyboardDismissMode='none'
            initialNumToRender={3}
            maxToRenderPerBatch={2}
            updateCellsBatchingPeriod={100}
            windowSize={3}
            removeClippedSubviews={true}
            refreshing={usernameSearch.trim().length > 0 ? false : selectedTab === 'active' ? isActiveLoading : isRefetching}
            onRefresh={() => {
              if (selectedTab === 'active') {
                refetchActive();
              } else {
                refetch();
              }
            }}
            onEndReached={() => {
              if (endReachedLockedRef.current) return;
              endReachedLockedRef.current = true;
              if (selectedTab === 'active') {
                if (hasNextActive && !isFetchingNextActive) {
                  fetchNextActive();
                }
                return;
              }
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.25}
            onMomentumScrollBegin={() => {
              endReachedLockedRef.current = false;
            }}
            ListEmptyComponent={
              <View className='mt-10 items-center mx-6'>
                <Ionicons name='file-tray-outline' size={48} color='#666' />
                <Text className='text-secondary dark:text-white/80 text-center mt-4 font-roboto-regular'>
                  {tx(11, 'No posts found')}
                </Text>
                <Text className='text-secondary dark:text-white/80/60 text-center mt-2 font-roboto-regular text-sm'>
                  {tx(12, 'Check back later for new content')}
                </Text>
              </View>
            }
            ListFooterComponent={
              (selectedTab === 'active'
                ? isFetchingNextActive
                : isFetchingNextPage) ? (
                <View className='py-4 items-center'>
                  <ActivityIndicator size='small' color={isLight ? 'black' : 'white'} />
                </View>
              ) : (
                <View className='h-8' />
              )
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
};

export default TrendingScreen;