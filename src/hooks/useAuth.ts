import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { AuthUser, Profile, Entitlement } from '@/types';

export function useAuth() {
  const { user, profile, entitlement, isLoading, setUser, setProfile, setEntitlement } =
    useAuthStore();

  useEffect(() => {
    let mounted = true;

    // 1. Check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) console.error('getSession error:', error.message);

      if (session?.user) {
        const u: AuthUser = {
          id: session.user.id,
          email: session.user.email ?? '',
          created_at: session.user.created_at,
        };
        setUser(u);
        loadProfile(u.id, u.email).finally(() => {
          if (mounted) useAuthStore.setState({ isLoading: false });
        });
      } else {
        useAuthStore.setState({ isLoading: false });
      }
    }).catch((err) => {
      console.error('Auth init error:', err);
      if (mounted) useAuthStore.setState({ isLoading: false });
    });

    // 2. Listen for auth changes (sign in / sign out)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (session?.user) {
        const u: AuthUser = {
          id: session.user.id,
          email: session.user.email ?? '',
          created_at: session.user.created_at,
        };
        setUser(u);
        loadProfile(u.id, u.email);
        useAuthStore.setState({ isLoading: false });
      } else {
        setUser(null);
        setProfile(null);
        setEntitlement(null);
        useAuthStore.setState({ isLoading: false });
      }
    });

    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId: string, email?: string) {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as Profile);
      } else {
        // Self-heal legacy users whose auth account exists without a profile row.
        const emailPrefix = (email ?? 'user').split('@')[0] || 'user';
        const usernameBase = emailPrefix.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'user';
        const fallbackUsername = `${usernameBase}_${userId.slice(0, 6)}`;

        const { data: createdProfile } = await supabase
          .from('profiles')
          .upsert(
            {
              id: userId,
              username: fallbackUsername,
              full_name: '',
            },
            { onConflict: 'id' }
          )
          .select('*')
          .single();

        if (createdProfile) setProfile(createdProfile as Profile);
      }

      const { data: entitlementData } = await supabase
        .from('entitlements')
        .select('*')
        .eq('user_id', userId)
        .is('pool_id', null)
        .maybeSingle();

      if (entitlementData) setEntitlement(entitlementData as Entitlement);
    } catch (err) {
      console.error('loadProfile error:', err);
    }
  }

  return { user, profile, entitlement, isLoading };
}
