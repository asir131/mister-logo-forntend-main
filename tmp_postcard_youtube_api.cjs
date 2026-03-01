const fs = require('fs');
const p = 'C:/alif/mister-logo/UNAP/components/card/PostCard.tsx';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes("import api, { SOCIAL_AUTH_BASE_URL } from '@/api/axiosInstance';")) {
  c = c.replace(
    "import { SOCIAL_AUTH_BASE_URL } from '@/api/axiosInstance';",
    "import api, { SOCIAL_AUTH_BASE_URL } from '@/api/axiosInstance';"
  );
}

if (!c.includes("import * as ExpoLinking from 'expo-linking';")) {
  c = c.replace(
    "import { router } from 'expo-router';",
    "import * as ExpoLinking from 'expo-linking';\nimport * as WebBrowser from 'expo-web-browser';\nimport { router } from 'expo-router';"
  );
}

const re = /const openYouTubeShare = async \(\) => \{[\s\S]*?\n  \};/;
const replacement = `const openYouTubeShare = async () => {
    if (!post?._id) return false;

    const connectRedirect = ExpoLinking.createURL('auth/youtube');

    const tryUpload = async () => {
      const result = await api.post('/api/youtube/share', { postId: post._id });
      return result;
    };

    try {
      const result = await tryUpload();
      if (result?.url) {
        Toast.show({
          type: 'success',
          text1: 'YouTube Upload Complete',
          text2: 'Your video was uploaded successfully.',
        });
      }
      return true;
    } catch (error: any) {
      const status = Number(error?.response?.status || 0);
      const code = String(error?.response?.data?.code || '');
      const needsConnect = status === 428 || code === 'YOUTUBE_AUTH_REQUIRED';

      if (!needsConnect) {
        return false;
      }
    }

    try {
      const authRes = await api.get(
        `/api/youtube/connect-url?clientRedirect=${encodeURIComponent(connectRedirect)}`
      );
      const authUrl = String(authRes?.url || '');
      if (!authUrl) return false;

      const authResult = await WebBrowser.openAuthSessionAsync(authUrl, connectRedirect);
      if (authResult.type !== 'success' || !authResult.url) {
        return false;
      }

      const parsed = ExpoLinking.parse(authResult.url);
      const status = String(parsed?.queryParams?.status || '');
      if (status !== 'success') {
        return false;
      }

      const uploaded = await tryUpload();
      if (uploaded?.url) {
        Toast.show({
          type: 'success',
          text1: 'YouTube Upload Complete',
          text2: 'Your video was uploaded successfully.',
        });
      }
      return true;
    } catch {
      return false;
    }
  };`;

if (!re.test(c)) throw new Error('openYouTubeShare block not found');
c = c.replace(re, replacement);

fs.writeFileSync(p, c, 'utf8');
