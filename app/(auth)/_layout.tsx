import { router, Stack } from 'expo-router';
import React, { useEffect } from 'react';
import useAuthStore from '@/store/auth.store';

const AuthLayout = () => {
  const { user, authReady } = useAuthStore();

  useEffect(() => {
    if (!authReady) return;
    if (user?.token) {
      router.replace('/(tabs)/trending');
    }
  }, [authReady, user?.token]);

  if (!authReady) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
};

export default AuthLayout;
