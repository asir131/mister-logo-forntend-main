import GradientBackground from '@/components/main/GradientBackground';
import {
  useGetAllChatList,
  useGetSharedChatLocations,
  useUpdateMyChatLocationShare,
} from '@/hooks/app/chat';
import { useSocketPresence } from '@/hooks/app/useSocketPresence';
import { useTranslateTexts } from '@/hooks/app/translate';
import useAuthStore from '@/store/auth.store';
import useThemeStore from '@/store/theme.store';
import useLanguageStore from '@/store/language.store';
import useNotificationStore from '@/store/notification.store';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import UserAvatar from '@/components/ui/UserAvatar';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import React, { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';

const MAP_PREVIEW_WIDTH = 1000;
const MAP_PREVIEW_HEIGHT = 220;
const MAP_FULL_WIDTH = 1200;
const MAP_FULL_HEIGHT = 720;

const formatMessageTime = (createdAt: string) => {
  const messageDate = new Date(createdAt);
  const today = new Date();
  const isToday = messageDate.toDateString() === today.toDateString();

  if (isToday) {
    return messageDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
  return messageDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const buildStaticMapUrl = (
  locations: Array<{ latitude: number; longitude: number }>,
  width: number,
  height: number,
) => {
  if (!locations.length) {
    return `https://staticmap.openstreetmap.de/staticmap.php?center=23.8103,90.4125&zoom=2&size=${width}x${height}`;
  }

  const markerPart = locations
    .slice(0, 30)
    .map((item) => `${item.latitude},${item.longitude},lightblue1`)
    .join('|');

  return `https://staticmap.openstreetmap.de/staticmap.php?size=${width}x${height}&markers=${encodeURIComponent(
    markerPart,
  )}`;
};

const ChatsList = () => {
  const { mode } = useThemeStore();
  const isLight = mode === 'light';
  const unreadCount = useNotificationStore(state => state.badgeCount);
  const { user } = useAuthStore();
  const { data, isLoading, isError, error } = useGetAllChatList();
  const { data: locationsData, refetch: refetchLocations } = useGetSharedChatLocations();
  const { mutateAsync: updateLocationShare, isPending: isUpdatingLocation } =
    useUpdateMyChatLocationShare();
  const { language } = useLanguageStore();
  const { isUserOnline, isConnected } = useSocketPresence();
  const { data: t } = useTranslateTexts({
    texts: [
      'Loading...',
      'Failed to load chats',
      'Unknown error',
      'Chat',
      'Search chats...',
      'Online',
      'Offline',
      'Connecting...',
      'No shared locations yet',
      'Tap to open full map',
      'Share my location',
      'Hide my location',
      'Location permission denied',
      'Shared location updated',
      'Location updated',
      'Shared Locations',
      'Close',
    ],
    targetLang: language,
    enabled: !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) => t?.translations?.[i] || fallback;

  const chatData = useMemo(
    () => (Array.isArray((data as any)?.chats) ? (data as any).chats : []),
    [data],
  );

  const sharedLocations = useMemo(
    () =>
      Array.isArray((locationsData as any)?.locations)
        ? ((locationsData as any).locations as any[])
        : [],
    [locationsData],
  );

  const mySharedLocation = useMemo(
    () => sharedLocations.find((entry: any) => String(entry?.userId) === String(user?.id || '')),
    [sharedLocations, user?.id],
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [fullMapVisible, setFullMapVisible] = useState(false);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chatData;
    const query = searchQuery.toLowerCase();
    return chatData.filter((chat: any) => chat?.name.toLowerCase().includes(query));
  }, [searchQuery, chatData]);

  const mapPreviewUri = useMemo(
    () =>
      buildStaticMapUrl(
        sharedLocations
          .filter((item: any) => Number.isFinite(Number(item?.latitude)) && Number.isFinite(Number(item?.longitude)))
          .map((item: any) => ({ latitude: Number(item.latitude), longitude: Number(item.longitude) })),
        MAP_PREVIEW_WIDTH,
        MAP_PREVIEW_HEIGHT,
      ),
    [sharedLocations],
  );

  const mapFullUri = useMemo(
    () =>
      buildStaticMapUrl(
        sharedLocations
          .filter((item: any) => Number.isFinite(Number(item?.latitude)) && Number.isFinite(Number(item?.longitude)))
          .map((item: any) => ({ latitude: Number(item.latitude), longitude: Number(item.longitude) })),
        MAP_FULL_WIDTH,
        MAP_FULL_HEIGHT,
      ),
    [sharedLocations],
  );

  const lastMessageTexts = useMemo(
    () => filteredChats.map((chat: any) => String(chat?.lastMessage?.text || '')),
    [filteredChats],
  );

  const { data: translatedMessages } = useTranslateTexts({
    texts: lastMessageTexts,
    targetLang: language,
    enabled: !!language && language !== 'EN' && lastMessageTexts.length > 0,
  });

  const msg = (index: number, fallback: string) =>
    translatedMessages?.translations?.[index] || fallback;
  const isChatOnline = (chat: any) =>
    isConnected ? isUserOnline(chat?.userId) : Boolean(chat?.isOnline);

  const handleToggleLocationShare = async () => {
    try {
      if (mySharedLocation) {
        await updateLocationShare({ isShared: false, latitude: null, longitude: null });
        Toast.show({ type: 'success', text1: tx(14, 'Location updated') });
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Toast.show({ type: 'error', text1: tx(12, 'Location permission denied') });
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      await updateLocationShare({
        isShared: true,
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      Toast.show({ type: 'success', text1: tx(13, 'Shared location updated') });
      refetchLocations();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err?.message || 'Could not update location.',
      });
    }
  };

  if (isLoading) {
    return (
      <GradientBackground>
        <SafeAreaView className='flex-1' edges={['top', 'left', 'right']}>
          <Text className='text-black dark:text-white text-center mt-10'>
            {tx(0, 'Loading...')}
          </Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (isError) {
    return (
      <GradientBackground>
        <SafeAreaView className='flex-1' edges={['top', 'left', 'right']}>
          <View className='flex-1 justify-center items-center'>
            <Text className='text-red-500 text-center mt-10'>
              {tx(1, 'Failed to load chats')}
            </Text>
            <Text className='text-black dark:text-white text-center mt-2'>
              {error?.message || tx(2, 'Unknown error')}
            </Text>
          </View>
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
        >
          <View className='mt-3 flex-row items-center mx-6 justify-between'>
            <Text className='font-roboto-bold text-primary dark:text-white text-2xl text-center flex-1'>
              {tx(3, 'Chat')}
            </Text>
            {!isConnected && (
              <View className='px-2 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/40'>
                <Text className='text-yellow-700 dark:text-yellow-300 text-xs'>
                  {tx(7, 'Connecting...')}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => router.push('/screens/home/notification')}
              className='relative'
            >
              <Ionicons
                name='notifications-outline'
                size={24}
                color={isLight ? 'black' : 'white'}
              />
              {unreadCount > 0 && (
                <View className='absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 items-center justify-center'>
                  <Text className='text-white text-[10px] font-roboto-bold'>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View className='mx-6 mt-7 h-12 flex-row items-center rounded-2xl bg-[#F0F2F5] dark:bg-[#FFFFFF0D] px-4 border border-black/20 dark:border-[#FFFFFF0D]'>
            <Feather
              name='search'
              size={18}
              color={isLight ? '#475569' : 'white'}
            />
            <TextInput
              placeholder={tx(4, 'Search chats...')}
              placeholderTextColor={isLight ? '#6B7280' : 'rgba(255,255,255,0.6)'}
              returnKeyType='search'
              className='ml-2 flex-1 text-base text-black dark:text-white'
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View className='mx-6 mt-4'>
            <TouchableOpacity
              activeOpacity={mapPreviewUri ? 0.9 : 1}
              disabled={!mapPreviewUri}
              onPress={() => setFullMapVisible(true)}
              className='w-full h-[120px] rounded-2xl overflow-hidden border border-black/20 dark:border-[#FFFFFF1A] bg-[#E6EEF8] dark:bg-[#1A2433]'
            >
              <Image
                source={{ uri: mapPreviewUri }}
                resizeMode='cover'
                style={{ width: '100%', height: '100%' }}
              />
              {sharedLocations.length === 0 && (
                <View className='absolute left-0 right-0 top-0 bottom-0 items-center justify-center'>
                  <Text className='text-white text-sm bg-black/40 px-3 py-1 rounded-full'>
                    {tx(8, 'No shared locations yet')}
                  </Text>
                </View>
              )}
              {!!mapPreviewUri && (
                <View className='absolute left-0 right-0 bottom-0 bg-black/40 px-3 py-2'>
                  <Text className='text-white text-xs'>
                    {tx(9, 'Tap to open full map')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className='mt-3 self-start px-4 py-2 rounded-full bg-black dark:bg-white'
              onPress={handleToggleLocationShare}
              disabled={isUpdatingLocation}
            >
              <Text className='text-white dark:text-black text-xs font-roboto-semibold'>
                {mySharedLocation ? tx(11, 'Hide my location') : tx(10, 'Share my location')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className='mx-6 mt-6'>
              {filteredChats.map((chat: any, index: number) => {
                const onlineNow = isChatOnline(chat);
                return (
                  <View key={index}>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/screens/chat/chat-screen',
                          params: {
                            userId: chat?.userId,
                            userName: chat?.name,
                            userImage: chat?.profileImageUrl || null,
                            conversationId: chat?.conversationId,
                            senderId: chat?.lastMessage?.senderId,
                            receiverId: chat?.userId,
                          },
                        })
                      }
                      className='flex-row justify-between  my-3'
                    >
                      <View className='w-[70%] flex-row gap-2 items-center'>
                        {chat?.unreadCount !== 0 && (
                          <View className=' bg-[#007AFF] h-2 w-2 rounded-full' />
                        )}
                        <TouchableOpacity
                          onPress={() => router.push('/(tabs)/profile')}
                          className='mt-2'
                        >
                          <View className='relative'>
                            <UserAvatar uri={chat?.profileImageUrl || null} size={46} />
                            <View
                              className={`h-3 w-3 rounded-full absolute right-0 bottom-0 border border-white ${
                                onlineNow ? 'bg-[#00B56C]' : 'bg-red-500'
                              }`}
                            />
                          </View>
                        </TouchableOpacity>
                        <View className='w-5/6'>
                          <Text
                            className='text-primary dark:text-white font-roboto-semibold text-xl'
                            numberOfLines={1}
                          >
                            {chat?.name}
                          </Text>
                          <Text
                            className='text-secondary dark:text-white/80 font-roboto-regular mt-1'
                            numberOfLines={1}
                          >
                            {msg(index, chat?.lastMessage?.text || '')}
                          </Text>
                        </View>
                      </View>
                      <View className='flex-1 items-end'>
                        <Text
                          className='text-secondary dark:text-white/80 text-center'
                          numberOfLines={1}
                        >
                          {chat?.lastMessage?.createdAt
                            ? formatMessageTime(chat.lastMessage.createdAt)
                            : ''}
                        </Text>
                        <Text
                          className={`text-xs mt-1 ${onlineNow ? 'text-green-500' : 'text-red-400'}`}
                        >
                          {onlineNow ? tx(5, 'Online') : tx(6, 'Offline')}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View className='border-b border-black/20 dark:border-[#FFFFFF0D] w-full'></View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <Modal visible={fullMapVisible} animationType='slide' transparent>
            <View className='flex-1 bg-black/80 justify-end'>
              <View className='h-[80%] bg-white dark:bg-[#0B0F15] rounded-t-3xl p-4'>
                <View className='flex-row items-center justify-between mb-3'>
                  <Text className='text-black dark:text-white font-roboto-semibold text-lg'>
                    {tx(15, 'Shared Locations')}
                  </Text>
                  <TouchableOpacity onPress={() => setFullMapVisible(false)}>
                    <Text className='text-blue-500 font-roboto-medium'>{tx(16, 'Close')}</Text>
                  </TouchableOpacity>
                </View>

                {!!mapFullUri ? (
                  <Image
                    source={{ uri: mapFullUri }}
                    resizeMode='cover'
                    style={{ width: '100%', height: 320, borderRadius: 14 }}
                  />
                ) : (
                  <View className='h-[220px] items-center justify-center bg-[#E6EEF8] dark:bg-[#1A2433] rounded-2xl'>
                    <Text className='text-black/60 dark:text-white/60'>
                      {tx(8, 'No shared locations yet')}
                    </Text>
                  </View>
                )}

                <ScrollView className='mt-4'>
                  {sharedLocations.map((item: any) => (
                    <View
                      key={String(item.userId)}
                      className='flex-row items-center justify-between py-2 border-b border-black/10 dark:border-white/10'
                    >
                      <View className='flex-row items-center gap-2'>
                        <UserAvatar uri={item?.profileImageUrl || null} size={34} />
                        <Text className='text-black dark:text-white text-sm'>{item?.name}</Text>
                      </View>
                      <Text className='text-black/60 dark:text-white/60 text-xs'>
                        {Number(item?.latitude).toFixed(4)}, {Number(item?.longitude).toFixed(4)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
};

export default ChatsList;


