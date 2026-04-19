# MundialQuiniela — Refactor de Arquitectura: Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactorizar la app a una arquitectura de 4 capas (screens → queries → services → supabase) con TanStack Query, corrigiendo CRUDs rotos en el proceso.

**Architecture:** Screens thin (solo JSX + hooks). Queries (TanStack Query: cache, loading, error, invalidación). Services (funciones async puras que lanzan AppError). Supabase client único. Zustand solo para UI state (session, pendingInvite).

**Tech Stack:** React Native + Expo Router, TanStack Query v5, Supabase JS v2, Zustand, TypeScript strict.

**Rama:** `dev`

---

## Mapa de Archivos

### Nuevos
- `src/lib/errors.ts` — AppError class
- `src/lib/footballApi.ts` — integración Football API externa (extraído de api.ts)
- `src/services/auth.service.ts`
- `src/services/pools.service.ts`
- `src/services/predictions.service.ts`
- `src/services/matches.service.ts`
- `src/services/standings.service.ts`
- `src/services/invites.service.ts`
- `src/queries/queryKeys.ts`
- `src/queries/pools.queries.ts`
- `src/queries/predictions.queries.ts`
- `src/queries/matches.queries.ts`
- `src/queries/standings.queries.ts`
- `src/queries/invites.queries.ts`
- `src/hooks/usePredictionsScreen.ts` — lógica extraída del god component

### Modificados
- `package.json` — añadir @tanstack/react-query
- `src/store/auth.ts` — slim: solo session + user
- `src/hooks/useAuth.ts` — simplificado
- `app/_layout.tsx` — QueryClientProvider + onAuthStateChange listener
- `app/(auth)/` — screens de auth usan auth.service, sin gestión manual de sesión
- `app/(app)/predictions/index.tsx` — delega a usePredictionsScreen hook
- `app/(app)/standings/index.tsx` — usa useStandings query
- `app/(app)/invites/index.tsx` — usa useInvites / useCreateInvite queries

### Eliminados
- `src/lib/api.ts` — reemplazado por footballApi.ts + servicios
- `src/lib/scoring.ts` — lógica vive en DB RPC (recalculate_standings)
- `src/services/pools.ts` — reemplazado por pools.service.ts
- `src/services/predictions.ts` — reemplazado por predictions.service.ts
- `src/services/matches.ts` — reemplazado por matches.service.ts
- `src/services/standings.ts` — reemplazado por standings.service.ts
- `src/services/invites.ts` — reemplazado por invites.service.ts
- `src/hooks/usePool.ts` — reemplazado por pools.queries.ts

---

## FASE 1: FOUNDATION

### Task 1: Instalar TanStack Query

**Files:**
- Modify: `package.json`

- [ ] Instalar dependencia:
```bash
npx expo install @tanstack/react-query
```
Expected: instalación sin errores.

- [ ] Verificar versión instalada:
```bash
grep tanstack package.json
```
Expected: `"@tanstack/react-query": "^5.x.x"`

- [ ] Commit:
```bash
git add package.json
git commit -m "chore: add @tanstack/react-query"
```

---

### Task 2: Crear AppError

**Files:**
- Create: `src/lib/errors.ts`

- [ ] Crear el archivo:
```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'AppError'
  }
}
```

- [ ] Commit:
```bash
git add src/lib/errors.ts
git commit -m "feat: add AppError class"
```

---

### Task 3: Extraer footballApi.ts

**Files:**
- Create: `src/lib/footballApi.ts`
- Note: `src/lib/api.ts` se elimina en Fase 6 una vez todos los imports estén migrados

- [ ] Leer el archivo actual para identificar la lógica de Football API:
```bash
cat src/lib/api.ts
```

