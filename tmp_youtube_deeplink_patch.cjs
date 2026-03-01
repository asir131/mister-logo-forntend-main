const fs = require('fs');
const p = 'C:/alif/mister-logo/UNAP/components/card/PostCard.tsx';
let c = fs.readFileSync(p, 'utf8');

const re = /const openYouTubeShare = async \(\) => \{[\s\S]*?\n  \};/;
const replacement = `const openYouTubeShare = async () => {
    const { mediaUrl, message } = buildSharePayload();

    try {
      let openedYoutubeApp = false;
      const appLaunchUrls = [
        'vnd.youtube://www.youtube.com/upload',
        'youtube://www.youtube.com/upload',
        'vnd.youtube://',
        'youtube://',
      ];

      for (const launchUrl of appLaunchUrls) {
        try {
          await Linking.openURL(launchUrl);
          openedYoutubeApp = true;
          break;
        } catch {
          // try next deeplink
        }
      }

      if (!mediaUrl || !/^https?:\/\//i.test(mediaUrl)) {
        return openedYoutubeApp;
      }

      const isShareAvailable = await Sharing.isAvailableAsync();
      if (!isShareAvailable) {
        return openedYoutubeApp;
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
  };`;

if (!re.test(c)) throw new Error('openYouTubeShare block not found');
c = c.replace(re, replacement);
fs.writeFileSync(p, c, 'utf8');
