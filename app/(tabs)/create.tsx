import MediaPickers from '@/components/create-post/MediaPickers';
import MediaPreview from '@/components/create-post/MediaPreview';
import SelectionCard from '@/components/create/SelectionCard';
import GradientBackground from '@/components/main/GradientBackground';
import {
  useCreatePost,
  useEditPost,
  useUpdateScheduledPost,
  useCreatePostByUrl,
} from '@/hooks/app/post';
import {
  type CloudinaryUploadResponse,
  useUploadSignature,
  useUploadVideoToCloudinary,
} from '@/hooks/app/uploads';
import { useTranslateTexts } from '@/hooks/app/translate';
import { useCreateUCuts } from '@/hooks/app/ucuts';
import { getShortErrorMessage } from '@/lib/error';
import useThemeStore from '@/store/theme.store';
import useLanguageStore from '@/store/language.store';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const CreatePost = () => {
  const { mode: colorMode } = useThemeStore();
  const isLight = colorMode === 'light';
  const { language } = useLanguageStore();
  const params = useLocalSearchParams();
  const resetKey = params.reset as string | undefined;
  const isEditMode = !!params.postId;
  const router = useRouter();

  // Selection mode: 'selection' | 'post-create'
  const [mode, setMode] = useState<'selection' | 'post-create'>(
    isEditMode ? 'post-create' : 'selection'
  );

  const [isFacebook, setIsFacebook] = useState(
    params.shareToFacebook === 'true'
  );
  const [isInstagram, setIsInstagram] = useState(
    params.shareToInstagram === 'true'
  );
  const [isTwitter, setIsTwitter] = useState(false);
  const [isYouTube, setIsYouTube] = useState(false);
  const [isSnapchat, setIsSnapchat] = useState(false);
  const [isTikTok, setIsTikTok] = useState(false);
  const [description, setDescription] = useState(
    (params.description as string) || ''
  );

  const isPublishedConfig = params.isPublishedConfig === 'true';

  const [isScheduleMode, setIsScheduleMode] = useState(
    isEditMode ? !isPublishedConfig : false
  );
  const [scheduledDate, setScheduledDate] = useState(
    params.scheduledFor ? new Date(params.scheduledFor as string) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [photo, setPhoto] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [audio, setAudio] = useState<string | null>(null);
  const [videoSize, setVideoSize] = useState<number | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [videoPlayerUri, setVideoPlayerUri] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const { mutate: createPost, isPending: isCreating } = useCreatePost();
  const { mutate: createPostByUrl, isPending: isCreatingByUrl } =
    useCreatePostByUrl();
  const { mutateAsync: requestSignature, isPending: isSigning } =
    useUploadSignature();
  const { mutateAsync: uploadVideo, isPending: isUploadingVideo } =
    useUploadVideoToCloudinary();
  const { mutate: updateScheduledPost, isPending: isUpdatingScheduled } =
    useUpdateScheduledPost();
  const { mutate: editPost, isPending: isEditingPublished } = useEditPost();
  const { mutateAsync: createUcut, isPending: isCreatingUcut } = useCreateUCuts();

  const isLoading =
    isCreating ||
    isUpdatingScheduled ||
    isEditingPublished ||
    isCreatingByUrl ||
    isSigning ||
    isUploadingVideo ||
    isCreatingUcut;

  const [postType, setPostType] = useState<'post' | 'uclip' | 'ucut'>(
    (params.postType as 'uclip' | 'post' | 'ucut') || 'post'
  );
  const isUclip = postType === 'uclip';
  const isUcut = postType === 'ucut';
  const { data: t } = useTranslateTexts({
    texts: [
      'Create',
      'Choose what you want to create',
      'UPost Create',
      'Share photos, videos, and audio with your followers',
      'UBlast Submission',
      'Submit your content to trending and reach more people',
      'Edit Post',
      'Create Post',
      'Post Now',
      'Schedule',
      'Schedule Post',
      'Schedule Date & Time',
      'Date',
      'Time',
      'Description',
      "What's on your mind?",
      'UPost',
      'UClips',
      'UClips are video only.',
      'Share Targets',
      'Facebook',
      'Instagram',
      'Twitter',
      'YouTube',
      'Snapchat',
      'TikTok',
      'Please select a media file (photo, video, or audio)',
      'UClips require a video',
      'Please add a description',
      'Post scheduled successfully!',
      'Post created successfully!',
      'Post Creation Failed',
      'Upload Failed',
      'Cloud upload failed',
      'Please select a future date and time for scheduling.',
      'UClips Video Only',
      'UClips support video only.',
      'Updating...',
      'UScheduling...',
      'UPosting...',
      'Update',
      'USchedule',
      'UPost',
      'Post Update Failed',
      'Done',
      'Uploading video',
      'UCuts',
      'UCuts supports photo or video only.',
      'UCuts require photo or video.',
      'UCuts do not support audio.',
      'Share UCuts',
      'Sharing UCuts...',
    ],
    targetLang: language,
    enabled: !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;

  useEffect(() => {
    if (!resetKey) return;
    setMode('selection');
    setPhoto(null);
    setVideo(null);
    setAudio(null);
    setVideoSize(null);
    setVideoName(null);
    setVideoPlayerUri(null);
    setDescription('');
    setIsFacebook(false);
    setIsInstagram(false);
    setIsTwitter(false);
    setIsYouTube(false);
    setIsSnapchat(false);
    setIsTikTok(false);
    setIsScheduleMode(false);
    setScheduledDate(new Date());
    setShowDatePicker(false);
    setShowTimePicker(false);
    setPostType('post');
  }, [resetKey]);

  useEffect(() => {
    if (isEditMode && params.mediaUrl && params.mediaType) {
      const type = params.mediaType as string;
      const url = params.mediaUrl as string;
      if (type === 'image') {
        setPhoto(url);
      } else if (type === 'video') {
        setVideo(url);
        setVideoPlayerUri(url);
        setVideoSize(null);
        setVideoName(null);
      } else if (type === 'audio') {
        setAudio(url);
      }
    }
  }, [isEditMode, params]);

  useEffect(() => {
    if (postType === 'uclip') {
      setPhoto(null);
      setAudio(null);
    }

    if (postType === 'ucut') {
      setAudio(null);
      setIsScheduleMode(false);
      setIsFacebook(false);
      setIsInstagram(false);
      setIsTwitter(false);
      setIsYouTube(false);
      setIsSnapchat(false);
      setIsTikTok(false);
    } else if (!isPublishedConfig && !isEditMode) {
      setIsScheduleMode(false);
    }
  }, [postType, isPublishedConfig, isEditMode]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      const now = new Date();
      const newDate = new Date(selectedDate);
      newDate.setHours(now.getHours());
      newDate.setMinutes(now.getMinutes());
      setScheduledDate(newDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (selectedTime) {
      const newDate = new Date(scheduledDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setScheduledDate(newDate);
    }
  };

  const BIG_VIDEO_BYTES = 50 * 1024 * 1024;

  const buildShareTargets = (skipInstagram = false) => {
    const targets: string[] = [];
    if (isFacebook) targets.push('facebook');
    if (isInstagram && !skipInstagram) targets.push('instagram');
    if (isTwitter) targets.push('twitter');
    if (isYouTube) targets.push('youtube');
    if (isSnapchat) targets.push('snapchat');
    if (isTikTok) targets.push('tiktok');
    return targets;
  };

  const shareToInstagramPersonal = async (mediaUri: string) => {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Toast.show({
          type: 'error',
          text1: 'Sharing not available on this device.',
        });
        return;
      }

      await Sharing.shareAsync(mediaUri, {
        dialogTitle: 'Share to Instagram',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Instagram share failed',
        text2: getShortErrorMessage(error, 'Could not open Instagram share.'),
      });
    }
  };

  const resetCreateForm = () => {
    setPhoto(null);
    setVideo(null);
    setVideoPlayerUri(null);
    setAudio(null);
    setDescription('');
    setUploadProgress(null);
    setIsFacebook(false);
    setIsInstagram(false);
    setIsTwitter(false);
    setIsYouTube(false);
    setIsSnapchat(false);
    setIsTikTok(false);
    setIsScheduleMode(false);
    setVideoSize(null);
    setVideoName(null);
  };

  // moved to hooks: useUploadSignature, useUploadVideoToCloudinary

  const handlePost = async () => {
    if (!photo && !video && !audio) {
      alert(tx(26, 'Please select a media file (photo, video, or audio)'));
      return;
    }

    if (isUclip && !video) {
      alert(tx(27, 'UClips require a video'));
      return;
    }

    if (!description.trim()) {
      alert(tx(28, 'Please add a description'));
      return;
    }

    if (isUcut) {
      if (!photo && !video) {
        alert(tx(48, 'UCuts require photo or video.'));
        return;
      }

      if (isEditMode) {
        Toast.show({
          type: 'info',
          text1: tx(46, 'UCuts'),
          text2: 'Edit is not supported for UCuts from this screen.',
        });
        return;
      }

      const sourceUri = video || photo;
      if (!sourceUri) return;

      const isVideo = Boolean(video);
      const fallbackName = isVideo ? 'ucut-video.mp4' : 'ucut-image.jpg';
      const fileName = sourceUri.split('/').pop() || fallbackName;
      const ext = /\.(\w+)$/.exec(fileName)?.[1]?.toLowerCase();
      const mimeType = isVideo
        ? `video/${ext === 'mov' ? 'quicktime' : ext || 'mp4'}`
        : `image/${ext === 'png' ? 'png' : 'jpeg'}`;

      try {
        await createUcut({
          text: description.trim(),
          media: {
            uri: sourceUri,
            name: fileName,
            type: mimeType,
          },
        });

        resetCreateForm();
        alert(tx(46, 'UCuts') + ' created successfully!');
        setMode('selection');
      } catch (error) {
        // Toast is handled inside useCreateUCuts
      }
      return;
    }

    const formData = new FormData();

    const isRemote = (uri: string) => uri.startsWith('http');

    const instagramMediaUri = video ? videoPlayerUri || video : photo;
    const shouldShareToInstagramApp =
      isInstagram &&
      !isScheduleMode &&
      !isEditMode &&
      !audio &&
      !!instagramMediaUri &&
      !isRemote(instagramMediaUri);

    const shareTargets = buildShareTargets(shouldShareToInstagramApp);

    if (photo && !isRemote(photo)) {
      const filename = photo.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match?.[1]?.toLowerCase() || 'jpg';
      formData.append('media', {
        uri: photo,
        name: filename,
        type: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
      } as any);
      formData.append('mediaType', 'image');
    } else if (video && !isRemote(video)) {
      if (videoSize && videoSize > BIG_VIDEO_BYTES) {
        try {
          setUploadProgress(0);
          const signatureData = await requestSignature({
            folder: 'mister/posts',
            resourceType: 'video',
          });
          const uploadRes: CloudinaryUploadResponse = await uploadVideo({
            signature: signatureData,
            uri: video,
            fileName: videoName,
            onProgress: (percent) => setUploadProgress(percent),
          });
          const mediaUrl =
            uploadRes?.secure_url || uploadRes?.url || uploadRes?.playback_url;
          if (!mediaUrl) {
            throw new Error('Missing media URL from upload response');
          }
          createPostByUrl(
            {
              description,
              mediaUrl,
              mediaType: 'video',
              shareTargets,
              postType: isUclip ? 'uclip' : undefined,
              scheduledFor: isScheduleMode
                ? scheduledDate.toISOString()
                : undefined,
            },
            {
              onSuccess: () => {
                if (shouldShareToInstagramApp && instagramMediaUri) {
                  shareToInstagramPersonal(instagramMediaUri);
                }

                setPhoto(null);
                setVideo(null);
                setVideoPlayerUri(null);
                setAudio(null);
                setDescription('');
                setUploadProgress(null);
                setIsFacebook(false);
                setIsInstagram(false);
                setIsTwitter(false);
                setIsYouTube(false);
                setIsSnapchat(false);
                setIsTikTok(false);
                setIsScheduleMode(false);
                setVideoSize(null);
                setVideoName(null);

                alert(
                  isScheduleMode
                    ? tx(29, 'Post scheduled successfully!')
                    : tx(30, 'Post created successfully!')
                );
                setMode('selection');
              },
              onError: (error: any) => {
                Toast.show({
                  type: 'error',
                  text1: tx(31, 'Post Creation Failed'),
                  text2: getShortErrorMessage(error, 'Request failed.'),
                });
                setUploadProgress(null);
              },
            }
          );
          return;
        } catch (err: any) {
          Toast.show({
            type: 'error',
            text1: tx(32, 'Upload Failed'),
            text2: err?.message || tx(33, 'Cloud upload failed'),
          });
          setUploadProgress(null);
          return;
        }
      }

      const filename = video.split('/').pop() || 'video.mp4';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match?.[1]?.toLowerCase() || 'mp4';
      formData.append('media', {
        uri: video,
        name: filename,
        type: `video/${ext === 'mov' ? 'quicktime' : 'mp4'}`,
      } as any);
      formData.append('mediaType', 'video');
    } else if (audio && !isRemote(audio)) {
      const filename = audio.split('/').pop() || 'audio.mp3';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match?.[1]?.toLowerCase() || 'mp3';
      formData.append('media', {
        uri: audio,
        name: filename,
        type: `audio/${ext === 'wav' ? 'wav' : 'mpeg'}`,
      } as any);
      formData.append('mediaType', 'audio');
    }

    formData.append('description', description);
    formData.append('shareTargets', JSON.stringify(shareTargets));
    if (isUclip) {
      formData.append('postType', 'uclip');
    }

    if (isScheduleMode) {
      if (scheduledDate <= new Date()) {
        alert(tx(34, 'Please select a future date and time for scheduling.'));
        return;
      }
      formData.append('scheduledFor', scheduledDate.toISOString());
    }

    if (isEditMode) {
      if (isPublishedConfig) {
        editPost(
          { postId: params.postId as string, formData },
          {
            onSuccess: () => {
              setPhoto(null);
              setVideo(null);
              setVideoPlayerUri(null);
              setAudio(null);
              setDescription('');
              setUploadProgress(null);
              setIsFacebook(false);
              setIsInstagram(false);
              setIsScheduleMode(false);
              router.back();
            },
            onError: (error: any) => {
              Toast.show({
                type: 'error',
                text1: tx(43, 'Post Update Failed'),
                text2: getShortErrorMessage(error, 'Request failed.'),
              });
              setUploadProgress(null);
            },
          }
        );
      } else {
        updateScheduledPost(
          { postId: params.postId as string, formData },
          {
            onSuccess: () => {
              setPhoto(null);
              setVideo(null);
              setVideoPlayerUri(null);
              setAudio(null);
              setDescription('');
              setUploadProgress(null);
              setIsFacebook(false);
              setIsInstagram(false);
              setIsScheduleMode(false);

              router.replace('/screens/profile/scheduled-posts');
            },
            onError: (error: any) => {
              Toast.show({
                type: 'error',
                text1: tx(43, 'Post Update Failed'),
                text2: getShortErrorMessage(error, 'Request failed.'),
              });
              setUploadProgress(null);
            },
          }
        );
      }
    } else {
      createPost(formData, {
        onSuccess: () => {
          if (shouldShareToInstagramApp && instagramMediaUri) {
            shareToInstagramPersonal(instagramMediaUri);
          }

          setPhoto(null);
          setVideo(null);
          setVideoPlayerUri(null);
          setAudio(null);
          setDescription('');
          setUploadProgress(null);
          setIsFacebook(false);
          setIsInstagram(false);
          setIsScheduleMode(false);

          alert(
            isScheduleMode
              ? tx(29, 'Post scheduled successfully!')
              : tx(30, 'Post created successfully!')
          );
          setMode('selection');
        },
        onError: (error: any) => {
          Toast.show({
            type: 'error',
            text1: tx(31, 'Post Creation Failed'),
            text2: getShortErrorMessage(error, 'Request failed.'),
          });
          setUploadProgress(null);
        },
      });
    }
  };

// CreatePost.tsx - pickVideo function with proper cleanup

const resolveVideoPreviewUri = async (uri: string, name?: string | null) => {
  if (!uri) return uri;

  // On Android, ImagePicker can return a content:// URI that may fail in VideoView.
  // Copying to app cache provides a stable file:// URI for preview and upload.
  if (Platform.OS === 'android' && uri.startsWith('content://')) {
    try {
      const rawExt = (name?.split('.').pop() || 'mp4').toLowerCase();
      const ext = /^[a-z0-9]+$/.test(rawExt) ? rawExt : 'mp4';
      const targetPath = `${FileSystem.cacheDirectory}picked-video-${Date.now()}.${ext}`;
      await FileSystem.copyAsync({ from: uri, to: targetPath });
      return targetPath;
    } catch {
      return uri;
    }
  }

  return uri;
};

const pickVideo = async () => {
  try {
    setVideo(null);
    setVideoPlayerUri(null);
    setVideoSize(null);
    setVideoName(null);
    setPhoto(null);
    setAudio(null);

    await new Promise(resolve => setTimeout(resolve, 100));

    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['videos'],
      quality: 1,
      allowsEditing: false,
    };

    if (Platform.OS === 'ios' && (ImagePicker as any).VideoExportPreset) {
      (pickerOptions as any).videoExportPreset =
        (ImagePicker as any).VideoExportPreset.MediumQuality ||
        (ImagePicker as any).VideoExportPreset.Passthrough;
    }

    const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (result.canceled) return;

    const picked = result.assets[0];
    const rawUri = picked.uri;
    const pickedName = picked.fileName ?? null;
    const pickedSize = picked.fileSize ?? null;
    const previewUri = await resolveVideoPreviewUri(rawUri, pickedName);

    setVideo(rawUri);
    setVideoPlayerUri(previewUri);
    setVideoSize(pickedSize);
    setVideoName(pickedName);
  } catch (error) {
    console.error('[pickVideo] Error:', error);
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Failed to select video. Please try another video file.',
    });
  }
};
// Also update pickPhoto to clear video
const pickPhoto = async () => {
  if (isUclip) {
    Toast.show({
      type: 'info',
      text1: tx(35, 'UClips Video Only'),
      text2: tx(36, 'UClips support video only.'),
    });
    return;
  }
  
  // Clear all media states first
  setVideo(null);
  setVideoPlayerUri(null);
  setVideoSize(null);
  setVideoName(null);
  setAudio(null);
  
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
  });
  
  if (!result.canceled) {
    setPhoto(result.assets[0].uri);
  }
};

