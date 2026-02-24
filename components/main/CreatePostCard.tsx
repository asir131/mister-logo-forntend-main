import Input from '@/components/inpute/Inpute';
import UserAvatar from '@/components/ui/UserAvatar';
import { useCreatePost } from '@/hooks/app/post';
import { useGetMyProfile } from '@/hooks/app/profile';
import { useTranslateTexts } from '@/hooks/app/translate';
import useLanguageStore from '@/store/language.store';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useIsFocused } from '@react-navigation/native';

const CreatePostCard = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [postText, setPostText] = useState('');
  const [selectedMediaType, setSelectedMediaType] = useState<
    'image' | 'video' | 'audio'
  >('image');

  const { language } = useLanguageStore();
  const { data: t } = useTranslateTexts({
    texts: [
      "What's on your mind?",
      'Sorry, we need camera roll permissions to make this work!',
      'Validation Error',
      'Please enter a description or select media.',
      'Photo',
      'Full',
      'Posting...',
      'UPost',
    ],
    targetLang: language,
    enabled: !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;

  const { data: profileData, isLoading: isProfileLoading } = useGetMyProfile();
  // @ts-ignore
  const profileImage =
    (profileData as any)?.profile?.profileImageUrl ||
    (profileData as any)?.profileImageUrl ||
    '';

  const { mutate: createPost, isPending: isPosting } = useCreatePost();
  const isFocused = useIsFocused();

  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      alert(tx(1, 'Sorry, we need camera roll permissions to make this work!'));
      return;
    }
    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!pickerResult.canceled) {
      const asset = pickerResult.assets[0];
      setSelectedImage(asset.uri);
      // @ts-ignore
      setSelectedMediaType(asset.type === 'video' ? 'video' : 'image');
    }
  };

  const handlePost = async () => {
    if (!postText.trim() && !selectedImage) {
      Toast.show({
        type: 'error',
        text1: tx(2, 'Validation Error'),
        text2: tx(3, 'Please enter a description or select media.'),
      });
      return;
    }

    const formData = new FormData();
    formData.append('description', postText);
    formData.append('shareToFacebook', 'true');
    formData.append('shareToInstagram', 'true');

    if (selectedImage) {
      const filename = selectedImage.split('/').pop() || 'post_media.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match?.[1]?.toLowerCase() || 'jpg';
      const isVideo = selectedMediaType === 'video';

      const mimeType = isVideo
        ? `video/${ext === 'mov' ? 'quicktime' : 'mp4'}`
        : ext === 'png'
          ? 'image/png'
          : 'image/jpeg';

      formData.append('media', {
        uri: selectedImage,
        name: filename,
        type: mimeType,
      } as any);
      formData.append('mediaType', selectedMediaType);
    }

    createPost(formData, {
      onSuccess: () => {
        setPostText('');
        setSelectedImage(null);
        setSelectedMediaType('image');
      },
      onError: (error: any) => {
        // Handled by hook
      },
    });
  };

  const previewPlayer = useVideoPlayer(selectedImage || '', player => {
    if (selectedMediaType === 'video') {
      player.loop = true;
    }
  });
  React.useEffect(() => {
    if (!isFocused) {
      previewPlayer.pause();
    }
  }, [isFocused, previewPlayer]);

  return (
    <View className='p-6 bg-[#F0F2F5] dark:bg-[#FFFFFF0D] rounded-3xl mt-6 flex-row gap-5'>
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/profile')}
        className='mt-2'
      >
        <UserAvatar
          uri={profileImage || null}
          isLoading={isProfileLoading}
          size={30}
        />
      </TouchableOpacity>
      <View className=' flex-1'>
        <Input
          placeholder={tx(0, "What's on your mind?")}
          inputeStyle='pb-10'
          value={postText}
          onChangeText={setPostText}
          multiline
        />

        {selectedImage && (
          <View className='mt-4 relative'>
            {selectedMediaType === 'image' ? (
              <Image
                source={{ uri: selectedImage }}
                style={{ width: '100%', height: 200, borderRadius: 16 }}
                contentFit='cover'
              />
            ) : (
              <VideoView
                style={{ width: '100%', height: 200, borderRadius: 16 }}
                player={previewPlayer}
                nativeControls={false}
              />
            )}
            <TouchableOpacity
              onPress={() => setSelectedImage(null)}
              className='absolute top-2 right-2 bg-black/50 p-1 rounded-full'
            >
              <Ionicons name='close' size={20} color='black' />
            </TouchableOpacity>
          </View>
        )}

        <View className='flex-row justify-between mt-5'>
          <View className='flex-row gap-6'>
            <TouchableOpacity
              onPress={handleImagePicker}
              className='flex-row items-center gap-2'
            >
              <Feather name='image' size={18} color='black' />
              <Text className='text-black dark:text-white'>
                {tx(4, 'Photo')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/create')}
              className='flex-row items-center gap-2'
            >
              <Feather name='maximize' size={18} color='black' />
              <Text className='text-black dark:text-white'>
                {tx(5, 'Full')}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            className={`px-4 py-2 bg-[#F0F2F5] dark:bg-[#FFFFFF0D] rounded-xl ${isPosting ? 'opacity-50' : ''}`}
            onPress={handlePost}
            disabled={isPosting}
          >
            <Text className='text-[#2B2B2B] font-roboto-medium'>
              {isPosting ? tx(6, 'Posting...') : tx(7, 'UPost')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default CreatePostCard;

