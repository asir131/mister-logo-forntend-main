import BackButton from '@/components/button/BackButton';
import PostCard from '@/components/card/PostCard';
import MediaPickers from '@/components/create-post/MediaPickers';
import MediaPreview from '@/components/create-post/MediaPreview';
import GradientBackground from '@/components/main/GradientBackground';
import {
  useGetUBlastPosts,
  useGetUblastEligibility,
  useSubmitUBlast,
  useUpdateUBlastPost,
} from '@/hooks/app/ublast';
import { useCreateResumableUpload, uploadFileToResumableSession } from '@/hooks/app/uploads';
import { useTranslateTexts } from '@/hooks/app/translate';
import { toProxyMediaUrl } from '@/lib/mediaProxy';
import useLanguageStore from '@/store/language.store';
import useThemeStore from '@/store/theme.store';
import AntDesign from '@expo/vector-icons/AntDesign';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const formatRemainingDuration = (ms: number) => {
  const safeMs = Math.max(0, ms);
  const totalMinutes = Math.ceil(safeMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(String(days) + 'd');
  if (hours > 0) parts.push(String(hours) + 'h');
  parts.push(String(minutes) + 'm');

  return parts.join(' ');
};

const UBlastSubmission = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const isEditMode = !!params.postId;
  const { mode } = useThemeStore();
  const isLight = mode === 'light';
  const { language } = useLanguageStore();
  const { data: t } = useTranslateTexts({
    texts: [
      'UBlast Submission',
      'Description',
      "What's on your mind?",
      'Schedule Post',
      'Schedule Date & Time',
      'Date',
      'Time',
      'Submit to UBlast',
      'Schedule Post',
      'Update Post',
      'Your UBlast Submissions',
      'Edit',
      'Eligibility Required',
      'Make sure you meet the eligibility requirements in the Trending tab before submitting.',
      'Scheduling...',
      'Submitting...',
      'Updating...',
      'Error',
      'Please select a media file (photo, video, or audio)',
      'Please add a description',
      'UBlast Blocked',
      'You cannot submit any UBlast content during the block period.',
      'Block ends in',
      'Blocked',
      'Submission is disabled while your UBlast block is active.',
    ],
    targetLang: language,
    enabled: !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;

  // Form states
  const [description, setDescription] = useState(
    (params.description as string) || ''
  );
  const [photo, setPhoto] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [audio, setAudio] = useState<string | null>(null);
  const [videoPlayerUri, setVideoPlayerUri] = useState<string | null>(null);
  const [videoSize, setVideoSize] = useState<number | null>(null);
  const [videoThumbnailUri, setVideoThumbnailUri] = useState<string | null>(null);
  const [isFacebook, setIsFacebook] = useState(
    params.shareToFacebook === 'true'
  );
  const [isInstagram, setIsInstagram] = useState(
    params.shareToInstagram === 'true'
  );

  // Scheduling states
  const [isScheduled, setIsScheduled] = useState(true);
  const [scheduledDateTime, setScheduledDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const { mutate: submitUBlast, isPending: isSubmitting } = useSubmitUBlast();
  const { mutate: updateUBlastPost, isPending: isUpdating } =
    useUpdateUBlastPost();
  const { mutateAsync: requestResumableSession } = useCreateResumableUpload();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const {
    data: ublastData,
    refetch: refetchUBlast,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetUBlastPosts();
  const { data: eligibilityData, isLoading: isEligibilityLoading } =
    useGetUblastEligibility();

  const submissions =
    ublastData?.pages?.flatMap((page: any) => page?.submissions || []) || [];

  const isLoading = isSubmitting || isUpdating;
  const BIG_VIDEO_BYTES = 50 * 1024 * 1024;
  const [nowMs, setNowMs] = useState(Date.now());

  const blockedUntilRaw = (eligibilityData as any)?.blockedUntil;
  const blockedUntilMs = blockedUntilRaw
    ? new Date(blockedUntilRaw).getTime()
    : null;

  const isBlockActive =
    (eligibilityData as any)?.eligible === false &&
    typeof blockedUntilMs === 'number' &&
    blockedUntilMs > nowMs;

  const blockRemainingText =
    isBlockActive && typeof blockedUntilMs === 'number'
      ? formatRemainingDuration(blockedUntilMs - nowMs)
      : '';

  const isSubmissionDisabled = isLoading || isEligibilityLoading || isBlockActive;

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isBlockActive) return;
    setShowDatePicker(false);
    setShowTimePicker(false);
  }, [isBlockActive]);



  useEffect(() => {
    if (isEditMode && params.mediaUrl && params.mediaType) {
      const type = params.mediaType as string;
      const url = toProxyMediaUrl(params.mediaUrl as string);
      if (type === 'image') {
        setPhoto(url);
      } else if (type === 'video') {
        setVideo(url);
        setVideoPlayerUri(url);
      } else if (type === 'audio') {
        setAudio(url);
      }
    }
  }, [isEditMode, params]);

  const handleSubmit = async () => {
    if (isBlockActive) {
      Alert.alert(
        tx(20, 'UBlast Blocked'),
        tx(22, 'Block ends in') + ' ' + blockRemainingText
      );
      return;
    }

    if (!photo && !video && !audio) {
      Alert.alert(
        tx(17, 'Error'),
        tx(18, 'Please select a media file (photo, video, or audio)')
      );
      return;
    }

    if (!description.trim()) {
      Alert.alert(tx(17, 'Error'), tx(19, 'Please add a description'));
      return;
    }

    // Validate scheduled time if scheduling is enabled
    if (!validateScheduledTime()) {
      return;
    }

    const isRemote = (uri: string) => uri.startsWith('http');

    const payload: any = {
      content: description,
      title: 'UBlast Post',
      proposedDate: scheduledDateTime.toISOString(),
    };

    if (photo && !isRemote(photo)) {
      const formData = new FormData();
      const filename = photo.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match?.[1]?.toLowerCase() || 'jpg';
      formData.append('media', {
        uri: photo,
        name: filename,
        type: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
      } as any);
      formData.append('content', description);
      formData.append('title', 'UBlast Post');
      formData.append('proposedDate', scheduledDateTime.toISOString());

      if (isEditMode) {
        updateUBlastPost(
          { postId: params.postId as string, formData },
          {
            onSuccess: () => {
              resetForm();
              refetchUBlast();
              router.back();
            },
          }
        );
      } else {
        submitUBlast(formData, {
          onSuccess: () => {
            resetForm();
            refetchUBlast();
          },
        });
      }
      return;
    }

    if (audio && !isRemote(audio)) {
      const formData = new FormData();
      const filename = audio.split('/').pop() || 'audio.mp3';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match?.[1]?.toLowerCase() || 'mp3';
      formData.append('media', {
        uri: audio,
        name: filename,
        type: `audio/${ext === 'wav' ? 'wav' : 'mpeg'}`,
      } as any);
      formData.append('content', description);
      formData.append('title', 'UBlast Post');
      formData.append('proposedDate', scheduledDateTime.toISOString());

      if (isEditMode) {
        updateUBlastPost(
          { postId: params.postId as string, formData },
          {
            onSuccess: () => {
              resetForm();
              refetchUBlast();
              router.back();
            },
          }
        );
      } else {
        submitUBlast(formData, {
          onSuccess: () => {
            resetForm();
            refetchUBlast();
          },
        });
      }
      return;
    }

    if (video && !isRemote(video)) {
      const filename = video.split('/').pop() || 'video.mp4';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match?.[1]?.toLowerCase() || 'mp4';
      const contentType = `video/${ext === 'mov' ? 'quicktime' : 'mp4'}`;
      const info: any = await FileSystem.getInfoAsync(video, { size: true } as any);
      const size = typeof info?.size === 'number' ? info.size : null;
      try {
        const session = await requestResumableSession({
          folder: 'unap/ublast-submissions',
          fileName: filename,
          contentType,
        });
        if (!session?.uploadUrl) {
          Alert.alert('Error', 'Could not start resumable upload.');
          return;
        }
        setUploadProgress(2);
        await uploadFileToResumableSession({
          uploadUrl: session.uploadUrl,
          fileUri: video,
          contentType: session.contentType || contentType,
          contentLength: size,
          onProgress: (percent) => setUploadProgress(percent),
        });
        setUploadProgress(96);
        payload.mediaUrl = session.publicUrl;
        payload.mediaType = 'video';
      } catch (err) {
        // Fallback to backend upload if resumable fails
        const formData = new FormData();
        formData.append('media', {
          uri: video,
          name: filename,
          type: contentType,
        } as any);
        formData.append('content', description);
        formData.append('title', 'UBlast Post');
        formData.append('proposedDate', scheduledDateTime.toISOString());

        if (isEditMode) {
          updateUBlastPost(
            { postId: params.postId as string, formData },
            {
              onSuccess: () => {
                resetForm();
                refetchUBlast();
                router.back();
              },
            }
          );
        } else {
          submitUBlast(formData, {
            onSuccess: () => {
              resetForm();
              refetchUBlast();
            },
          });
        }
        return;
      }
    }

    if (isEditMode) {
      updateUBlastPost(
        { postId: params.postId as string, formData: payload },
        {
          onSuccess: () => {
            resetForm();
            refetchUBlast();
            router.back();
          },
        }
      );
    } else {
      submitUBlast(payload, {
        onSuccess: () => {
          resetForm();
          refetchUBlast();
        },
      });
    }
    setUploadProgress(100);
    setTimeout(() => setUploadProgress(null), 500);
  };

  const resetForm = () => {
    setPhoto(null);
    setVideo(null);
    setVideoPlayerUri(null);
    setAudio(null);
    setDescription('');
    setIsFacebook(false);
    setIsInstagram(false);
    setUploadProgress(null);
    setVideoSize(null);
    setVideoThumbnailUri(null);

    // Reset scheduling states
    setIsScheduled(true);
    setScheduledDateTime(new Date());
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
      setVideo(null);
      setVideoPlayerUri(null);
      setAudio(null);
    }
  };

  const pickVideo = async () => {
    try {
      let pickedUri: string | null = null;

      // Prefer ImagePicker first for faster/stable Android local preview.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 1,
      });

      if (!result.canceled) {
        pickedUri = result.assets[0].uri;
      } else {
        // Fallback for cases where video comes from Files/Drive providers.
        const fallback = await DocumentPicker.getDocumentAsync({
          type: 'video/*',
          copyToCacheDirectory: true,
        });

        if (fallback.assets && fallback.assets.length > 0) {
          pickedUri = fallback.assets[0].uri;
        }
      }

      if (!pickedUri) return;

      setVideo(pickedUri);
      setVideoPlayerUri(pickedUri);
      const info: any = await FileSystem.getInfoAsync(pickedUri, { size: true } as any);
      const size = typeof info?.size === 'number' ? info.size : null;
      setVideoSize(size);
      if (size && size > BIG_VIDEO_BYTES) {
        try {
          const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(pickedUri, {
            time: 1000,
            quality: 0.5,
          });
          setVideoThumbnailUri(thumbUri);
        } catch (err) {
          console.log('[ublast] thumbnail error', err);
          setVideoThumbnailUri(null);
        }
      } else {
        setVideoThumbnailUri(null);
      }
      setPhoto(null);
      setAudio(null);
    } catch (error) {
      console.error('Error picking video:', error);
    }
  };

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (result.assets && result.assets.length > 0) {
        const audioUri = result.assets[0].uri;
        setAudio(audioUri);
        setPhoto(null);
        setVideo(null);
        setVideoPlayerUri(null);
      }
    } catch (error) {
      console.error('Error picking audio:', error);
    }
  };

  const handleEditPost = (post: any) => {
    router.push({
      pathname: '/screens/ublast/ublast-submission',
      params: {
        postId: post._id,
        description: post.description,
        mediaUrl: post.mediaUrl,
        mediaType: post.mediaType,
        shareToFacebook: post.shareToFacebook ? 'true' : 'false',
        shareToInstagram: post.shareToInstagram ? 'true' : 'false',
      },
    });
  };

  // Scheduling helper functions
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const validateScheduledTime = () => {
    if (scheduledDateTime <= new Date()) {
      Alert.alert('Error', 'Scheduled time must be in the future');
      return false;
    }

    return true;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      const newDate = new Date(scheduledDateTime);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setScheduledDateTime(newDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (selectedTime) {
      const newDate = new Date(scheduledDateTime);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setScheduledDateTime(newDate);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView className='flex-1' edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
        <View className='mt-3 flex-row items-center mx-6 justify-between'>
          <BackButton />
          <Text className='font-roboto-bold text-black dark:text-white text-2xl'>
            {tx(0, 'UBlast Submission')}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View className='border-b border-black/20 dark:border-[#FFFFFF0D] w-full mt-2'></View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24 }}
          showsVerticalScrollIndicator={false}
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
          {/* UBlast Submission Form */}
          <View className='bg-[#F0F2F5] dark:bg-[#FFFFFF0D] rounded-3xl p-6 border border-black/20 dark:border-[#FFFFFF0D] mb-6'>
            {/* Media Preview */}
            {photo ? (
              <View className='w-full h-[300px] justify-center items-center bg-black/10 dark:bg-[#FFFFFF0D] rounded-2xl mb-4 overflow-hidden relative'>
                <Image
                  source={{ uri: photo }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit='cover'
                  cachePolicy='none'
                />
              </View>
            ) : video && videoSize && videoSize > BIG_VIDEO_BYTES && videoThumbnailUri ? (
              <View className='w-full h-[300px] justify-center items-center bg-black/10 dark:bg-[#FFFFFF0D] rounded-2xl mb-4 overflow-hidden relative'>
                <Image
                  source={{ uri: videoThumbnailUri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit='cover'
                  cachePolicy='none'
                />
              </View>
            ) : video && videoSize && videoSize > BIG_VIDEO_BYTES ? (
              <View className='w-full h-[300px] justify-center items-center bg-black/10 dark:bg-[#FFFFFF0D] rounded-2xl mb-4 overflow-hidden relative'>
                <Text className='text-black dark:text-white text-sm'>
                  Large video selected (preview disabled).
                </Text>
              </View>
            ) : (
              <MediaPreview
                photo={photo}
                video={video}
                audio={audio}
              />
            )}

            {/* Description */}
            <View className='mt-4'>
              <Text className='text-black dark:text-white text-base font-medium mb-2'>
                {tx(1, 'Description')}
              </Text>
              <View className='bg-white dark:bg-[#FFFFFF0D] border border-black/10 dark:border-[#FFFFFF1A] rounded-2xl px-3 min-h-[50px]'>
                <TextInput
                  className='text-black dark:text-white text-base '
                  placeholder={tx(2, "What's on your mind?")}
                  placeholderTextColor='#9CA3AF'
                  multiline
                  editable={!isSubmissionDisabled}
                  value={description}
                  textAlignVertical='top'
                  onChangeText={setDescription}
                  style={{ textAlignVertical: 'top' }}
                />
              </View>
            </View>

            {/* Media Pickers */}
            <MediaPickers
              onPickPhoto={pickPhoto}
              onPickVideo={pickVideo}
              onPickAudio={pickAudio}
              disablePhoto={isSubmissionDisabled}
              disableVideo={isSubmissionDisabled}
              disableAudio={isSubmissionDisabled}
            />

            {/* Scheduling Options */}
            <View className='mt-4'>
              <View className='bg-white dark:bg-[#FFFFFF0D] border border-black/10 dark:border-[#FFFFFF1A] rounded-lg p-4'>
                  <Text className='text-black dark:text-white text-base font-medium mb-3'>
                    {tx(4, 'Schedule Date & Time')}
                  </Text>
                  <View className='flex-row gap-3'>
                    <TouchableOpacity
                      className='flex-1 bg-white dark:bg-[#FFFFFF0D] border border-black/10 dark:border-[#FFFFFF1A] rounded-lg px-3 py-3'
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text className='text-gray-400 text-xs mb-1'>
                        {tx(5, 'Date')}
                      </Text>
                      <Text className='text-black dark:text-white text-base'>
                        {scheduledDateTime.toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className='flex-1 bg-white dark:bg-[#FFFFFF0D] border border-black/10 dark:border-[#FFFFFF1A] rounded-lg px-3 py-3'
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Text className='text-gray-400 text-xs mb-1'>
                        {tx(6, 'Time')}
                      </Text>
                      <Text className='text-black dark:text-white text-base'>
                        {scheduledDateTime.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showDatePicker && (
                    <View>
                      {Platform.OS === 'ios' && (
                        <View className='flex-row justify-end mb-2'>
                          <TouchableOpacity
                            onPress={() => setShowDatePicker(false)}
                            className='bg-[#F0F2F5] dark:bg-[#FFFFFF0D] px-3 py-1 rounded-md'
                          >
                            <Text className='text-black dark:text-white font-medium'>Done</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      <DateTimePicker
                        value={scheduledDateTime}
                        mode='date'
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onDateChange}
                        minimumDate={new Date()}
                      />
                    </View>
                  )}

                  {showTimePicker && (
                    <View>
                      {Platform.OS === 'ios' && (
                        <View className='flex-row justify-end mb-2'>
                          <TouchableOpacity
                            onPress={() => setShowTimePicker(false)}
                            className='bg-[#F0F2F5] dark:bg-[#FFFFFF0D] px-3 py-1 rounded-md'
                          >
                            <Text className='text-black dark:text-white font-medium'>Done</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      <DateTimePicker
                        value={scheduledDateTime}
                        mode='time'
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onTimeChange}
                      />
                    </View>
                  )}
                </View>
            </View>

            {/* Social Sharing Options */}

            {/* Submit Button */}
            <TouchableOpacity
              className={`rounded-2xl p-4 items-center mt-6 ${
                isSubmissionDisabled
                  ? 'bg-white/40 dark:bg-white/20'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600'
              }`}
              onPress={handleSubmit}
              disabled={isSubmissionDisabled}
            >
              <Text className='text-black dark:text-white font-roboto-bold text-lg'>
                {isBlockActive
                  ? tx(23, 'Blocked') + ': ' + blockRemainingText
                  : isLoading
                    ? isEditMode
                      ? tx(16, 'Updating...')
                      : isScheduled
                        ? tx(14, 'Scheduling...')
                        : tx(15, 'Submitting...')
                    : isEditMode
                      ? tx(9, 'Update Post')
                      : isScheduled
                        ? tx(8, 'Schedule Post')
                        : tx(7, 'Submit to UBlast')}
              </Text>
            </TouchableOpacity>
            {uploadProgress !== null && (
              <Text className='text-black/70 dark:text-white/70 text-sm mt-2'>
                Uploading... {uploadProgress}%
              </Text>
            )}
          </View>

          {/* UBlast Posts List */}
          {submissions.length > 0 && (
            <View className='mt-6'>
              <Text className='text-black dark:text-white font-roboto-bold text-xl mb-4'>
                {tx(10, 'Your UBlast Submissions')}
              </Text>
              <View>
                {submissions.map((post: any, index: number) => (
                  <View
                    key={post._id}
                    className='relative'
                    style={{
                      marginBottom: index === submissions.length - 1 ? 0 : 14,
                    }}
                  >
                    <PostCard
                      post={post}
                      showOwnerActions={true}
                      hideFollowButton={true}
                      hideActions={true}
                    />
                    {/* Edit Button in Top Right */}
                    <TouchableOpacity
                      className={`absolute top-4 right-4 bg-[#F0F2F5] dark:bg-[#FFFFFF0D] px-3 py-1.5 rounded-full border border-black/20 dark:border-[#FFFFFF0D] ${isSubmissionDisabled ? 'opacity-50' : ''}`}
                      onPress={() => handleEditPost(post)}
                      disabled={isSubmissionDisabled}
                    >
                      <Text className='text-black dark:text-white font-roboto-medium text-xs'>
                        {tx(11, 'Edit')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Block Notice */}
          {isBlockActive && (
            <View className='mt-6 bg-red-500/10 border border-red-500/30 rounded-2xl p-4'>
              <View className='flex-row gap-3 items-start'>
                <AntDesign name='clock-circle' size={24} color='#ef4444' />
                <View className='flex-1'>
                  <Text className='text-red-500 font-roboto-semibold mb-1'>
                    {tx(20, 'UBlast Blocked')}
                  </Text>
                  <Text className='text-red-500/90 font-roboto-regular text-sm'>
                    {tx(21, 'You cannot submit any UBlast content during the block period.')}
                  </Text>
                  <Text className='text-red-500 font-roboto-semibold text-sm mt-1'>
                    {tx(22, 'Block ends in')} {blockRemainingText}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Eligibility Notice */}
          <View className='mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4'>
            <View className='flex-row gap-3 items-start'>
              <AntDesign name='info-circle' size={24} color='#eab308' />
              <View className='flex-1'>
                <Text className='text-yellow-500 font-roboto-semibold mb-1'>
                  {tx(12, 'Eligibility Required')}
                </Text>
                <Text className='text-yellow-500/80 font-roboto-regular text-sm'>
                  {tx(
                    13,
                    'Make sure you meet the eligibility requirements in the Trending tab before submitting.'
                  )}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
};
export default UBlastSubmission;





