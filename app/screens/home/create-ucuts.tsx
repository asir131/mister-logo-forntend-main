import ShadowButton from '@/components/button/ShadowButton';
import GradientBackground from '@/components/main/GradientBackground';
import { useGetMyProfile } from '@/hooks/app/profile';
import { useCreateUCuts } from '@/hooks/app/ucuts';
import { useTranslateTexts } from '@/hooks/app/translate';
import useLanguageStore from '@/store/language.store';
import useThemeStore from '@/store/theme.store';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');
const STORY_PREVIEW_WIDTH = width * 0.8;
const STORY_PREVIEW_HEIGHT = STORY_PREVIEW_WIDTH * 1.77;

const CreateStory = () => {
  const { data: profileData } = useGetMyProfile();
  const profileImageUrl =
    (profileData as any)?.profile?.profileImageUrl ||
    (profileData as any)?.profileImageUrl ||
    '';
  const { mode } = useThemeStore();
  const isLight = mode === 'light';
  const { language } = useLanguageStore();
  const { data: t } = useTranslateTexts({
    texts: [
      'Create UCuts',
      'Write something...',
      'Sharing...',
      'Share to UCuts',
      'Tap to select a photo',
      'Permission Required',
      'Camera roll permissions are needed to select a UCuts.',
      'Missing info',
      'Please add text and select a media file.',
    ],
    targetLang: language,
    enabled: !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;
  const [text, setText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{
    uri: string;
    name: string;
    type: string;
    mediaType: 'image' | 'video';
  } | null>(null);
  const { mutateAsync: createUCuts, isPending } = useCreateUCuts();

  const previewPlayer = useVideoPlayer(
    selectedMedia?.mediaType === 'video' ? selectedMedia.uri : '',
    player => {
      player.loop = true;
      player.muted = true;
    }
  );

  useEffect(() => {
    if (selectedMedia?.mediaType === 'video') {
      previewPlayer.play();
    } else {
      previewPlayer.pause();
    }
  }, [selectedMedia?.mediaType, previewPlayer]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: tx(5, 'Permission Required'),
        text2: tx(6, 'Camera roll permissions are needed to select a UCuts.'),
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const mediaType = asset.type === 'video' ? 'video' : 'image';
      const ext =
        asset.fileName?.split('.').pop() ||
        (mediaType === 'video' ? 'mp4' : 'jpg');
      const name = asset.fileName || `ucuts-${Date.now()}.${ext}`;
      const type =
        asset.mimeType || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');

      setSelectedMedia({
        uri: asset.uri,
        name,
        type,
        mediaType,
      });
    }
  };

  const handlePostStory = async () => {
    if (!selectedMedia || !text.trim()) {
      Toast.show({
        type: 'error',
        text1: tx(7, 'Missing info'),
        text2: tx(8, 'Please add text and select a media file.'),
      });
      return;
    }

    await createUCuts({
      text: text.trim(),
      media: {
        uri: selectedMedia.uri,
        name: selectedMedia.name,
        type: selectedMedia.type,
      },
    });
    router.back();
  };

  return (
    <GradientBackground>
      <SafeAreaView className='flex-1'>
        <View className='flex-row items-center justify-between px-4 py-2.5'>
          <TouchableOpacity onPress={() => router.back()} className='p-1.5'>
            <Ionicons
              name='close'
              size={28}
              color={isLight ? 'black' : 'white'}
            />
          </TouchableOpacity>
          <Text className='text-black dark:text-white text-lg font-semibold'>
            {tx(0, 'Create UCuts')}
          </Text>
          <View className='w-10 h-10 rounded-full overflow-hidden border border-black/20 dark:border-white/20'>
            <Image
              source={{
                uri: profileImageUrl || 'https://via.placeholder.com/150',
              }}
              style={{ width: '100%', height: '100%' }}
              contentFit='cover'
            />
          </View>
        </View>

        <View className='flex-1 items-center justify-center p-5 gap-4'>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={tx(1, 'Write something...')}
            placeholderTextColor={isLight ? '#9CA3AF' : 'rgba(255,255,255,0.6)'}
            className='w-full rounded-2xl border border-black/20 dark:border-white/10 bg-[#F0F2F5] dark:bg-[#FFFFFF0D] px-4 py-3 text-black dark:text-white'
          />
          {selectedMedia ? (
            <View
              className='overflow-hidden items-center justify-center bg-black/30 rounded-2xl'
              style={{ width: STORY_PREVIEW_WIDTH, height: STORY_PREVIEW_HEIGHT }}
            >
              {selectedMedia.mediaType === 'image' ? (
                <Image
                  source={{ uri: selectedMedia.uri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit='contain'
                />
              ) : (
                <VideoView
                  style={{ width: '100%', height: '100%' }}
                  player={previewPlayer}
                  contentFit='contain'
                />
              )}
              <TouchableOpacity
                onPress={() => setSelectedMedia(null)}
                className='absolute top-5 right-5 bg-black/50 p-2.5 rounded-full'
              >
                <Ionicons
                  name='trash-outline'
                  size={24}
                  color={isLight ? 'black' : 'white'}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={pickImage}
              className='items-center justify-center border-2 border-black/20 dark:border-white/10 border-dashed rounded-2xl bg-[#F0F2F5] dark:bg-[#FFFFFF0D]'
              style={{ width: STORY_PREVIEW_WIDTH, height: STORY_PREVIEW_HEIGHT }}
            >
              <View className='w-20 h-20 rounded-full bg-[#F0F2F5] dark:bg-[#FFFFFF0D] items-center justify-center mb-4'>
                <Ionicons
                  name='image-outline'
                  size={40}
                  color={isLight ? 'black' : 'white'}
                />
              </View>
              <Text className='text-black/50 dark:text-white/70 text-base'>
                {tx(4, 'Tap to select a photo')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {selectedMedia && (
          <View className='px-6 pb-10'>
            <ShadowButton
              text={isPending ? tx(2, 'Sharing...') : tx(3, 'Share to UCuts')}
              onPress={handlePostStory}
              className='w-full'
            />
          </View>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
};

export default CreateStory;
