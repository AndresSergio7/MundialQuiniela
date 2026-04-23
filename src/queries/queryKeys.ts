export const queryKeys = {
  pools: {
    all: ['pools'] as const,
    byUser: (userId: string) => ['pools', userId] as const,
    byId: (poolId: string) => ['pools', 'detail', poolId] as const,
  },
  predictions: {
    byPool: (poolId: string, userId: string) => ['predictions', poolId, userId] as const,
  },
  submissions: {
    byPool: (poolId: string, userId: string) => ['submissions', poolId, userId] as const,
  },
  standings: {
    byPool: (poolId: string) => ['standings', poolId] as const,
  },
  matches: {
    all: ['matches'] as const,
  },
  invites: {
    byPool: (poolId: string) => ['invites', poolId] as const,
  },
} as const;
