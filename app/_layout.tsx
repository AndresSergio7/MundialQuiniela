import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@/hooks/useAuth';
import { parseInviteLink } from '@/services/invites';
import { joinViaInvite } from '@/services/invites';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Handle deep links (invite links) — native only
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let subscription: ReturnType<typeof import('expo-linking').addEventListener> | null = null;

    import('expo-linking').then((Linking) => {
      const handleUrl = async (url: string) => {
        const parsed = parseInviteLink(url);
        if (!parsed || !user) return;
        await joinViaInvite(user.id, parsed.poolId, parsed.token);
        router.replace('/(app)');
      };

      subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
      Linking.getInitialURL().then((url) => {
        if (url) handleUrl(url);
      });
    });

    return () => subscription?.remove();
  }, [user]);

  // Handle web invite links via query params
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const poolId = params.get('pool');
    const token = params.get('token');
    if (poolId && token) {
      joinViaInvite(user.id, poolId, token).then(() => {
        router.replace('/(app)');
      });
    }
  }, [user]);

  // Guard routes
  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      router.replace('/(app)');
    }
  }, [user, segments, isLoading]);

  // Hide splash screen when ready
  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}
