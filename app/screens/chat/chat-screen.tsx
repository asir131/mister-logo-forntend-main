import BackButton from '@/components/button/BackButton';
import GradientBackground from '@/components/main/GradientBackground';
import ChatSettings from '@/components/modal/ChatSettings';
import {
  useChattingSendMessage,
  useGetAllMessages,
  useMarkMessagesAsRead,
} from '@/hooks/app/chat';
import { useTranslateTexts } from '@/hooks/app/translate';
import { useSocketChat } from '@/hooks/app/useSocketChat';
import { useSocketPresence } from '@/hooks/app/useSocketPresence';
import useLanguageStore from '@/store/language.store';
import useThemeStore from '@/store/theme.store';
import useAuthStore from '@/store/auth.store';
import Entypo from '@expo/vector-icons/Entypo';
import Feather from '@expo/vector-icons/Feather';
import UserAvatar from '@/components/ui/UserAvatar';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const ChatScreen = () => {
  const flatRef = useRef<FlatList>(null);
  const params = useLocalSearchParams();
  const [showMenu, setShowMenu] = useState(false);
  const [message, setMessage] = useState('');
  const authUserId = useAuthStore(state => state.user?.id);
  const { mode } = useThemeStore();
  const isLight = mode === 'light';
  const iconColor = isLight ? 'black' : 'white';
  const { language } = useLanguageStore();
  const { data: t } = useTranslateTexts({
    texts: [
      'Loading messages...',
      'Failed to load messages',
      'Unknown error',
      'Online',
      'Offline',
      'Type a message...',
      'Send',
      'Connecting...',
    ],
    targetLang: language,
    enabled: !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) => t?.translations?.[i] || fallback;

  const userName = (params.userName as string) || 'Unknown User';
  const userImage = params.userImage as string | undefined;
  const userId = params.userId as string;
  const conversationId = params.conversationId as string;
  const senderIdParam = params.senderId as string;
  const receiverId = params.receiverId as string;
  const peerUserId = receiverId || userId;
  const myUserId = authUserId || senderIdParam;

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetAllMessages(userId, { limit: 20 });
  const { mutateAsync: sendMessage, isPending: isSendingMessage } =
    useChattingSendMessage();
  const { mutate: markAsRead } = useMarkMessagesAsRead();
  const { isConnected, sendMessage: sendSocketMessage } = useSocketChat(
    peerUserId,
    conversationId,
    myUserId
  );
  const { isUserOnline, isConnected: isPresenceConnected } = useSocketPresence();

  // @ts-ignore
  const pages = data?.pages || [];
  const firstPage = (pages?.[0] as any) || {};
  const participant = (firstPage?.participant as any) || {};
  const participantIsOnline = Boolean(participant?.isOnline);
  const isReceiverOnline = isPresenceConnected
    ? isUserOnline(peerUserId)
    : participantIsOnline;
  const isBlockedByMe = Boolean(participant?.blockedByMe);
  const isBlockedMe = Boolean(participant?.blockedMe);
  const isMessagingBlocked = isBlockedByMe || isBlockedMe;
  const messages = [...pages].reverse().flatMap((page: any) => page?.messages || []);
  const messageTexts = messages.map((msg: any) => String(msg?.text || ''));
  const { data: translatedMessages } = useTranslateTexts({
    texts: messageTexts,
    targetLang: language,
    enabled: !!language && language !== 'EN' && messageTexts.length > 0,
  });
  const msgText = (index: number, fallback: string) =>
    translatedMessages?.translations?.[index] || fallback;

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      if (isMessagingBlocked) {
        Toast.show({
          type: 'error',
          text1: 'Message Blocked',
          text2: 'Messaging is blocked for this user.',
        });
        return;
      }

      if (!peerUserId) {
        Toast.show({
          type: 'error',
          text1: 'Send Failed',
          text2: 'Receiver not found.',
        });
        return;
      }

      // Add temporary message immediately for better UX
      if (isConnected) {
        // Use socket for real-time messaging
        await sendSocketMessage(peerUserId, message.trim());
      } else {
        // Fallback to REST API
        await sendMessage({
          data: { text: message.trim() },
          userId: peerUserId,
        });
      }
      setMessage(''); // Clear input after sending
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorText =
        error instanceof Error && error.message
          ? error.message
          : 'Could not send message.';
      Toast.show({
        type: 'error',
        text1: 'Send Failed',
        text2: errorText,
      });
    }
  };

  useEffect(() => {
    // Mark messages as read when chat screen opens
    if (userId) {
      markAsRead(userId);
    }
  }, [userId, markAsRead]);

  const prevCountRef = useRef(0);
  const loadingOlderRef = useRef(false);
  useEffect(() => {
    if (isFetchingNextPage) return;
    if (messages.length === 0) {
      prevCountRef.current = 0;
      return;
    }
    if (loadingOlderRef.current) {
      prevCountRef.current = messages.length;
      loadingOlderRef.current = false;
      return;
    }
    if (messages.length > prevCountRef.current) {
      setTimeout(() => {
        flatRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    prevCountRef.current = messages.length;
  }, [messages.length, isFetchingNextPage]);

  const renderMessage = ({ item, index }: any) => {
    const isCurrentUser = item.senderId === myUserId;

    /** ================= RIGHT SIDE (ME) ================= */
    if (isCurrentUser) {
      return (
        <View className='flex-row justify-end mb-4 px-4 mt-8'>
          <View className='bg-[#F0F2F5] dark:bg-[#FFFFFF0D] border border-black/20 dark:border-[#FFFFFF0D] rounded-[10px] w-[75%] py-2.5 px-3'>
            <Text className='font-roboto-semibold text-primary dark:text-white'>
              {msgText(index, item.text)}
            </Text>
            <Text className='text-sm font-roboto-regular text-primary dark:text-white mt-3'>
              {new Date(item.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </Text>
          </View>
        </View>
      );
    }

    /** ================= LEFT SIDE (OTHER USER) ================= */
    return (
      <View className='flex-row gap-3 items-end mt-7 px-4'>
        <TouchableOpacity className='mt-2 relative'>
          <UserAvatar
            uri={userImage || null}
            size={40}
          />
          <View className='h-3 w-3 rounded-full bg-[#00B56C] absolute right-0 bottom-0' />
        </TouchableOpacity>

        <View className='bg-[#F0F2F5] dark:bg-[#FFFFFF0D] border border-black/20 dark:border-[#FFFFFF0D] rounded-[10px] w-[75%] py-2.5 px-3'>
          <Text className='font-roboto-semibold text-[#434343] dark:text-white'>
            {msgText(index, item.text)}
          </Text>
          <Text className='text-sm font-roboto-regular text-[#434343] dark:text-white mt-3'>
            {new Date(item.createdAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <GradientBackground>
        <SafeAreaView className='flex-1 items-center justify-center'>
          <Text className='text-black dark:text-white'>
            {tx(0, 'Loading messages...')}
          </Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (isError) {
    return (
      <GradientBackground>
        <SafeAreaView className='flex-1 items-center justify-center'>
          <Text className='text-red-500'>
            {tx(1, 'Failed to load messages')}
          </Text>
          <Text className='text-black dark:text-white mt-2'>
            {error?.message || tx(2, 'Unknown error')}
          </Text>
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
          {/* Header */}
          <View className='flex-row justify-between items-center mx-6 mt-5 mb-2'>
            <View className='flex-row items-center gap-5'>
              <BackButton />
              <TouchableOpacity className='mt-2 relative'>
                <UserAvatar
                  uri={userImage || null}
                  size={46}
                />
                <View
                  className={`h-3 w-3 rounded-full absolute right-0 bottom-0 border border-white ${
                    isReceiverOnline ? 'bg-[#00B56C]' : 'bg-red-500'
                  }`}
                />
              </TouchableOpacity>
              <View>
                <Text className='text-primary dark:text-white font-roboto-semibold text-xl'>
                  {userName}
                </Text>
                <View className='flex-row items-center gap-2'>
                  <View
                    className={`w-2 h-2 rounded-full ${
                      isReceiverOnline ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <Text className='text-xs text-secondary dark:text-white/80'>
                    {isReceiverOnline ? tx(3, 'Online') : tx(4, 'Offline')}
                  </Text>
                </View>
              </View>
            </View>
            {!isPresenceConnected && (
              <View className='px-2 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 mr-2'>
                <Text className='text-yellow-700 dark:text-yellow-300 text-xs'>
                  {tx(7, 'Connecting...')}
                </Text>
              </View>
            )}
            <TouchableOpacity onPress={() => setShowMenu(true)}>
              <Entypo
                name='dots-three-horizontal'
                size={24}
                color={iconColor}
              />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(item, index) =>
              `${item._id || item.id || `message-${index}`}`
            }
            renderItem={renderMessage}
            showsVerticalScrollIndicator={false}
            maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
            onScroll={({ nativeEvent }) => {
              const canScroll =
                nativeEvent.contentSize.height > nativeEvent.layoutMeasurement.height;
              if (canScroll && nativeEvent.contentOffset.y <= 50) {
                if (hasNextPage && !isFetchingNextPage) {
                  loadingOlderRef.current = true;
                  fetchNextPage();
                }
              }
            }}
            scrollEventThrottle={200}
          />

          {/* Input */}
          <View className='flex-row items-center py-8 mx-6 gap-3'>
            <TouchableOpacity className='bg-[#F0F2F5] dark:bg-[#FFFFFF0D] h-12 w-12 rounded-full items-center justify-center border border-black/20 dark:border-[#FFFFFF0D]'>
              <Feather name='plus' size={25} color={iconColor} />
            </TouchableOpacity>

            <View className='flex-1 rounded-3xl flex-row items-center px-4 h-12'>
              <TextInput
                placeholder={
                  isMessagingBlocked
                    ? 'Messaging is blocked'
                    : tx(5, 'Type a message...')
                }
                placeholderTextColor={
                  isLight ? '#9ca3af' : 'rgba(255,255,255,0.6)'
                }
                multiline
                value={message}
                onChangeText={setMessage}
                editable={!isMessagingBlocked}
                className='flex-1 text-black dark:text-white text-[15px] border border-black/20 dark:border-[#FFFFFF0D] rounded-[10px] px-3'
              />
            </View>

            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={isSendingMessage || !message.trim() || isMessagingBlocked}
              className={`h-12 w-12 rounded-full items-center justify-center border ${
                isSendingMessage || !message.trim() || isMessagingBlocked
                  ? 'border-black/20 dark:border-[#FFFFFF0D] bg-[#F0F2F5] dark:bg-[#FFFFFF0D]'
                  : 'border-black/20 dark:border-[#FFFFFF0D] bg-[#F0F2F5] dark:bg-[#FFFFFF0D]'
              }`}
            >
              <Feather
                name='send'
                size={24}
                color={
                  isSendingMessage || !message.trim() || isMessagingBlocked
                    ? isLight
                      ? '#9ca3af'
                      : 'rgba(255,255,255,0.6)'
                    : 'white'
                }
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        <ChatSettings
          showMenu={showMenu}
          setShowMenu={setShowMenu}
          userId={peerUserId}
          isBlockedByMe={isBlockedByMe}
        />
      </SafeAreaView>
    </GradientBackground>
  );
};

export default ChatScreen;

