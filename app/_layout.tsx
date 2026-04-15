import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@/hooks/useAuth';
import { parseInviteLink, joinViaInvite } from '@/services/invites';
import { usePendingInviteStore } from '@/store/pendingInvite';

// SplashScreen only works on native — guard for web
if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

export default function RootLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Handle deep links — native only
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let sub: { remove: () => void } | null = null;

    import('expo-linking').then((Linking) => {
      const handle = async (url: string) => {
        const parsed = parseInviteLink(url);
        if (!parsed) return;
        if (user) {
          await joinViaInvite(user.id, parsed.poolId, parsed.token);
          router.replace('/(app)');
        } else {
          // Store for after login
          usePendingInviteStore.getState().setPendingInvite(parsed.poolId, parsed.token);
          router.replace('/join' as any);
        }
      };
      sub = Linking.addEventListener('url', ({ url }) => handle(url));
      Linking.getInitialURL().then((url) => { if (url) handle(url); });
    });

    return () => sub?.remove();
  }, [user]);

  // Handle web invite via query string on initial load.
  // Only store the pending invite if the user is NOT logged in — if they are,
  // join.tsx reads the params directly and handles the join itself.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const poolId = params.get('pool');
    const token = params.get('token');
    const path = window.location.pathname;
    if (poolId && token && path === '/join' && !user) {
      usePendingInviteStore.getState().setPendingInvite(poolId, token);
    }
  }, []);

  // After login: auto-complete any pending invite.
  // Only runs when the user is NOT on the /join screen (join.tsx handles that case).
  // Handled in app/(app)/index.tsx so fetchPools() runs immediately after joining.

  // Route guard
  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    const inJoin = segments[0] === 'join';
    if (!user && !inAuth && !inJoin) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      router.replace('/(app)');
    }
  }, [user, segments, isLoading]);

  // Hide splash (native only)
  useEffect(() => {
    if (Platform.OS !== 'web' && !isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="join" />
      </Stack>
    </>
  );
}
