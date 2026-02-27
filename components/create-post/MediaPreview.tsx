import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused } from '@react-navigation/native';
import { useAudioPlayer } from 'expo-audio';
import { ResizeMode, Video, type AVPlaybackStatus } from 'expo-av';
import { Image } from 'expo-image';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface MediaPreviewProps {
  photo: string | null;
  video: string | null;
  audio: string | null;
}

const MediaPreview: React.FC<MediaPreviewProps> = ({ photo, video, audio }) => {
  const isFocused = useIsFocused();
  const audioPlayer = useAudioPlayer(audio || '');
  const videoRef = React.useRef<Video | null>(null);

  const [isVideoReady, setIsVideoReady] = React.useState(false);
  const [showSlowVideoHint, setShowSlowVideoHint] = React.useState(false);
  const [videoError, setVideoError] = React.useState<string | null>(null);
  const [videoRenderKey, setVideoRenderKey] = React.useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = React.useState(true);
  const [isVideoMuted, setIsVideoMuted] = React.useState(true);

  const videoUrl = (video || '').trim();

  React.useEffect(() => {
    if (!videoUrl) return;
    setIsVideoReady(false);
    setShowSlowVideoHint(false);
    setVideoError(null);
    setIsVideoPlaying(true);
    setIsVideoMuted(true);
    setVideoRenderKey(prev => prev + 1);
  }, [videoUrl]);

  React.useEffect(() => {
    if (!videoUrl || isVideoReady) return;

    const timer = setTimeout(() => {
      setShowSlowVideoHint(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, [videoUrl, isVideoReady, videoRenderKey]);

  React.useEffect(() => {
    if (!videoUrl) return;

    const syncFocusPlayback = async () => {
      if (!videoRef.current) return;

      try {
        if (!isFocused) {
          await videoRef.current.pauseAsync();
          return;
        }

        if (isVideoPlaying) {
          await videoRef.current.playAsync();
        }
      } catch {
        // ignore transient state errors
      }
    };

    syncFocusPlayback();
  }, [isFocused, isVideoPlaying, videoUrl]);

  const toggleAudioPlayback = () => {
    if (audioPlayer.playing) {
      audioPlayer.pause();
    } else {
      audioPlayer.play();
    }
  };

  const toggleVideoPlayback = async () => {
    if (!videoRef.current) return;

    try {
      if (isVideoPlaying) {
        await videoRef.current.pauseAsync();
        setIsVideoPlaying(false);
      } else {
        await videoRef.current.playAsync();
        setIsVideoPlaying(true);
      }
    } catch {
      setVideoError('Unable to control video playback on this device.');
    }
  };

  const toggleVideoMute = async () => {
    if (!videoRef.current) return;

    const next = !isVideoMuted;
    setIsVideoMuted(next);

    try {
      await videoRef.current.setIsMutedAsync(next);
    } catch {
      setVideoError('Unable to control video audio on this device.');
    }
  };

  const handleRetry = () => {
    if (!videoUrl) return;

    setIsVideoReady(false);
    setShowSlowVideoHint(false);
    setVideoError(null);
    setIsVideoPlaying(true);
    setIsVideoMuted(true);
    setVideoRenderKey(prev => prev + 1);
  };

  const handleVideoStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsVideoPlaying(status.isPlaying);
  };

  const formatTime = (seconds: number) => {
    const safeSeconds = Number(seconds) || 0;
    const totalSeconds = Math.floor(safeSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!photo && !video && !audio) {
    return (
      <View className='w-full h-[100px] justify-center items-center bg-black/10 dark:bg-[#FFFFFF0D] rounded-2xl mb-4 border border-dashed border-black/20 dark:border-[#FFFFFF0D]'>
        <Feather name='image' size={40} color='#666' style={{ opacity: 0.5 }} />
        <Text className='text-gray-400 text-center mt-4 font-roboto-regular'>
          Select media to preview
        </Text>
      </View>
    );
  }

  return (
    <View className='w-full h-[300px] bg-black rounded-2xl mb-4 overflow-hidden relative'>
      {photo && (
        <Image
          source={{ uri: photo }}
          className='absolute inset-0 w-full h-full'
          contentFit='cover'
        />
      )}

      {videoUrl && (
        <>
          <Video
            ref={ref => {
              videoRef.current = ref;
            }}
            key={`video-${videoRenderKey}-${videoUrl.slice(0, 100)}`}
            source={{ uri: videoUrl }}
            style={StyleSheet.absoluteFillObject}
            useNativeControls={false}
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            isMuted={isVideoMuted}
            shouldPlay={isFocused && isVideoPlaying}
            onPlaybackStatusUpdate={handleVideoStatus}
            onReadyForDisplay={() => {
              setIsVideoReady(true);
              setShowSlowVideoHint(false);
              setVideoError(null);
            }}
            onError={() => {
              setVideoError('Unable to preview this video on this device.');
              setIsVideoReady(false);
            }}
          />

          {isVideoReady && !videoError && (
            <View className='absolute bottom-3 right-3 flex-row gap-2'>
              <TouchableOpacity
                onPress={toggleVideoPlayback}
                className='w-10 h-10 rounded-full bg-black/60 items-center justify-center'
              >
                <Ionicons
                  name={isVideoPlaying ? 'pause' : 'play'}
                  size={18}
                  color='white'
                  style={{ marginLeft: isVideoPlaying ? 0 : 2 }}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={toggleVideoMute}
                className='w-10 h-10 rounded-full bg-black/60 items-center justify-center'
              >
                <Ionicons
                  name={isVideoMuted ? 'volume-mute' : 'volume-high'}
                  size={18}
                  color='white'
                />
              </TouchableOpacity>
            </View>
          )}

          {!isVideoReady && (
            <View className='absolute inset-0 bg-black/80 items-center justify-center px-4'>
              <View className='items-center gap-3'>
                <ActivityIndicator color='white' size='large' />
                <Text className='text-white text-center font-roboto-medium'>
                  {videoError
                    ? 'Error loading video preview'
                    : showSlowVideoHint
                    ? 'Preparing preview...'
                    : 'Loading video...'}
                </Text>
                {(videoError || showSlowVideoHint) && (
                  <TouchableOpacity
                    onPress={handleRetry}
                    className='mt-1 bg-white/20 rounded-lg px-5 py-2.5'
                  >
                    <Text className='text-white font-roboto-medium'>Retry</Text>
                  </TouchableOpacity>
                )}
                {showSlowVideoHint && !videoError && (
                  <Text className='text-white/70 text-center text-xs px-6'>
                    This video format/codec may not be supported. Try MP4 (H.264/AAC).
                  </Text>
                )}
              </View>
            </View>
          )}
        </>
      )}

      {audio && (
        <View className='w-full h-full justify-center items-center bg-gray-900 p-6'>
          <View className='w-16 h-16 rounded-full bg-[#F0F2F5] dark:bg-[#FFFFFF0D] items-center justify-center mb-4'>
            <Feather name='music' size={32} color='#F54900' />
          </View>

          <Text
            className='text-black dark:text-white font-roboto-medium text-lg mb-1'
            numberOfLines={1}
          >
            {audio.split('/').pop()}
          </Text>
          <Text className='text-gray-400 text-sm mb-6'>Audio Preview</Text>

          <View className='flex-row items-center gap-4 w-full justify-center'>
            <Text className='text-gray-400 text-xs w-10 text-right'>
              {formatTime(audioPlayer.currentTime)}
            </Text>

            <TouchableOpacity
              onPress={toggleAudioPlayback}
              disabled={!audioPlayer.isLoaded}
              className='w-14 h-14 rounded-full bg-white items-center justify-center'
            >
              {!audioPlayer.isLoaded ? (
                <ActivityIndicator color='black' />
              ) : (
                <Ionicons
                  name={audioPlayer.playing ? 'pause' : 'play'}
                  size={24}
                  color='black'
                  style={{ marginLeft: audioPlayer.playing ? 0 : 2 }}
                />
              )}
            </TouchableOpacity>

            <Text className='text-gray-400 text-xs w-10'>
              {formatTime(audioPlayer.duration)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default MediaPreview;