// And pickAudio
const pickAudio = async () => {
  if (isUclip) {
    Toast.show({
      type: 'info',
      text1: tx(35, 'UClips Video Only'),
      text2: tx(36, 'UClips support video only.'),
    });
    return;
  }

  if (isUcut) {
    Toast.show({
      type: 'info',
      text1: tx(46, 'UCuts'),
      text2: tx(49, 'UCuts do not support audio.'),
    });
    return;
  }

  // Clear all media states first
  setVideo(null);
  setVideoPlayerUri(null);
  setVideoSize(null);
  setVideoName(null);
  setPhoto(null);

  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
    });
    if (result.assets && result.assets.length > 0) {
      const audioUri = result.assets[0].uri;
      setAudio(audioUri);
    }
  } catch (error) {
    console.error('Error picking audio:', error);
  }
};

  if (mode === 'selection') {
    return (
      <GradientBackground>
        <SafeAreaView className='flex-1' edges={['top', 'left', 'right']}>
          <View className='mt-3 mx-6'>
            <Text className='font-roboto-bold text-primary dark:text-white text-3xl text-center mb-2'>
              {tx(0, 'Create')}
            </Text>
            <Text className='font-roboto-regular text-secondary dark:text-white/80 text-center mb-8'>
              {tx(1, 'Choose what you want to create')}
            </Text>
          </View>

          <View className='border-b border-black/20 dark:border-[#FFFFFF0D] w-full'></View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <SelectionCard
              icon='camera'
              title={tx(2, 'UPost Create')}
              description={tx(
                3,
                'Share photos, videos, and audio with your followers'
              )}
              onPress={() => setMode('post-create')}
              gradientColors={['#667eea', '#764ba2']}
            />

            <SelectionCard
              icon='rocket'
              title={tx(4, 'UBlast Submission')}
              description={tx(
                5,
                'Submit your content to trending and reach more people'
              )}
              onPress={() => router.push('/screens/ublast/ublast-submission')}
              gradientColors={['#f093fb', '#f5576c']}
            />
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView className='flex-1' edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* header */}
          <View className='mt-3 flex-row items-center mx-6 justify-between'>
            <TouchableOpacity onPress={() => router.push('/(tabs)/home')}>
              <AntDesign
                name='close'
                size={22}
                color={isLight ? 'black' : 'white'}
              />
            </TouchableOpacity>
            <Text className='font-roboto-bold text-black dark:text-white text-2xl'>
              {isEditMode ? tx(6, 'Edit Post') : tx(7, 'Create Post')}
            </Text>
            <TouchableOpacity
              onPress={handlePost}
              disabled={isLoading}
              className={`px-4 py-2 rounded-full ${
                isLoading
                  ? 'bg-white/40 dark:bg-white/20'
                  : 'bg-white dark:bg-[#FFFFFF0D]'
              }`}
            >
              <Text className='text-black dark:text-white text-center font-bold'>
                {isLoading
                  ? isEditMode
                    ? tx(37, 'Updating...')
                    : isUcut
                      ? tx(51, 'Sharing UCuts...')
                      : isScheduleMode
                        ? tx(38, 'UScheduling...')
                        : tx(39, 'UPosting...')
                  : isEditMode
                    ? tx(40, 'Update')
                    : isUcut
                      ? tx(50, 'Share UCuts')
                      : isScheduleMode
                        ? tx(41, 'USchedule')
                        : isUclip
                          ? tx(17, 'UClips')
                          : tx(42, 'UPost')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* border */}
          <View className='border-b border-black/20 dark:border-[#FFFFFF0D] w-full mt-2'></View>

          {isUploadingVideo && uploadProgress !== null && (
            <View className='px-6 mt-3'>
              <View className='bg-[#F0F2F5] dark:bg-[#FFFFFF0D] rounded-lg p-3'>
                <Text className='text-black dark:text-white text-sm'>
                  {tx(45, 'Uploading video')}: {uploadProgress}%
                </Text>
              </View>
            </View>
          )}

          {/* Posting Mode */}
          {!isPublishedConfig && !isUcut && !isEditMode && (
            <View className='px-6 mt-4'>
              <View className='bg-white dark:bg-[#FFFFFF0D] border border-black/10 dark:border-[#FFFFFF1A] rounded-lg p-2 flex-row gap-2'>
                <TouchableOpacity
                  onPress={() => setIsScheduleMode(false)}
                  className={`flex-1 py-2.5 rounded-md items-center ${!isScheduleMode ? 'bg-black dark:bg-white' : 'bg-transparent'}`}
                >
                  <Text className={`font-roboto-medium ${!isScheduleMode ? 'text-white dark:text-black' : 'text-black dark:text-white'}`}>
                    {tx(8, 'Post Now')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsScheduleMode(true)}
                  className={`flex-1 py-2.5 rounded-md items-center ${isScheduleMode ? 'bg-black dark:bg-white' : 'bg-transparent'}`}
                >
                  <Text className={`font-roboto-medium ${isScheduleMode ? 'text-white dark:text-black' : 'text-black dark:text-white'}`}>
                    {tx(9, 'Schedule')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Schedule Options */}
          {!isPublishedConfig && !isUcut && (isEditMode || isScheduleMode) && (
            <View className='px-6 mt-4'>
              <View className='bg-white dark:bg-[#FFFFFF0D] border border-black/10 dark:border-[#FFFFFF1A] rounded-lg p-4'>
                <Text className='text-black dark:text-white text-base font-medium mb-3'>
                  {tx(11, 'Schedule Date & Time')}
                </Text>
                <View className='flex-row gap-3'>
                  <TouchableOpacity
                    className='flex-1 bg-white dark:bg-[#FFFFFF0D] border border-black/10 dark:border-[#FFFFFF1A] rounded-lg px-3 py-3'
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text className='text-gray-400 text-xs mb-1'>
                      {tx(12, 'Date')}
                    </Text>
                    <Text className='text-black dark:text-white text-base'>
                      {scheduledDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className='flex-1 bg-white dark:bg-[#FFFFFF0D] border border-black/10 dark:border-[#FFFFFF1A] rounded-lg px-3 py-3'
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text className='text-gray-400 text-xs mb-1'>
                      {tx(13, 'Time')}
                    </Text>
                    <Text className='text-black dark:text-white text-base'>
                      {scheduledDate.toLocaleTimeString([], {
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
                          <Text className='text-black dark:text-white font-medium'>
                            {tx(44, 'Done')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <DateTimePicker
                      value={scheduledDate}
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
                          <Text className='text-black dark:text-white font-medium'>
                            {tx(44, 'Done')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <DateTimePicker
                      value={scheduledDate}
                      mode='time'
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onTimeChange}
                    />
                  </View>
                )}
              </View>
            </View>
          )}

          {/* scroll view */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 72 }}
          >
            <View className='flex-1'>
              {/* Post Type Selector */}
              <View className='px-6 pt-4'>
                <View className='flex-row gap-2'>
                  <TouchableOpacity
                    onPress={() => setPostType('post')}
                    className={`flex-1 py-2 rounded-full items-center justify-center ${postType === 'post' ? 'bg-[#F0F2F5] dark:bg-[#FFFFFF0D]' : 'bg-transparent'}`}
                  >
                    <Text className='text-black dark:text-white font-roboto-medium'>
                      {tx(16, 'UPost')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setPostType('uclip')}
                    className={`flex-1 py-2 rounded-full items-center justify-center ${postType === 'uclip' ? 'bg-[#F0F2F5] dark:bg-[#FFFFFF0D]' : 'bg-transparent'}`}
                  >
                    <Text className='text-black dark:text-white font-roboto-medium'>
                      {tx(17, 'UClips')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setPostType('ucut')}
                    className={`flex-1 py-2 rounded-full items-center justify-center ${postType === 'ucut' ? 'bg-[#F0F2F5] dark:bg-[#FFFFFF0D]' : 'bg-transparent'}`}
                  >
                    <Text className='text-black dark:text-white font-roboto-medium'>
                      {tx(46, 'UCuts')}
                    </Text>
                  </TouchableOpacity>
                </View>
                {postType === 'uclip' && (
                  <Text className='text-secondary dark:text-white/80 text-xs mt-2'>
                    {tx(18, 'UClips are video only.')}
                  </Text>
                )}
                {postType === 'ucut' && (
                  <Text className='text-secondary dark:text-white/80 text-xs mt-2'>
                    {tx(47, 'UCuts supports photo or video only.')}
                  </Text>
                )}
              </View>
              <View className='px-6 pt-4'>
                {/* Always use MediaPreview for video and audio, photo has separate preview */}
                {photo ? (
                  <View className='w-full h-[300px] justify-center items-center bg-black/10 dark:bg-[#FFFFFF0D] rounded-2xl mb-4 overflow-hidden relative'>
                    <Image
                      source={{ uri: photo }}
                      className='w-full h-full'
                      contentFit='cover'
                      cachePolicy='none'
                    />
                  </View>
                ) : (videoPlayerUri || video) || audio ? (
                  <MediaPreview
                    photo={photo}
                    video={videoPlayerUri || video}
                    audio={audio}
                  />
                ) : (
                  <View className='w-full h-[100px] justify-center items-center bg-black/10 dark:bg-[#FFFFFF0D] rounded-2xl mb-4 border border-dashed border-black/20 dark:border-[#FFFFFF0D]'>
                    <Feather name='image' size={40} color='#666' style={{ opacity: 0.5 }} />
                    <Text className='text-gray-400 text-center mt-4 font-roboto-regular'>
                      Select media to preview
                    </Text>
                  </View>
                )}
              </View>

              <View className='px-6 pt-4'>
                <Text className='text-black dark:text-white text-base font-medium mb-2'>
                  {tx(14, 'Description')}
                </Text>
                <View className='bg-white dark:bg-[#FFFFFF0D] border border-black/10 dark:border-[#FFFFFF1A] rounded-2xl p-4 min-h-[100px]'>
                  <TextInput
                    className='text-black dark:text-white text-base flex-1'
                    placeholder={tx(15, "What's on your mind?")}
                    placeholderTextColor='#9CA3AF'
                    multiline
                    value={description}
                    onChangeText={setDescription}
                    style={{ textAlignVertical: 'top', color: isLight ? '#111827' : '#FFFFFF' }}
                  />
                </View>
              </View>

              <MediaPickers
                onPickPhoto={pickPhoto}
                onPickVideo={pickVideo}
                onPickAudio={pickAudio}
                disablePhoto={postType === 'uclip'}
                disableAudio={postType === 'uclip' || postType === 'ucut'}
              />

              {/* Share Targets */}
              {!isUcut && (
              <View className='mx-5 p-4 bg-white dark:bg-[#FFFFFF0D] border border-black/10 dark:border-[#FFFFFF1A] rounded-lg mt-7'>
                <View className='flex-row justify-between items-center mb-4'>
                  <Text className='text-black dark:text-white font-roboto-medium'>
                    {tx(19, 'Share Targets')}
                  </Text>
                </View>

                <View className='flex-row justify-between items-center mb-4'>
                  <View className='flex-row gap-3 items-center'>
                    <Feather
                      name='facebook'
                      size={22}
                      color={isLight ? '#1877F2' : 'white'}
                    />
                    <Text className='text-black dark:text-white'>
                      {tx(20, 'Facebook')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsFacebook(!isFacebook)}
                    className='w-6 h-6 rounded-full border-[1.5px] flex-row justify-center items-center'
                    style={{
                      borderColor: isFacebook
                        ? '#3B82F6'
                        : isLight
                          ? '#94A3B8'
                          : '#FFFFFF80',
                      backgroundColor: isFacebook
                        ? '#3B82F6'
                        : isLight
                          ? '#FFFFFF'
                          : 'transparent',
                    }}
                  >
                    {isFacebook ? (
                      <View className='w-3 h-3 bg-white rounded-full' />
                    ) : (
                      <View
                        className='w-3 h-3 rounded-full'
                        style={{ backgroundColor: isLight ? '#CBD5E1' : '#FFFFFF80' }}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                <View className='flex-row justify-between items-center mb-4'>
                  <View className='flex-row gap-3 items-center'>
                    <SimpleLineIcons
                      name='social-instagram'
                      size={22}
                      color={isLight ? '#E1306C' : 'white'}
                    />
                    <Text className='text-black dark:text-white'>
                      {tx(21, 'Instagram')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsInstagram(!isInstagram)}
                    className='w-6 h-6 rounded-full border-[1.5px] flex-row justify-center items-center'
                    style={{
                      borderColor: isInstagram
                        ? '#3B82F6'
                        : isLight
                          ? '#94A3B8'
                          : '#FFFFFF80',
                      backgroundColor: isInstagram
                        ? '#3B82F6'
                        : isLight
                          ? '#FFFFFF'
                          : 'transparent',
                    }}
                  >
                    {isInstagram ? (
                      <View className='w-3 h-3 bg-white rounded-full' />
                    ) : (
                      <View
                        className='w-3 h-3 rounded-full'
                        style={{ backgroundColor: isLight ? '#CBD5E1' : '#FFFFFF80' }}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                <View className='flex-row justify-between items-center mb-4'>
                  <View className='flex-row gap-3 items-center'>
                    <Feather
                      name='twitter'
                      size={22}
                      color={isLight ? '#1D9BF0' : 'white'}
                    />
                    <Text className='text-black dark:text-white'>
                      {tx(22, 'Twitter')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsTwitter(!isTwitter)}
                    className='w-6 h-6 rounded-full border-[1.5px] flex-row justify-center items-center'
                    style={{
                      borderColor: isTwitter
                        ? '#3B82F6'
                        : isLight
                          ? '#94A3B8'
                          : '#FFFFFF80',
                      backgroundColor: isTwitter
                        ? '#3B82F6'
                        : isLight
                          ? '#FFFFFF'
                          : 'transparent',
                    }}
                  >
                    {isTwitter ? (
                      <View className='w-3 h-3 bg-white rounded-full' />
                    ) : (
                      <View
                        className='w-3 h-3 rounded-full'
                        style={{ backgroundColor: isLight ? '#CBD5E1' : '#FFFFFF80' }}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                <View className='flex-row justify-between items-center mb-4'>
                  <View className='flex-row gap-3 items-center'>
                    <Ionicons
                      name='logo-youtube'
                      size={22}
                      color={isLight ? '#FF0000' : 'white'}
                    />
                    <Text className='text-black dark:text-white'>
                      {tx(23, 'YouTube')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsYouTube(!isYouTube)}
                    className='w-6 h-6 rounded-full border-[1.5px] flex-row justify-center items-center'
                    style={{
                      borderColor: isYouTube
                        ? '#3B82F6'
                        : isLight
                          ? '#94A3B8'
                          : '#FFFFFF80',
                      backgroundColor: isYouTube
                        ? '#3B82F6'
                        : isLight
                          ? '#FFFFFF'
                          : 'transparent',
                    }}
                  >
                    {isYouTube ? (
                      <View className='w-3 h-3 bg-white rounded-full' />
                    ) : (
                      <View
                        className='w-3 h-3 rounded-full'
                        style={{ backgroundColor: isLight ? '#CBD5E1' : '#FFFFFF80' }}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                <View className='flex-row justify-between items-center mb-4'>
                  <View className='flex-row gap-3 items-center'>
                    <Ionicons
                      name='logo-snapchat'
                      size={22}
                      color={isLight ? '#EAB308' : 'white'}
                    />
                    <Text className='text-black dark:text-white'>
                      {tx(24, 'Snapchat')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsSnapchat(!isSnapchat)}
                    className='w-6 h-6 rounded-full border-[1.5px] flex-row justify-center items-center'
                    style={{
                      borderColor: isSnapchat
                        ? '#3B82F6'
                        : isLight
                          ? '#94A3B8'
                          : '#FFFFFF80',
                      backgroundColor: isSnapchat
                        ? '#3B82F6'
                        : isLight
                          ? '#FFFFFF'
                          : 'transparent',
                    }}
                  >
                    {isSnapchat ? (
                      <View className='w-3 h-3 bg-white rounded-full' />
                    ) : (
                      <View
                        className='w-3 h-3 rounded-full'
                        style={{ backgroundColor: isLight ? '#CBD5E1' : '#FFFFFF80' }}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                <View className='flex-row justify-between items-center'>
                  <View className='flex-row gap-3 items-center'>
                    <Ionicons
                      name='logo-tiktok'
                      size={22}
                      color={isLight ? '#111827' : 'white'}
                    />
                    <Text className='text-black dark:text-white'>
                      {tx(25, 'TikTok')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsTikTok(!isTikTok)}
                    className='w-6 h-6 rounded-full border-[1.5px] flex-row justify-center items-center'
                    style={{
                      borderColor: isTikTok
                        ? '#3B82F6'
                        : isLight
                          ? '#94A3B8'
                          : '#FFFFFF80',
                      backgroundColor: isTikTok
                        ? '#3B82F6'
                        : isLight
                          ? '#FFFFFF'
                          : 'transparent',
                    }}
                  >
                    {isTikTok ? (
                      <View className='w-3 h-3 bg-white rounded-full' />
                    ) : (
                      <View
                        className='w-3 h-3 rounded-full'
                        style={{ backgroundColor: isLight ? '#CBD5E1' : '#FFFFFF80' }}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
};

export default CreatePost;
















