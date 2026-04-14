import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { AuthUser, Profile, Entitlement } from '@/types';

export function useAuth() {
  const { user, profile, entitlement, isLoading, setUser, setProfile, setEntitlement } =
    useAuthStore();

  useEffect(() => {
    // Resolve initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u: AuthUser = {
          id: session.user.id,
          email: session.user.email ?? '',
          created_at: session.user.created_at,
        };
        setUser(u);
        loadProfile(u.id);
      }
      useAuthStore.setState({ isLoading: false });
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u: AuthUser = {
          id: session.user.id,
          email: session.user.email ?? '',
          created_at: session.user.created_at,
        };
        setUser(u);
        loadProfile(u.id);
      } else {
        setUser(null);
        setProfile(null);
        setEntitlement(null);
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId: string) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileData) setProfile(profileData as Profile);

    const { data: entitlementData } = await supabase
      .from('entitlements')
      .select('*')
      .eq('user_id', userId)
      .is('pool_id', null)
      .single();

    if (entitlementData) setEntitlement(entitlementData as Entitlement);
  }

  return { user, profile, entitlement, isLoading };
}
