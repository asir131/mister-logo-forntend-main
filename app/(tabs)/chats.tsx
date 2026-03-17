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
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { toProxyMediaUrl } from '@/lib/mediaProxy';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
let Mapbox: any = null;
try {
  // Lazy require so Expo Go doesn't crash when native module isn't available.
  Mapbox = require('@rnmapbox/maps');
} catch {
  Mapbox = null;
}
if (Mapbox && MAPBOX_TOKEN) {
  Mapbox.setAccessToken(MAPBOX_TOKEN);
}

const DEFAULT_COORDINATE: [number, number] = [90.4125, 23.8103];

const FALLBACK_CITY_COORDINATES: [number, number][] = [
  [90.4125, 23.8103], // Dhaka
  [77.209, 28.6139], // Delhi
  [74.3587, 31.5204], // Lahore
  [88.3639, 22.5726], // Kolkata
  [78.4867, 17.385], // Hyderabad
  [80.2707, 13.0827], // Chennai
  [85.324, 27.7172], // Kathmandu
  [106.6297, 10.8231], // Ho Chi Minh City
];

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

const isRenderableCoordinate = (lat: number, lng: number) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -85 || lat > 85 || lng < -180 || lng > 180) return false;

  // Avoid null-island style bad payloads that put map in ocean.
  if (Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001) return false;

  return true;
};

