import UserAvatar from '@/components/ui/UserAvatar';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

const MessageReceiverCard = () => {
  return (
    <View className='flex-row gap-3 items-end mt-7'>
      <TouchableOpacity className='mt-2 relative'>
        <UserAvatar size={40} />
        <View className='h-3 w-3 rounded-full bg-[#00B56C] absolute right-0 bottom-0' />
      </TouchableOpacity>
      <View className='bg-[#F0F2F5] dark:bg-[#FFFFFF0D] border-black/20 dark:border-[#FFFFFF0D] border rounded-[10px] w-[75%] py-2.5 px-3'>
        <Text className='font-roboto-regular text-[#434343]'>
          Hey! How was the new design project coming along? Hey! How was the new
          design project coming along?
        </Text>
        <Text className=' text-sm font-roboto-regular text-[#434343] mt-3'>
          11:00 AM
        </Text>
      </View>
    </View>
  );
};

export default MessageReceiverCard;

