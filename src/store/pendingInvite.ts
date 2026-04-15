import { create } from 'zustand';

interface PendingInviteState {
  poolId: string | null;
  token: string | null;
  setPendingInvite: (poolId: string, token: string) => void;
  clearPendingInvite: () => void;
}

export const usePendingInviteStore = create<PendingInviteState>((set) => ({
  poolId: null,
  token: null,
  setPendingInvite: (poolId, token) => set({ poolId, token }),
  clearPendingInvite: () => set({ poolId: null, token: null }),
}));
