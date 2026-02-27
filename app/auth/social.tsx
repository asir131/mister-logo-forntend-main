import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

// OAuth callback landing route for deep links like `unap://auth/social?...`
export default function SocialAuthCallback() {
  const params = useLocalSearchParams();

  useEffect(() => {
    const status = typeof params?.status === 'string' ? params.status : '';
    const target = status === 'success' ? '/(tabs)/trending' : '/(auth)/login';
    router.replace(target as any);
  }, [params]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size='small' color='#fff' />
    </View>
  );
}