- [ ] Crear `src/lib/footballApi.ts` con solo la integración con la API externa:
```typescript
// src/lib/footballApi.ts

const FOOTBALL_API_BASE = 'https://api.football-data.org/v4'
const WC2026_COMPETITION_ID = 2000

interface MatchResult {
  id: number
  homeTeam: { name: string }
  awayTeam: { name: string }
  score: {
    fullTime: { home: number | null; away: number | null }
  }
}

async function callFootballApi<T>(path: string): Promise<T | null> {
  const apiKey = process.env.EXPO_PUBLIC_FOOTBALL_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch(`${FOOTBALL_API_BASE}${path}`, {
      headers: { 'X-Auth-Token': apiKey },
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

export async function fetchLiveResults(): Promise<MatchResult[] | null> {
  const data = await callFootballApi<{ matches: MatchResult[] }>(
    `/competitions/${WC2026_COMPETITION_ID}/matches?status=FINISHED`
  )
  return data?.matches ?? null
}
```

- [ ] Commit:
```bash
git add src/lib/footballApi.ts
git commit -m "feat: extract footballApi from api.ts"
```

---

## FASE 2: SERVICE LAYER

**Patrón uniforme para todos los servicios:**
- Función async pura: recibe parámetros, retorna el tipo esperado
- Si Supabase devuelve `error` → `throw new AppError(CODE, error.message)`
- Sin hooks, sin estado, sin lógica de UI
- Antes de escribir cada servicio, leer `src/types/index.ts` para confirmar los tipos exactos

---

### Task 4: auth.service.ts

**Files:**
- Create: `src/services/auth.service.ts`

- [ ] Crear el servicio:
```typescript
// src/services/auth.service.ts
import { supabase } from '@/lib/supabase'
import { AppError } from '@/lib/errors'

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new AppError('AUTH_SIGN_IN_FAILED', error.message)
  return data.session
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw new AppError('AUTH_SIGN_UP_FAILED', error.message)
  return data.session
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new AppError('AUTH_SIGN_OUT_FAILED', error.message)
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new AppError('AUTH_GET_SESSION_FAILED', error.message)
  return data.session
}
```

- [ ] Commit:
```bash
git add src/services/auth.service.ts
git commit -m "feat: add auth.service"
```

---

### Task 5: pools.service.ts

**Files:**
- Create: `src/services/pools.service.ts`

- [ ] Leer tipos actuales:
```bash
grep -A 20 "interface Pool\|type Pool" src/types/index.ts
```

- [ ] Leer el servicio existente para entender las queries:
```bash
cat src/services/pools.ts
```

- [ ] Crear el servicio con el patrón limpio:
```typescript
// src/services/pools.service.ts
import { supabase } from '@/lib/supabase'
import { AppError } from '@/lib/errors'
import type { Pool } from '@/types'

export async function fetchPools(userId: string): Promise<Pool[]> {
  const { data, error } = await supabase
    .from('pools')
    .select('*, pool_members!inner(user_id, role)')
    .eq('pool_members.user_id', userId)
  if (error) throw new AppError('FETCH_POOLS_FAILED', error.message)
  return data as Pool[]
}

export async function fetchPoolById(poolId: string): Promise<Pool> {
  const { data, error } = await supabase
    .from('pools')
    .select('*, pool_members(user_id, role)')
    .eq('id', poolId)
    .single()
  if (error) throw new AppError('FETCH_POOL_FAILED', error.message)
  return data as Pool
}

export async function createPool(params: {
  name: string
  adminId: string
}): Promise<Pool> {
  const { data, error } = await supabase
    .from('pools')
    .insert({ name: params.name, admin_id: params.adminId })
    .select()
    .single()
  if (error) throw new AppError('CREATE_POOL_FAILED', error.message)
  const { error: memberError } = await supabase
    .from('pool_members')
    .insert({ pool_id: data.id, user_id: params.adminId, role: 'admin' })
  if (memberError) throw new AppError('CREATE_POOL_MEMBER_FAILED', memberError.message)
  return data as Pool
}

export async function deletePool(poolId: string): Promise<void> {
  const { error } = await supabase.from('pools').delete().eq('id', poolId)
  if (error) throw new AppError('DELETE_POOL_FAILED', error.message)
}

export async function joinPool(poolId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('pool_members')
    .insert({ pool_id: poolId, user_id: userId, role: 'member' })
  if (error) throw new AppError('JOIN_POOL_FAILED', error.message)
}
```

