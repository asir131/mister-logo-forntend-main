import { connectSocket } from '@/lib/socketClient';
import { getAuth } from '@/store/auth.store';
import { useEffect, useRef, useState } from 'react';

type PresencePayload = {
  userId?: string;
  id?: string;
  status?: 'online' | 'offline';
  online?: boolean;
  onlineUserIds?: string[];
};

export const useSocketPresence = () => {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;

    socketRef.current = socket;
    setIsConnected(Boolean(socket.connected));

    const auth = getAuth();
    const myId = auth.user?.id;

    const setOnlineList = (ids: string[]) => {
      setOnlineIds(new Set((ids || []).filter(Boolean).map((id) => String(id))));
    };

    const addOnline = (id?: string) => {
      if (!id) return;
      setOnlineIds((prev) => {
        const next = new Set(prev);
        next.add(String(id));
        return next;
      });
    };

    const removeOnline = (id?: string) => {
      if (!id) return;
      setOnlineIds((prev) => {
        const next = new Set(prev);
        next.delete(String(id));
        return next;
      });
    };

    const onConnect = () => {
      setIsConnected(true);
      if (myId) {
        socket.emit('presence:join', { userId: myId });
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setOnlineIds(new Set());
    };

    const onPresenceList = (payload: PresencePayload | string[]) => {
      if (Array.isArray(payload)) {
        setOnlineList(payload);
        return;
      }
      if (Array.isArray(payload?.onlineUserIds)) {
        setOnlineList(payload.onlineUserIds);
      }
    };

    const onPresenceUpdate = (payload: PresencePayload) => {
      const id = payload?.userId || payload?.id;
      if (!id) return;
      if (payload?.status === 'online' || payload?.online === true) addOnline(id);
      if (payload?.status === 'offline' || payload?.online === false) removeOnline(id);
    };

    const onUserOnline = (payload: PresencePayload) => {
      addOnline(payload?.userId || payload?.id);
    };

    const onUserOffline = (payload: PresencePayload) => {
      removeOnline(payload?.userId || payload?.id);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected && myId) {
      socket.emit('presence:join', { userId: myId });
    }
    socket.on('presence:list', onPresenceList);
    socket.on('presence:update', onPresenceUpdate);
    socket.on('user:online', onUserOnline);
    socket.on('user:offline', onUserOffline);

    return () => {
      if (myId) {
        socket.emit('presence:leave', { userId: myId });
      }
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('presence:list', onPresenceList);
      socket.off('presence:update', onPresenceUpdate);
      socket.off('user:online', onUserOnline);
      socket.off('user:offline', onUserOffline);
    };
  }, []);

  const isUserOnline = (userId?: string | null) => !!userId && onlineIds.has(String(userId));

  return { onlineIds, isUserOnline, isConnected };
};
