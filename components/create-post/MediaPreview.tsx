import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudioPlayer } from 'expo-audio';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';

interface MediaPreviewProps {
  photo: string | null;
  video: string | null;
  audio: string | null;
}

const MediaPreview: React.FC<MediaPreviewProps> = ({ photo, video, audio }) => {
  const isFocused = useIsFocused();
  const audioPlayer = useAudioPlayer(audio || '');
  const [isVideoReady, setIsVideoReady] = React.useState(false);
  const [showSlowVideoHint, setShowSlowVideoHint] = React.useState(false);
  const [videoError, setVideoError] = React.useState<string | null>(null);

  const videoUrl = video || '';
  const videoPlayer = useVideoPlayer(videoUrl, player => {
    player.loop = true;
    player.muted = false;
  });

  React.useEffect(() => {
    if (!video) return;
    setIsVideoReady(false);
    setShowSlowVideoHint(false);
    setVideoError(null);
  }, [video]);

  React.useEffect(() => {
    if (!video) return;

    const controlPlayback = async () => {
      try {
        if (isFocused) {
          await videoPlayer.play();
        } else {
          videoPlayer.pause();
        }
      } catch {
        setVideoError('Unable to preview this video on this device.');
        setIsVideoReady(false);
      }
    };

    controlPlayback();
  }, [isFocused, video, videoPlayer]);

  React.useEffect(() => {
    if (!video || isVideoReady) return;

    const timer = setTimeout(() => {
      setShowSlowVideoHint(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, [video, isVideoReady]);

  const toggleAudioPlayback = () => {
    if (audioPlayer.playing) {
      audioPlayer.pause();
    } else {
      audioPlayer.play();
    }
  };

  const handleRetry = async () => {
    setIsVideoReady(false);
    setShowSlowVideoHint(false);
    setVideoError(null);

    try {
      videoPlayer.pause();
      await new Promise(resolve => setTimeout(resolve, 150));
      await videoPlayer.play();
    } catch {
      setVideoError('Unable to preview this video on this device.');
    }
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

      {video && (
        <>
          <VideoView
            key={`video-${video.slice(0, 100)}`}
            className='absolute inset-0 w-full h-full'
            player={videoPlayer}
            nativeControls={false}
            contentFit='contain'
            allowsPictureInPicture={false}
            onFirstFrameRender={() => {
              setIsVideoReady(true);
              setShowSlowVideoHint(false);
              setVideoError(null);
            }}
          />

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
                    This video format/codec may not be supported on this device.
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