Nota: ajustar los nombres de columnas si difieren al leer el servicio existente o el schema.

- [ ] Commit:
```bash
git add src/services/pools.service.ts
git commit -m "feat: add pools.service"
```

---

### Task 6: matches.service.ts

**Files:**
- Create: `src/services/matches.service.ts`

- [ ] Leer el servicio existente:
```bash
cat src/services/matches.ts
```

- [ ] Crear el servicio:
```typescript
// src/services/matches.service.ts
import { supabase } from '@/lib/supabase'
import { AppError } from '@/lib/errors'
import type { Match } from '@/types'

export async function fetchMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: true })
  if (error) throw new AppError('FETCH_MATCHES_FAILED', error.message)
  return data as Match[]
}
```

- [ ] Commit:
```bash
git add src/services/matches.service.ts
git commit -m "feat: add matches.service"
```

---

### Task 7: predictions.service.ts

**Files:**
- Create: `src/services/predictions.service.ts`

- [ ] Leer el servicio existente y los tipos:
```bash
cat src/services/predictions.ts
grep -A 15 "interface Prediction\|type Prediction\|interface Submission\|type Submission" src/types/index.ts
```

- [ ] Crear el servicio. `submitQuiniela` usa el RPC atómico — nunca modifica predicciones directamente:
```typescript
// src/services/predictions.service.ts
import { supabase } from '@/lib/supabase'
import { AppError } from '@/lib/errors'
import type { Prediction, Submission } from '@/types'

export async function fetchPredictions(
  poolId: string,
  userId: string
): Promise<Prediction[]> {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('pool_id', poolId)
    .eq('user_id', userId)
  if (error) throw new AppError('FETCH_PREDICTIONS_FAILED', error.message)
  return data as Prediction[]
}

export async function savePredictions(
  poolId: string,
  userId: string,
  scores: Record<string, { home: number; away: number }>
): Promise<void> {
  const rows = Object.entries(scores).map(([matchId, score]) => ({
    pool_id: poolId,
    user_id: userId,
    match_id: matchId,
    home_score: score.home,
    away_score: score.away,
  }))
  const { error } = await supabase
    .from('predictions')
    .upsert(rows, { onConflict: 'pool_id,user_id,match_id' })
  if (error) throw new AppError('SAVE_PREDICTIONS_FAILED', error.message)
}

export async function fetchSubmission(
  poolId: string,
  userId: string
): Promise<Submission | null> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('pool_id', poolId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new AppError('FETCH_SUBMISSION_FAILED', error.message)
  return data as Submission | null
}

export async function submitQuiniela(
  poolId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase.rpc('submit_quiniela', {
    p_pool_id: poolId,
    p_user_id: userId,
  })
  if (error) throw new AppError('SUBMIT_QUINIELA_FAILED', error.message)
}
```

Nota: verificar los nombres de parámetros del RPC `submit_quiniela` en `supabase/migrations/` si hay error.

- [ ] Commit:
```bash
git add src/services/predictions.service.ts
git commit -m "feat: add predictions.service"
```

---

### Task 8: standings.service.ts

**Files:**
- Create: `src/services/standings.service.ts`

- [ ] Leer el servicio existente:
```bash
cat src/services/standings.ts
grep -A 10 "interface Standing\|type Standing" src/types/index.ts
```

- [ ] Crear el servicio:
```typescript
// src/services/standings.service.ts
import { supabase } from '@/lib/supabase'
import { AppError } from '@/lib/errors'
import type { Standing } from '@/types'

export async function fetchStandings(poolId: string): Promise<Standing[]> {
  const { data, error } = await supabase
    .from('standings')
    .select('*, profiles(display_name, avatar_url)')
    .eq('pool_id', poolId)
    .order('rank', { ascending: true })
  if (error) throw new AppError('FETCH_STANDINGS_FAILED', error.message)
  return data as Standing[]
}
```

