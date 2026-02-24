import { MaterialCommunityIcons, Octicons } from "@expo/vector-icons";
import UserAvatar from "@/components/ui/UserAvatar";
import { router } from "expo-router";
import { useTranslateTexts } from "@/hooks/app/translate";
import useLanguageStore from "@/store/language.store";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import useThemeStore from "@/store/theme.store";

type NotificationCardProps = {
  img?: string | null;
  name: string;
  reson: string;
  time: string;
  className?: string;
  type?:
    | "like"
    | "comment"
    | "follow"
    | "chat"
    | "message"
    | "share"
    | "payment"
    | "support"
    | "system";
  showMenu?: boolean;
  onMenuToggle?: (id: string) => void;
  onMenuClose?: () => void;
  id: string;
  userId?: string;
  isRead?: boolean;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onPress?: () => void;
};

const NotificationCard = ({
  img,
  name,
  reson,
  time,
  className,
  type,
  showMenu = false,
  onMenuToggle,
  onMenuClose,
  id,
  userId,
  isRead,
  onMarkAsRead,
  onDelete,
  onPress,
}: NotificationCardProps) => {
  const [internalRead, setInternalRead] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const { mode } = useThemeStore();
  const isLight = mode === "light";
  const { language } = useLanguageStore();
  const { data: t } = useTranslateTexts({
    texts: ["Mark as read", "Delete"],
    targetLang: language,
    enabled: !!language && language !== "EN",
  });
  const tx = (i: number, fallback: string) =>
    t?.translations?.[i] || fallback;
  const effectiveRead = isRead ?? internalRead;

  const handleMarkAsRead = () => {
    if (onMarkAsRead) {
      onMarkAsRead(id);
    } else {
      setInternalRead(true);
    }
    onMenuClose?.();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(id);
    } else {
      setIsDeleted(true);
    }
    onMenuClose?.();
  };

  if (isDeleted) {
    return null;
  }

  return (
    <View
      className={`bg-[#F0F2F5] dark:bg-[#FFFFFF0D] py-5 px-4 rounded-xl flex-row justify-between gap-5 ${className} ${
        effectiveRead ? "opacity-60" : ""
      }`}
    >
      <TouchableOpacity
        onPress={() => {
          if (userId) {
            router.push({
              pathname: "/screens/profile/other-profile",
              params: { id: userId },
            });
          } else {
            router.push("/(tabs)/profile");
          }
        }}
        className="relative"
      >
        <UserAvatar uri={img || null} size={40} />

        {type === "like" && (
          <View className="absolute right-0 bottom-5">
            <MaterialCommunityIcons name="cards-heart" size={24} color="#F6339A" />
          </View>
        )}

        {type === "comment" && (
          <View className="absolute right-0 bottom-5 bg-white rounded-full p-1">
            <MaterialCommunityIcons
              name="comment-text-outline"
              size={16}
              color="#2B7FFF"
            />
          </View>
        )}

        {type === "follow" && (
          <View className="absolute -right-2 bottom-3 bg-white rounded-full p-1">
            <Octicons name="person-add" size={19} color="#2B7FFF" />
          </View>
        )}

        {type === "chat" && (
          <View className="absolute -right-1 bottom-3 bg-white rounded-full p-1">
            <MaterialCommunityIcons
              name="message-text-outline"
              size={18}
              color="#2B7FFF"
            />
          </View>
        )}

        {type === "message" && (
          <View className="absolute -right-1 bottom-3 bg-white rounded-full p-1">
            <MaterialCommunityIcons
              name="message-reply-text-outline"
              size={18}
              color="#2B7FFF"
            />
          </View>
        )}

        {type === "share" && (
          <View className="absolute -right-1 bottom-3 bg-white rounded-full p-1">
            <MaterialCommunityIcons
              name="share-variant"
              size={18}
              color="#0EA5E9"
            />
          </View>
        )}

        {type === "payment" && (
          <View className="absolute -right-1 bottom-3 bg-white rounded-full p-1">
            <MaterialCommunityIcons
              name="credit-card-outline"
              size={18}
              color="#16A34A"
            />
          </View>
        )}

        {type === "support" && (
          <View className="absolute -right-1 bottom-3 bg-white rounded-full p-1">
            <MaterialCommunityIcons
              name="lifebuoy"
              size={18}
              color="#F97316"
            />
          </View>
        )}

        {type === "system" && (
          <View className="absolute -right-1 bottom-3 bg-white rounded-full p-1">
            <MaterialCommunityIcons
              name="bell-ring-outline"
              size={18}
              color="#6B7280"
            />
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity className="flex-1" activeOpacity={0.8} onPress={onPress}>
        <Text className="font-roboto-semibold text-primary dark:text-white text-lg capitalize">
          {name}
        </Text>
        <Text className="font-roboto-regular text-sm text-primary dark:text-white mt-1 capitalize">
          {reson}
        </Text>
        <Text className="font-roboto-regular text-sm text-primary dark:text-white mt-1 capitalize">
          {time}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onMenuToggle?.(id)}>
        <MaterialCommunityIcons name="dots-vertical" size={24} color={isLight ? "#9CA3AF" : "white"} />
      </TouchableOpacity>

      {showMenu && (
        <View
          className={`absolute right-[35px] top-[20px] rounded-lg shadow-lg z-10 min-w-[200px] ${
            isLight ? "bg-white" : "bg-[#1c1c1d]"
          }`}
        >
          <TouchableOpacity
            onPress={handleMarkAsRead}
            className="px-4 py-3 flex-row items-center border-b border-black/20 dark:border-[#FFFFFF0D]"
          >
            <MaterialCommunityIcons name="check" size={16} color="#10B981" />
            <Text className="text-black dark:text-white ml-2 text-sm">{tx(0, "Mark as read")}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} className="px-4 py-3 flex-row items-center">
            <MaterialCommunityIcons name="delete" size={16} color="#EF4444" />
            <Text className="text-black dark:text-white ml-2 text-sm">{tx(1, "Delete")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default NotificationCard;



