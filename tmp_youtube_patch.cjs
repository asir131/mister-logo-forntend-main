const fs = require('fs');
const p = 'C:/alif/mister-logo/UNAP/components/card/PostCard.tsx';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('const openYouTubeShare = async () => {')) {
  const anchor = '  const openFacebookStoryShare = async () => {';
  const insert = `  const openYouTubeShare = async () => {
    const { mediaUrl, message } = buildSharePayload();

    try {
      if (!mediaUrl || !/^https?:\/\//i.test(mediaUrl)) {
        return false;
      }

      const isShareAvailable = await Sharing.isAvailableAsync();
      if (!isShareAvailable) {
        return false;
      }

      const ext = post?.mediaType === 'video' ? 'mp4' : 'jpg';
      const mimeType = post?.mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
      const localFile = \`${'${FileSystem.cacheDirectory}'}youtube-share-${'${post?._id || Date.now()}'}.${'${ext}'}\`;

      await FileSystem.downloadAsync(mediaUrl, localFile);

      await Sharing.shareAsync(localFile, {
        dialogTitle: 'Share to YouTube',
        mimeType,
      });

      return true;
    } catch {
      try {
        await Share.share({
          message,
          url: mediaUrl || undefined,
        });
        return true;
      } catch {
        return false;
      }
    }
  };

`;
  if (!c.includes(anchor)) throw new Error('anchor not found');
  c = c.replace(anchor, insert + anchor);
}

c = c.replace(
  /\} else if \(target === 'youtube' \|\| target === 'snapchat' \|\| target === 'spotify'\) \{[\s\S]*?\n      \}/,
  `} else if (target === 'youtube') {
        const opened = await openYouTubeShare();
        if (!opened) {
          Toast.show({
            type: 'error',
            text1: 'YouTube share failed',
            text2: 'Could not open YouTube share.',
          });
        }
      } else if (target === 'snapchat' || target === 'spotify') {
        const { message, mediaUrl } = buildSharePayload();
        await Share.share({
          message,
          url: mediaUrl || undefined,
        });
      }`
);

fs.writeFileSync(p, c, 'utf8');