- [ ] Commit:
```bash
git add src/services/standings.service.ts
git commit -m "feat: add standings.service"
```

---

### Task 9: invites.service.ts

**Files:**
- Create: `src/services/invites.service.ts`

- [ ] Leer el servicio existente:
```bash
cat src/services/invites.ts
grep -A 10 "interface Invite\|type Invite" src/types/index.ts
```

- [ ] Crear el servicio:
```typescript
// src/services/invites.service.ts
import { supabase } from '@/lib/supabase'
import { AppError } from '@/lib/errors'
import type { Invite } from '@/types'

export async function fetchInvites(poolId: string): Promise<Invite[]> {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('pool_id', poolId)
    .order('created_at', { ascending: false })
  if (error) throw new AppError('FETCH_INVITES_FAILED', error.message)
  return data as Invite[]
}

export async function createInvite(poolId: string): Promise<Invite> {
  const { data, error } = await supabase
    .from('invites')
    .insert({ pool_id: poolId })
    .select()
    .single()
  if (error) throw new AppError('CREATE_INVITE_FAILED', error.message)
  return data as Invite
}

export async function acceptInvite(token: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('accept_invite', {
    p_token: token,
    p_user_id: userId,
  })
  if (error) throw new AppError('ACCEPT_INVITE_FAILED', error.message)
}
```

Nota: verificar nombres de parámetros del RPC `accept_invite` en `supabase/migrations/`.

- [ ] Commit:
```bash
git add src/services/invites.service.ts
git commit -m "feat: add invites.service"
```

---

## FASE 3: QUERY LAYER

### Task 10: queryKeys.ts

**Files:**
- Create: `src/queries/queryKeys.ts`

- [ ] Crear el archivo de keys centralizadas:
```typescript
// src/queries/queryKeys.ts
export const queryKeys = {
  pools: {
    all: ['pools'] as const,
    byUser: (userId: string) => ['pools', userId] as const,
    byId: (poolId: string) => ['pools', 'detail', poolId] as const,
  },
  predictions: {
    byPool: (poolId: string, userId: string) =>
      ['predictions', poolId, userId] as const,
  },
  submissions: {
    byPool: (poolId: string, userId: string) =>
      ['submissions', poolId, userId] as const,
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
} as const
```

- [ ] Commit:
```bash
git add src/queries/queryKeys.ts
git commit -m "feat: add TanStack Query key definitions"
```

---

### Task 11: pools.queries.ts

**Files:**
- Create: `src/queries/pools.queries.ts`

- [ ] Crear los hooks:
```typescript
// src/queries/pools.queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'
import {
  fetchPools,
  fetchPoolById,
  createPool,
  deletePool,
  joinPool,
} from '@/services/pools.service'

export function usePools(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.pools.byUser(userId ?? ''),
    queryFn: () => fetchPools(userId!),
    enabled: !!userId,
  })
}

export function usePool(poolId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.pools.byId(poolId ?? ''),
    queryFn: () => fetchPoolById(poolId!),
    enabled: !!poolId,
  })
}

export function useCreatePool() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createPool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pools.all })
    },
  })
}

export function useDeletePool() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (poolId: string) => deletePool(poolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pools.all })
    },
  })
}

export function useJoinPool() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ poolId, userId }: { poolId: string; userId: string }) =>
      joinPool(poolId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pools.all })
    },
  })
}
```

- [ ] Commit:
```bash
git add src/queries/pools.queries.ts
git commit -m "feat: add pools queries and mutations"
```

---

### Task 12: matches.queries.ts

**Files:**
- Create: `src/queries/matches.queries.ts`

