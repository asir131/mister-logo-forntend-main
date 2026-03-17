import useThemeStore from '@/store/theme.store';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { toProxyMediaUrl } from '@/lib/mediaProxy';

type UserAvatarProps = {
  uri?: string | null;
  size?: number;
  isLoading?: boolean;
  borderWidth?: number;
  borderColor?: string;
  backgroundColor?: string;
  iconSize?: number;
};

const UserAvatar = ({
  uri,
  size = 40,
  isLoading = false,
  borderWidth = 0,
  borderColor = 'transparent',
  backgroundColor,
  iconSize,
}: UserAvatarProps) => {
  const { mode } = useThemeStore();
  const isLight = mode === 'light';
  const fallbackBg = backgroundColor || (isLight ? '#E5E7EB' : '#374151');
  const iconColor = isLight ? '#6B7280' : '#D1D5DB';
  const resolvedUri = toProxyMediaUrl(uri || '');

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        borderWidth,
        borderColor,
        backgroundColor: fallbackBg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isLoading ? (
        <ActivityIndicator size='small' color={isLight ? '#111827' : '#FFFFFF'} />
      ) : resolvedUri ? (
        <Image
          key={resolvedUri}
          source={{ uri: resolvedUri }}
          style={{ width: '100%', height: '100%' }}
          contentFit='cover'
        />
      ) : (
        <Ionicons name='person' size={iconSize || Math.max(16, size * 0.52)} color={iconColor} />
      )}
    </View>
  );
};

export default UserAvatar;

