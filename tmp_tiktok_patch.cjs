const fs = require('fs');
const p = 'C:/alif/mister-logo/UNAP/components/card/PostCard.tsx';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes("import * as FileSystem from 'expo-file-system/legacy';")) {
  c = c.replace(
    "import { Image } from 'expo-image';",
    "import { Image } from 'expo-image';\nimport * as FileSystem from 'expo-file-system/legacy';\nimport * as Sharing from 'expo-sharing';"
  );
}

const re = /const openTikTokShare = async \(\) => \{[\s\S]*?\n  \};/;
const replacement = `const openTikTokShare = async () => {
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
      const localFile = \`${'${FileSystem.cacheDirectory}'}tiktok-share-${'${post?._id || Date.now()}'}.${'${ext}'}\`;

      await FileSystem.downloadAsync(mediaUrl, localFile);

      await Sharing.shareAsync(localFile, {
        dialogTitle: 'Share to TikTok',
        mimeType,
      });

      return true;
    } catch {
      try {
        const schemes = ['snssdk1233://', 'snssdk1180://', 'tiktok://', 'musically://'];
        for (const scheme of schemes) {
          try {
            await Linking.openURL(scheme);
            return true;
          } catch {
            // try next scheme
          }
        }
      } catch {
        // no-op
      }

      try {
        await Share.share({ message, url: mediaUrl || undefined });
        return true;
      } catch {
        return false;
      }
    }
  };`;

if (!re.test(c)) throw new Error('openTikTokShare block not found');
c = c.replace(re, replacement);

fs.writeFileSync(p, c, 'utf8');