- [ ] Crear el hook:
```typescript
// src/queries/matches.queries.ts
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'
import { fetchMatches } from '@/services/matches.service'

export function useMatches() {
  return useQuery({
    queryKey: queryKeys.matches.all,
    queryFn: fetchMatches,
    staleTime: 1000 * 60 * 5, // 5 min — matches no cambian frecuentemente
  })
}
```

- [ ] Commit:
```bash
git add src/queries/matches.queries.ts
git commit -m "feat: add matches query"
```

---

### Task 13: predictions.queries.ts

**Files:**
- Create: `src/queries/predictions.queries.ts`

- [ ] Crear los hooks:
```typescript
// src/queries/predictions.queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'
import {
  fetchPredictions,
  savePredictions,
  fetchSubmission,
  submitQuiniela,
} from '@/services/predictions.service'

export function usePredictions(
  poolId: string | undefined,
  userId: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.predictions.byPool(poolId ?? '', userId ?? ''),
    queryFn: () => fetchPredictions(poolId!, userId!),
    enabled: !!poolId && !!userId,
  })
}

export function useSubmission(
  poolId: string | undefined,
  userId: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.submissions.byPool(poolId ?? '', userId ?? ''),
    queryFn: () => fetchSubmission(poolId!, userId!),
    enabled: !!poolId && !!userId,
  })
}

export function useSavePredictions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      poolId,
      userId,
      scores,
    }: {
      poolId: string
      userId: string
      scores: Record<string, { home: number; away: number }>
    }) => savePredictions(poolId, userId, scores),
    onSuccess: (_, { poolId, userId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.predictions.byPool(poolId, userId),
      })
    },
  })
}

export function useSubmitQuiniela() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ poolId, userId }: { poolId: string; userId: string }) =>
      submitQuiniela(poolId, userId),
    onSuccess: (_, { poolId, userId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.submissions.byPool(poolId, userId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.standings.byPool(poolId),
      })
    },
  })
}
```

- [ ] Commit:
```bash
git add src/queries/predictions.queries.ts
git commit -m "feat: add predictions queries and mutations"
```

---

### Task 14: standings.queries.ts

**Files:**
- Create: `src/queries/standings.queries.ts`

- [ ] Crear el hook:
```typescript
// src/queries/standings.queries.ts
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'
import { fetchStandings } from '@/services/standings.service'

export function useStandings(poolId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.standings.byPool(poolId ?? ''),
    queryFn: () => fetchStandings(poolId!),
    enabled: !!poolId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
}
```

- [ ] Commit:
```bash
git add src/queries/standings.queries.ts
git commit -m "feat: add standings query"
```

---

### Task 15: invites.queries.ts

**Files:**
- Create: `src/queries/invites.queries.ts`

- [ ] Crear los hooks:
```typescript
// src/queries/invites.queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'
import {
  fetchInvites,
  createInvite,
  acceptInvite,
} from '@/services/invites.service'

export function useInvites(poolId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invites.byPool(poolId ?? ''),
    queryFn: () => fetchInvites(poolId!),
    enabled: !!poolId,
  })
}

export function useCreateInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (poolId: string) => createInvite(poolId),
    onSuccess: (_, poolId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invites.byPool(poolId) })
    },
  })
}

export function useAcceptInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ token, userId }: { token: string; userId: string }) =>
      acceptInvite(token, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pools.all })
    },
  })
}
```

- [ ] Commit:
```bash
git add src/queries/invites.queries.ts
git commit -m "feat: add invites queries and mutations"
```

---

## FASE 4: AUTH FIX

### Task 16: Slim auth store

**Files:**
- Modify: `src/store/auth.ts`

- [ ] Leer el archivo actual:
```bash
cat src/store/auth.ts
```

- [ ] Reemplazar con store mínimo (preservar el nombre del export si las screens ya lo importan):
```typescript
// src/store/auth.ts
import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'

interface AuthState {
  session: Session | null
  user: User | null
  setSession: (session: Session | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  setSession: (session) =>
    set({ session, user: session?.user ?? null }),
}))
```

