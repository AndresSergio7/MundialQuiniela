import { create } from 'zustand';
import type { Pool, PoolState } from '@/types';

export const usePoolStore = create<PoolState>((set) => ({
  currentPool: null,
  pools: [],
  setCurrentPool: (pool: Pool | null) => set({ currentPool: pool }),
  setPools: (pools: Pool[]) => set({ pools }),
}));