const pickMapCenter = (
  locations: Array<{ latitude: number; longitude: number }>,
): [number, number] => {
  if (!locations.length) return DEFAULT_COORDINATE;

  const lats = locations.map(item => item.latitude);
  const lngs = locations.map(item => item.longitude);
  const centerLat = lats.reduce((sum, value) => sum + value, 0) / lats.length;
  const centerLng = lngs.reduce((sum, value) => sum + value, 0) / lngs.length;

  return [centerLng, centerLat];
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
    return chatData.filter((chat: any) =>
      String(chat?.name || '').toLowerCase().includes(query)
    );
  }, [searchQuery, chatData]);

  const validSharedLocations = useMemo(
    () =>
      sharedLocations
        .filter((item: any) =>
          isRenderableCoordinate(Number(item?.latitude), Number(item?.longitude))
        )
        .map((item: any) => ({
          userId: String(item?.userId || ''),
          name: String(item?.name || 'User'),
          profileImageUrl: item?.profileImageUrl || null,
          latitude: Number(item.latitude),
          longitude: Number(item.longitude),
        })),
    [sharedLocations],
  );

  const randomCityCenter = useMemo<[number, number]>(() => {
    const index = Math.floor(Math.random() * FALLBACK_CITY_COORDINATES.length);
    return FALLBACK_CITY_COORDINATES[index] || DEFAULT_COORDINATE;
  }, []);

  const mapCenter = useMemo(
    () =>
      validSharedLocations.length > 0
        ? pickMapCenter(validSharedLocations)
        : randomCityCenter,
    [validSharedLocations, randomCityCenter],
  );

  const mapZoom = validSharedLocations.length > 0 ? 11 : 10;
  const mySharedCoordinate = useMemo<[number, number] | null>(() => {
    const lat = Number((mySharedLocation as any)?.latitude);
    const lng = Number((mySharedLocation as any)?.longitude);
    if (!isRenderableCoordinate(lat, lng)) return null;
    return [lng, lat];
  }, [mySharedLocation]);

  const previewMapCenter = mySharedCoordinate || randomCityCenter;
  const previewMapZoom = mySharedCoordinate ? 13 : 12;
  const fullMapCenter = mySharedCoordinate || mapCenter;
  const fullMapZoom = mySharedCoordinate ? 13 : mapZoom;
  const hasMapboxToken = MAPBOX_TOKEN.length > 0;
  const isMapboxAvailable = Boolean(Mapbox && Mapbox.MapView);
  const canUseMapbox = isMapboxAvailable && hasMapboxToken;
  const mapFallbackLabel = !isMapboxAvailable ? 'Map view unavailable' : 'Mapbox token missing';

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

  const handleOpenLocationProfile = (targetUserId: string) => {
    if (!targetUserId) return;

    if (String(targetUserId) === String(user?.id || '')) {
      router.push('/(tabs)/profile');
      return;
    }

    router.push({
      pathname: '/screens/profile/other-profile',
      params: { id: String(targetUserId) },
    });
  };

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
            <View className='w-full h-[140px] rounded-2xl overflow-hidden border border-black/20 dark:border-[#FFFFFF1A] bg-[#E6EEF8] dark:bg-[#1A2433]'>
              {canUseMapbox ? (
                <Mapbox.MapView
                  style={{ flex: 1 }}
                  styleURL={Mapbox.StyleURL.Street}
                  logoEnabled={false}
                  attributionEnabled={false}
                  scaleBarEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  zoomEnabled={false}
                  scrollEnabled={false}
                >
                  <Mapbox.Camera
                    centerCoordinate={previewMapCenter}
                    zoomLevel={previewMapZoom}
                    animationMode='none'
                  />
                  {validSharedLocations.map(location => (
                    <Mapbox.MarkerView
                      key={`preview-${location.userId}`}
                      id={`preview-${location.userId}`}
                      coordinate={[location.longitude, location.latitude]}
                      anchor={{ x: 0.5, y: 1 }}
                    >
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => handleOpenLocationProfile(location.userId)}
                        className='items-center'
                      >
                        <View className='h-7 w-7 rounded-full overflow-hidden border border-white bg-[#111827]'>
                          {location.profileImageUrl ? (
                            <Image
                              source={{ uri: toProxyMediaUrl(String(location.profileImageUrl)) }}
                              style={{ width: '100%', height: '100%' }}
                            />
                          ) : (
                            <View className='flex-1 items-center justify-center'>
                              <Ionicons name='person' size={13} color='#D1D5DB' />
                            </View>
                          )}
                        </View>
                        <View className='mt-1 rounded-md px-1.5 py-0.5 bg-black/55'>
                          <Text className='text-white text-[10px]' numberOfLines={1}>
                            {location.name}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </Mapbox.MarkerView>
                  ))}
                </Mapbox.MapView>
              ) : (
                <View className='flex-1 items-center justify-center'>
                  <Text className='text-black/60 dark:text-white/60 text-xs'>
                    {mapFallbackLabel}
                  </Text>
                </View>
              )}

              {validSharedLocations.length === 0 && (
                <View className='absolute left-0 right-0 top-0 bottom-0 items-center justify-center'>
                  <Text className='text-white text-sm bg-black/40 px-3 py-1 rounded-full'>
                    {tx(8, 'No shared locations yet')}
                  </Text>
                </View>
              )}

              {canUseMapbox && (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setFullMapVisible(true)}
                  className='absolute left-0 right-0 bottom-0 bg-black/40 px-3 py-2'
                >
                  <Text className='text-white text-xs'>
                    {tx(9, 'Tap to open full map')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

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
                          onPress={() => handleOpenLocationProfile(chat?.userId)}
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
                          <TouchableOpacity onPress={() => handleOpenLocationProfile(chat?.userId)} activeOpacity={0.7}>
                            <Text
                              className='text-primary dark:text-white font-roboto-semibold text-xl'
                              numberOfLines={1}
                            >
                              {chat?.name}
                            </Text>
                          </TouchableOpacity>
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

                {canUseMapbox ? (
                  <View className='h-[320px] rounded-2xl overflow-hidden'>
                    <Mapbox.MapView
                      style={{ flex: 1 }}
                      styleURL={Mapbox.StyleURL.Street}
                      logoEnabled={false}
                      attributionEnabled={false}
                      scaleBarEnabled={false}
                    >
                      <Mapbox.Camera
                        centerCoordinate={fullMapCenter}
                        zoomLevel={fullMapZoom}
                        animationMode='none'
                      />
                      {validSharedLocations.map(location => (
                        <Mapbox.MarkerView
                          key={`full-${location.userId}`}
                          id={`full-${location.userId}`}
                          coordinate={[location.longitude, location.latitude]}
                      anchor={{ x: 0.5, y: 1 }}
                        >
                          <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => handleOpenLocationProfile(location.userId)}
                            className='items-center'
                          >
                            <View className='h-9 w-9 rounded-full overflow-hidden border border-white bg-[#111827]'>
                              {location.profileImageUrl ? (
                                <Image
                                  source={{ uri: toProxyMediaUrl(String(location.profileImageUrl)) }}
                                  style={{ width: '100%', height: '100%' }}
                                />
                              ) : (
                                <View className='flex-1 items-center justify-center'>
                                  <Ionicons name='person' size={15} color='#D1D5DB' />
                                </View>
                              )}
                            </View>
                            <View className='mt-1 rounded-md px-2 py-0.5 bg-black/55 max-w-[120px]'>
                              <Text className='text-white text-[11px]' numberOfLines={1}>
                                {location.name}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        </Mapbox.MarkerView>
                      ))}
                    </Mapbox.MapView>
                  </View>
                ) : (
                  <View className='h-[220px] items-center justify-center bg-[#E6EEF8] dark:bg-[#1A2433] rounded-2xl'>
                    <Text className='text-black/60 dark:text-white/60'>
                      {mapFallbackLabel}
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



















