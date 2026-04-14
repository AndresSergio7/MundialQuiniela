import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { AuthState, AuthUser, Profile, Entitlement } from '@/types';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  entitlement: null,
  isLoading: true,

  setUser: (user: AuthUser | null) => set({ user }),
  setProfile: (profile: Profile | null) => set({ profile }),
  setEntitlement: (entitlement: Entitlement | null) => set({ entitlement }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, entitlement: null });
  },
}));
