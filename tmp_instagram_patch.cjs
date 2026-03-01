const fs = require('fs');
const p = 'C:/alif/mister-logo/UNAP/components/card/PostCard.tsx';
let c = fs.readFileSync(p, 'utf8');

const re = /const openInstagramShare = async \(\) => \{[\s\S]*?\n  \};/;
const replacement = `const openInstagramShare = async () => {
    const { mediaUrl, message } = buildSharePayload();

    try {
      if (mediaUrl && /^https?:\/\//i.test(mediaUrl)) {
        const isShareAvailable = await Sharing.isAvailableAsync();
        if (isShareAvailable) {
          const ext = post?.mediaType === 'video' ? 'mp4' : 'jpg';
          const mimeType = post?.mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
          const localFile = \`${'${FileSystem.cacheDirectory}'}instagram-share-${'${post?._id || Date.now()}'}.${'${ext}'}\`;

          await FileSystem.downloadAsync(mediaUrl, localFile);

          await Sharing.shareAsync(localFile, {
            dialogTitle: 'Share to Instagram',
            mimeType,
            UTI: post?.mediaType === 'video' ? 'public.movie' : 'public.image',
          });
          return true;
        }
      }

      const canOpenInstagram = await Linking.canOpenURL('instagram://app');
      if (canOpenInstagram) {
        await Linking.openURL('instagram://camera');
        return true;
      }

      await Share.share({ message, url: mediaUrl || undefined });
      return true;
    } catch {
      return false;
    }
  };`;

if (!re.test(c)) throw new Error('openInstagramShare block not found');
c = c.replace(re, replacement);
fs.writeFileSync(p, c, 'utf8');