- [ ] Commit:
```bash
git add src/store/auth.ts
git commit -m "refactor: slim auth store to session + user only"
```

---

### Task 17: Root layout — QueryClientProvider + auth listener

**Files:**
- Modify: `app/_layout.tsx`

- [ ] Leer el archivo actual completo:
```bash
cat app/_layout.tsx
```

- [ ] Añadir QueryClientProvider envolviendo todo el layout, y el listener de auth en un useEffect. Preservar toda la lógica existente de fonts/splash/Stack:
```typescript
// app/_layout.tsx — añadir estos imports al tope:
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

// Fuera del componente (nivel de módulo):
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30, // 30 segundos por defecto
    },
  },
})

// Dentro del componente RootLayout, añadir:
const setSession = useAuthStore((s) => s.setSession)

useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session)
  })
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_, session) => {
    setSession(session)
  })
  return () => subscription.unsubscribe()
}, [])

// Envolver el return existente con QueryClientProvider:
return (
  <QueryClientProvider client={queryClient}>
    {/* ... contenido existente sin cambios ... */}
  </QueryClientProvider>
)
```

- [ ] Commit:
```bash
git add app/_layout.tsx
git commit -m "feat: add QueryClientProvider and auth listener to root layout"
```

---

### Task 18: useAuth hook simplificado

**Files:**
- Modify: `src/hooks/useAuth.ts`

- [ ] Leer el archivo actual:
```bash
cat src/hooks/useAuth.ts
```

- [ ] Reemplazar con hook que lee del store:
```typescript
// src/hooks/useAuth.ts
import { useAuthStore } from '@/store/auth'
import { signOut } from '@/services/auth.service'

export function useAuth() {
  const session = useAuthStore((s) => s.session)
  const user = useAuthStore((s) => s.user)
  return {
    session,
    user,
    isAuthenticated: !!session,
    signOut,
  }
}
```

- [ ] Commit:
```bash
git add src/hooks/useAuth.ts
git commit -m "refactor: simplify useAuth hook"
```

---

## FASE 5: SCREENS MIGRATION

### Task 19: Auth screens (fix login roto)

**Files:**
- Modify: `app/(auth)/` — todos los archivos de esta carpeta

- [ ] Listar y leer las screens de auth:
```bash
ls app/(auth)/
cat app/(auth)/login.tsx   # ajustar al nombre real
```

- [ ] En la screen de login: reemplazar cualquier gestión manual de sesión. El patrón correcto es llamar al servicio y dejar que `onAuthStateChange` propague el cambio — sin `router.push` manual:
```typescript
// app/(auth)/login.tsx — lógica de submit
import { useState } from 'react'
import { signIn } from '@/services/auth.service'
import { AppError } from '@/lib/errors'

// Dentro del componente:
const [error, setError] = useState<string | null>(null)
const [loading, setLoading] = useState(false)

async function handleLogin() {
  setError(null)
  setLoading(true)
  try {
    await signIn(email, password)
    // onAuthStateChange en _layout.tsx maneja la redirección automáticamente
  } catch (err) {
    setError(err instanceof AppError ? err.message : 'Error al iniciar sesión')
  } finally {
    setLoading(false)
  }
}
```

- [ ] Aplicar el mismo patrón en la screen de registro (`signUp` en lugar de `signIn`).

- [ ] Commit:
```bash
git add app/(auth)/
git commit -m "fix: auth screens use service layer, session managed by listener"
```

---

### Task 20: Home / Pools screen

**Files:**
- Modify: screen home dentro de `app/(app)/`

- [ ] Identificar y leer el archivo:
```bash
ls app/(app)/
cat app/(app)/index.tsx  # o el nombre real
```

