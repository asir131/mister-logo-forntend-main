import { useGetSuggestedArtists } from '@/hooks/app/profile';
import { useTranslateTexts } from '@/hooks/app/translate';
import useLanguageStore from '@/store/language.store';
import UserAvatar from '@/components/ui/UserAvatar';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const SuggestedArtistsCard = ({ className }: { className?: string }) => {
  const { language } = useLanguageStore();
  const { data, isLoading } = useGetSuggestedArtists({ limit: 10 });
  const { data: t } = useTranslateTexts({
    texts: [
      'Suggested Artists',
      'Artist',
      'No suggested artists found',
    ],
    targetLang: language,
    enabled: !!language && language !== 'EN',
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;
  const artists = data?.artists || [];
  const emptyText = tx(2, 'No suggested artists found');
  const defaultRole = tx(1, 'Artist');

  return (
    <View
      className={`bg-[#F0F2F5] dark:bg-[#FFFFFF0D] rounded-3xl ${className} border border-black/20 dark:border-[#FFFFFF0D]`}
    >
      <Text className='text-primary dark:text-white font-roboto-bold text-xl px-4 pt-4'>
        {tx(0, 'Suggested Artists')}
      </Text>
      {isLoading ? (
        <View className='py-8 items-center justify-center'>
          <ActivityIndicator size='small' color='#111827' />
        </View>
      ) : artists.length === 0 ? (
        <View className='py-8 px-4'>
          <Text className='text-secondary dark:text-white/80 text-center text-sm'>
            {emptyText}
          </Text>
        </View>
      ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 24,
          gap: 16,
        }}
      >
        {artists.map((item) => (
          <TouchableOpacity
            onPress={() => {
              if (!item.id) return;
              router.push({
                pathname: '/screens/profile/other-profile',
                params: { id: item.id },
              });
            }}
            key={item.id}
            className='items-center'
            style={{ width: 80 }}
          >
            <UserAvatar
              uri={item.profileImageUrl || null}
              size={60}
            />
            <Text
              className='font-roboto-semibold text-sm text-primary dark:text-white mt-2 text-center'
              numberOfLines={1}
            >
              {item.name || item.username || defaultRole}
            </Text>
            <Text
              className='font-roboto-regular text-xs text-secondary dark:text-white/80 mt-0.5 text-center'
              numberOfLines={1}
            >
              {item.role || defaultRole}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      )}
    </View>
  );
};

export default SuggestedArtistsCard;


