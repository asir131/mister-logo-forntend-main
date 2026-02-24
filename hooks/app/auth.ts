import api from '@/api/axiosInstance';
import { getShortErrorMessage } from '@/lib/error';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

export const useUserRegister = () => {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/api/auth/register', data);
      return res;
    },
    onSuccess: (data: any) => {
      Toast.show({
        type: 'success',
        text1: 'Registration Success',
        text2: data?.message || 'OTP has been sent to your email.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: getShortErrorMessage(error, 'Registration failed.'),
      });
    },
  });
};

export const useUserRegisterOtp = () => {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/api/auth/verify-otp', data);
      return res;
    },
    onSuccess: (data: any) => {
      Toast.show({
        type: 'success',
        text1: 'OTP Verified',
        text2: data?.message || 'Registration completed successfully.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: getShortErrorMessage(error, 'OTP verification failed.'),
      });
    },
  });
};

export const useUserLogin = () => {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/api/auth/login', data);
      return res;
    },
    onSuccess: (data: any) => {
      Toast.show({
        type: 'success',
        text1: 'Login Successful',
        text2: data?.message || 'Welcome back to UNAP!',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: getShortErrorMessage(error, 'Login failed.'),
      });
    },
  });
};

export const useUserForgatePasswordSendMail = () => {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/api/auth/forgot-password', data);
      return res;
    },
    onSuccess: (data: any) => {
      Toast.show({
        type: 'success',
        text1: 'Email Sent',
        text2: data?.message || 'Reset OTP sent to your email.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Request Failed',
        text2: getShortErrorMessage(error, 'Request failed.'),
      });
    },
  });
};

export const useUserForgatePasswordVerifyOtp = () => {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/api/auth/verify-reset-otp', data);
      return res;
    },
    onSuccess: (data: any) => {
      Toast.show({
        type: 'success',
        text1: 'OTP Verified',
        text2: data?.message || 'You can now reset your password.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: getShortErrorMessage(error, 'OTP verification failed.'),
      });
    },
  });
};

export const useUserForgatePasswordResetPassword = () => {
  return useMutation({
    mutationFn: async ({ data, token }: any) => {
      const res = await api.post('/api/auth/reset-password', data, {
        headers: {
          'x-reset-token': token,
        },
      });
      return res;
    },
    onSuccess: (data: any) => {
      Toast.show({
        type: 'success',
        text1: 'Password Reset',
        text2: data?.message || 'Your password has been reset successfully.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Reset Failed',
        text2: getShortErrorMessage(error, 'Reset failed.'),
      });
    },
  });
};

export const useDeleteMyAccount = () => {
  return useMutation({
    mutationFn: async () => {
      const res = await api.delete('/api/auth/delete-account');
      return res;
    },
    onSuccess: (data: any) => {
      Toast.show({
        type: 'success',
        text1: 'Account Deleted',
        text2: data?.message || 'Your account has been deleted.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: getShortErrorMessage(error, 'Could not delete account.'),
      });
    },
  });
};
