import GradientBackground from '@/components/main/GradientBackground';
import { useGetAllChatList } from '@/hooks/app/chat';
import { useSocketPresence } from '@/hooks/app/useSocketPresence';
import { useTranslateTexts } from '@/hooks/app/translate';
import useThemeStore from '@/store/theme.store';
import useLanguageStore from '@/store/language.store';
import useNotificationStore from '@/store/notification.store';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import UserAvatar from '@/components/ui/UserAvatar';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
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
  } else {
    return messageDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
};

const ChatsList = () => {
  const { mode } = useThemeStore();
  const isLight = mode === 'light';
  const unreadCount = useNotificationStore(state => state.badgeCount);
  const { data, isLoading, isError, error } = useGetAllChatList();
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
    ],
    targetLang: language,
    enabled: !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;

  // console.log(
  //   JSON.stringify(data,null,2)
  // );

  const chatData = useMemo(() => (Array.isArray((data as any)?.chats) ? (data as any).chats : []), [data]);

  const [searchQuery, setSearchQuery] = useState('');

  // Filter chats based on search query
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) {
      return chatData;
    }

    const query = searchQuery.toLowerCase();
    return chatData.filter((chat: any) =>
      chat?.name.toLowerCase().includes(query)
    );
  }, [searchQuery, chatData]);

  const lastMessageTexts = useMemo(
    () =>
      filteredChats.map((chat: any) => String(chat?.lastMessage?.text || '')),
    [filteredChats]
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
      <SafeAreaView className='flex-1  ' edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* headers */}
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

          {/* search bar */}
          <View className='mx-6 mt-7 h-12 flex-row items-center rounded-2xl bg-[#F0F2F5] dark:bg-[#FFFFFF0D] px-4 border border-black/20 dark:border-[#FFFFFF0D]'>
            {/* Search Icon */}
            <Feather
              name='search'
              size={18}
              color={isLight ? '#475569' : 'white'}
            />

            {/* Input */}
            <TextInput
              placeholder={tx(4, 'Search chats...')}
              placeholderTextColor={isLight ? '#6B7280' : 'rgba(255,255,255,0.6)'}
              returnKeyType='search'
              className='ml-2 flex-1 text-base text-black dark:text-white'
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* chat list  */}
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
                          <UserAvatar
                            uri={chat?.profileImageUrl || null}
                            size={46}
                          />
                          <View
                            className={`h-3 w-3 rounded-full absolute right-0 bottom-0 border border-white ${
                              onlineNow
                                ? 'bg-[#00B56C]'
                                : 'bg-red-500'
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
                        className={`text-xs mt-1 ${
                          onlineNow
                            ? 'text-green-500'
                            : 'text-red-400'
                        }`}
                      >
                        {onlineNow
                          ? tx(5, 'Online')
                          : tx(6, 'Offline')}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* border */}
                  <View className='border-b border-black/20 dark:border-[#FFFFFF0D] w-full'></View>
                </View>
                );
              })}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
};

export default ChatsList;

