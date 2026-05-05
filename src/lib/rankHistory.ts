import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'rank_history';

type RankSnapshot = Record<string, number>; // `${poolId}:${userId}` -> rank

export async function saveRanks(poolId: string, entries: Array<{ userId: string; rank: number }>) {
  const stored = await loadAllRanks();
  for (const e of entries) {
    stored[`${poolId}:${e.userId}`] = e.rank;
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(stored));
}

export async function loadPreviousRanks(poolId: string, userIds: string[]): Promise<Record<string, number>> {
  const stored = await loadAllRanks();
  const result: Record<string, number> = {};
  for (const uid of userIds) {
    const key = `${poolId}:${uid}`;
    if (stored[key] != null) result[uid] = stored[key];
  }
  return result;
}

async function loadAllRanks(): Promise<RankSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