- [ ] Reemplazar `useEffect` + `useState` de pools por `usePools`:
```typescript
import { usePools } from '@/queries/pools.queries'
import { useAuth } from '@/hooks/useAuth'

export default function HomeScreen() {
  const { user } = useAuth()
  const { data: pools, isLoading, error } = usePools(user?.id)

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorView message={error.message} />

  return (
    // JSX existente — solo cambiar la fuente de datos
  )
}
```

- [ ] Commit:
```bash
git add app/(app)/
git commit -m "refactor: home screen uses usePools query"
```

---

### Task 21: Predictions screen — extraer god component

**Files:**
- Modify: `app/(app)/predictions/index.tsx` (505 líneas → <100)
- Create: `src/hooks/usePredictionsScreen.ts`

El god component tiene 10+ `useState` y lógica mezclada. Se extrae toda la lógica a un custom hook.

- [ ] Leer el archivo actual completo para entender el estado y funciones existentes:
```bash
cat app/(app)/predictions/index.tsx
```

- [ ] Crear `src/hooks/usePredictionsScreen.ts` con toda la lógica:
```typescript
// src/hooks/usePredictionsScreen.ts
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePoolStore } from '@/store/pool'
import {
  usePredictions,
  useSubmission,
  useSavePredictions,
  useSubmitQuiniela,
} from '@/queries/predictions.queries'
import { useMatches } from '@/queries/matches.queries'
import { validateQuiniela } from '@/lib/validation'

export function usePredictionsScreen() {
  const { user } = useAuth()
  const poolId = usePoolStore((s) => s.activePoolId) // ajustar al selector real del store

  const [localScores, setLocalScores] = useState<
    Record<string, { home: number; away: number }>
  >({})
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const { data: matches, isLoading: matchesLoading } = useMatches()
  const { data: predictions, isLoading: predictionsLoading } = usePredictions(
    poolId,
    user?.id
  )
  const { data: submission } = useSubmission(poolId, user?.id)
  const { mutate: save, isPending: saving } = useSavePredictions()
  const { mutate: submit, isPending: submitting } = useSubmitQuiniela()

  const isLoading = matchesLoading || predictionsLoading
  const isLocked = !!submission?.valid

  function updateScore(matchId: string, home: number, away: number) {
    setLocalScores((prev) => ({ ...prev, [matchId]: { home, away } }))
    setValidationErrors([])
  }

  function handleSave() {
    if (!poolId || !user?.id) return
    save({ poolId, userId: user.id, scores: localScores })
  }

  function handleSubmit() {
    if (!poolId || !user?.id) return
    const errors = validateQuiniela(localScores)
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    submit(
      { poolId, userId: user.id },
      {
        onSuccess: () => {
          setShowConfirmSubmit(false)
          setShowSuccessModal(true)
        },
        onError: (err) => {
          setValidationErrors([err.message])
        },
      }
    )
  }

  return {
    matches,
    predictions,
    submission,
    localScores,
    validationErrors,
    isLoading,
    isLocked,
    saving,
    submitting,
    showConfirmSubmit,
    showSuccessModal,
    setShowConfirmSubmit,
    setShowSuccessModal,
    updateScore,
    handleSave,
    handleSubmit,
  }
}
```

Nota: verificar el selector del `usePoolStore` — puede ser `s.currentPool?.id` o similar según el store real.

- [ ] Reemplazar el cuerpo de `app/(app)/predictions/index.tsx` para que solo consuma el hook y renderice JSX:
```typescript
// app/(app)/predictions/index.tsx
import { usePredictionsScreen } from '@/hooks/usePredictionsScreen'
// mantener todos los imports de componentes UI existentes

export default function PredictionsScreen() {
  const {
    matches,
    predictions,
    localScores,
    validationErrors,
    isLoading,
    isLocked,
    saving,
    submitting,
    showConfirmSubmit,
    showSuccessModal,
    setShowConfirmSubmit,
    setShowSuccessModal,
    updateScore,
    handleSave,
    handleSubmit,
  } = usePredictionsScreen()

  if (isLoading) return <LoadingSpinner />

  return (
    // JSX existente — reemplazar referencias a state local por las del hook
  )
}
```

