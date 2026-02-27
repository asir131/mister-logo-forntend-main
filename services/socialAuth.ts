import { SOCIAL_AUTH_BASE_URL } from '@/api/axiosInstance';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { AccessToken, LoginManager } from 'react-native-fbsdk-next';
import { NativeModules, Platform } from 'react-native';

type AuthChangeHandler = (user: any | null) => void;
type OAuthProviderId = 'google.com' | 'twitter.com';
type BackendOAuthProvider = 'facebook' | 'instagram';

type FirebaseAuthModules = {
  authInstance: any;
  OAuthProvider: any;
  onAuthStateChanged: (auth: any, handler: AuthChangeHandler) => () => void;
  signInWithPopup?: (auth: any, provider: any) => Promise<any>;
  signInWithCredential?: (auth: any, credential: any) => Promise<any>;
  FacebookAuthProvider?: any;
  signOut: (auth: any) => Promise<void>;
};

export type BackendSocialAuthResult = {
  authUser: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    token: string;
    refreshToken: string | null;
  };
  isFirstLogin: boolean;
  needsProfileCompletion: boolean;
};

function getFirebaseAuthModules(): FirebaseAuthModules | null {
  if (Platform.OS === 'web') return null;
  if (!NativeModules?.RNFBAppModule) return null;

  try {
    const app = require('@react-native-firebase/app');
    const auth = require('@react-native-firebase/auth');
    const authInstance = auth.getAuth(app.getApp());

    return {
      authInstance,
      OAuthProvider: auth.OAuthProvider,
      onAuthStateChanged: auth.onAuthStateChanged,
      signInWithPopup: auth.signInWithPopup,
      signInWithCredential: auth.signInWithCredential,
      FacebookAuthProvider: auth.FacebookAuthProvider,
      signOut: auth.signOut,
    };
  } catch {
    return null;
  }
}

function getUnavailableMessage() {
  if (Platform.OS === 'web') {
    return 'Social login requires Android/iOS native build.';
  }
  return 'Firebase native module unavailable. Rebuild and reinstall app using development build (npx expo run:android / npx expo run:ios).';
}

function buildProvider(modules: FirebaseAuthModules, providerId: OAuthProviderId) {
  const provider = new modules.OAuthProvider(providerId);

  if (providerId === 'google.com') {
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({ prompt: 'select_account' });
  }

  return provider;
}

function readSingleParam(value: unknown): string {
  if (Array.isArray(value)) {
    return String(value[0] || '');
  }
  return String(value || '');
}

function readBoolParam(value: unknown): boolean {
  const normalized = readSingleParam(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

async function signInWithBackendOAuth(
  provider: BackendOAuthProvider,
): Promise<BackendSocialAuthResult> {
  const appRedirectUri = Linking.createURL('auth/social');
  const authUrl =
    `${SOCIAL_AUTH_BASE_URL}/api/auth/${provider}` +
    `?clientRedirect=${encodeURIComponent(appRedirectUri)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, appRedirectUri);

  if (result.type !== 'success' || !result.url) {
    throw new Error(`${provider} login cancelled.`);
  }

  const parsed = Linking.parse(result.url);
  const params = parsed?.queryParams || {};
  const status = readSingleParam(params.status);

  if (status !== 'success') {
    const errorMessage = readSingleParam(params.error);
    throw new Error(
      errorMessage ||
        `${provider.charAt(0).toUpperCase() + provider.slice(1)} login failed.`
    );
  }

  const token = readSingleParam(params.token);
  if (!token) {
    throw new Error(`Missing token from ${provider} login response.`);
  }

  return {
    authUser: {
      id: readSingleParam(params.id),
      name: readSingleParam(params.name) || 'User',
      email: readSingleParam(params.email),
      phoneNumber: readSingleParam(params.phoneNumber),
      token,
      refreshToken: readSingleParam(params.refreshToken) || null,
    },
    isFirstLogin: readBoolParam(params.isFirstLogin),
    needsProfileCompletion: readBoolParam(params.needsProfileCompletion),
  };
}

async function signInWithOAuthProvider(providerId: OAuthProviderId) {
  const modules = getFirebaseAuthModules();
  if (!modules) {
    throw new Error(getUnavailableMessage());
  }

  if (typeof modules.signInWithPopup !== 'function') {
    throw new Error('This build does not support Firebase popup login. Use native provider flow/dev client.');
  }

  const provider = buildProvider(modules, providerId);
  return modules.signInWithPopup(modules.authInstance, provider);
}

export function observeAuthState(handler: AuthChangeHandler) {
  const modules = getFirebaseAuthModules();
  if (!modules) {
    console.log('Firebase native module unavailable. Skipping auth state observer.');
    return () => {};
  }

  return modules.onAuthStateChanged(modules.authInstance, handler);
}

export async function signOutCurrentUser() {
  const modules = getFirebaseAuthModules();
  if (!modules) return;

  await modules.signOut(modules.authInstance);
  try {
    LoginManager.logOut();
  } catch {
    // ignore facebook logout errors
  }
}

export async function signInWithGoogle() {
  return signInWithOAuthProvider('google.com');
}

export async function signInWithFacebook() {
  if (Platform.OS === 'android') {
    return signInWithBackendOAuth('facebook');
  }

  const modules = getFirebaseAuthModules();
  if (!modules) {
    throw new Error(getUnavailableMessage());
  }

  if (
    typeof modules.signInWithCredential !== 'function' ||
    !modules.FacebookAuthProvider
  ) {
    throw new Error(
      'Firebase credential sign-in is unavailable in this build. Rebuild app with native modules.'
    );
  }

  const loginResult = await LoginManager.logInWithPermissions([
    'public_profile',
    'email',
  ]);

  if (loginResult.isCancelled) {
    throw new Error('Facebook login cancelled.');
  }

  const tokenData = await AccessToken.getCurrentAccessToken();
  const fbToken = tokenData?.accessToken?.toString?.() || tokenData?.accessToken;

  if (!fbToken) {
    throw new Error('Failed to get Facebook access token.');
  }

  const credential = modules.FacebookAuthProvider.credential(fbToken);
  return modules.signInWithCredential(modules.authInstance, credential);
}

export async function signInWithTwitter() {
  return signInWithOAuthProvider('twitter.com');
}


export async function signInWithInstagram() {
  return signInWithBackendOAuth('instagram');
}