- [ ] Commit:
```bash
git add app/(app)/predictions/index.tsx src/hooks/usePredictionsScreen.ts
git commit -m "refactor: extract predictions screen logic to usePredictionsScreen hook"
```

---

### Task 22: Standings screen

**Files:**
- Modify: `app/(app)/standings/index.tsx`

- [ ] Leer el archivo:
```bash
cat app/(app)/standings/index.tsx
```

- [ ] Reemplazar data fetching manual:
```typescript
import { useStandings } from '@/queries/standings.queries'
import { usePoolStore } from '@/store/pool'

export default function StandingsScreen() {
  const poolId = usePoolStore((s) => s.activePoolId) // ajustar al selector real
  const { data: standings, isLoading, error } = useStandings(poolId)

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorView message={error.message} />

  return (
    // JSX existente
  )
}
```

- [ ] Commit:
```bash
git add app/(app)/standings/index.tsx
git commit -m "refactor: standings screen uses useStandings query"
```

---

### Task 23: Invites screen

**Files:**
- Modify: `app/(app)/invites/index.tsx`

- [ ] Leer el archivo:
```bash
cat app/(app)/invites/index.tsx
```

- [ ] Reemplazar data fetching manual:
```typescript
import { useInvites, useCreateInvite } from '@/queries/invites.queries'
import { usePoolStore } from '@/store/pool'

export default function InvitesScreen() {
  const poolId = usePoolStore((s) => s.activePoolId) // ajustar al selector real
  const { data: invites, isLoading } = useInvites(poolId)
  const { mutate: createInvite, isPending: creating } = useCreateInvite()

  return (
    // JSX existente
  )
}
```

- [ ] Commit:
```bash
git add app/(app)/invites/index.tsx
git commit -m "refactor: invites screen uses invites queries"
```

---

## FASE 6: CLEANUP

### Task 24: Eliminar archivos obsoletos

**Files:**
- Delete: `src/lib/api.ts`
- Delete: `src/lib/scoring.ts`
- Delete: `src/services/pools.ts`
- Delete: `src/services/predictions.ts`
- Delete: `src/services/matches.ts`
- Delete: `src/services/standings.ts`
- Delete: `src/services/invites.ts`
- Delete: `src/hooks/usePool.ts`

- [ ] Verificar que ningún archivo importa los módulos a eliminar:
```bash
grep -r "lib/api\|lib/scoring\|services/pools'\|services/predictions'\|services/matches'\|services/standings'\|services/invites'\|hooks/usePool" src/ app/ --include="*.ts" --include="*.tsx"
```
Expected: 0 resultados. Si hay resultados, actualizar esos imports antes de continuar.

- [ ] Eliminar archivos:
```bash
rm src/lib/api.ts src/lib/scoring.ts
rm src/services/pools.ts src/services/predictions.ts src/services/matches.ts
rm src/services/standings.ts src/services/invites.ts
rm src/hooks/usePool.ts
```

- [ ] Verificar TypeScript:
```bash
npx tsc --noEmit
```
Expected: 0 errores. Corregir cualquier error de tipos antes de continuar.

- [ ] Commit:
```bash
git add -A
git commit -m "chore: remove obsolete files replaced by service and query layers"
```

---

### Task 25: Verificación final

- [ ] TypeScript check limpio:
```bash
npx tsc --noEmit
```
Expected: 0 errores.

- [ ] Arrancar la app:
```bash
npx expo start
```

- [ ] Verificar flujos MVP en dispositivo/simulador:
  - Login y logout funcionan sin redirección manual
  - Lista de pools carga al entrar
  - Crear pool aparece inmediatamente en la lista (invalidación)
  - Guardar predicciones no da error
  - Ver standings dentro de una quiniela
  - Crear invite genera token

- [ ] Commit final:
```bash
git add -A
git commit -m "refactor: architecture refactor complete — 4-layer with TanStack Query"
```
