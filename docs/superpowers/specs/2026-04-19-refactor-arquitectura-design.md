# MundialQuiniela — Diseño de Refactor de Arquitectura

**Fecha:** 2026-04-19  
**Rama de trabajo:** `dev`  
**Autor:** Antonio Torres  
**Estado:** Aprobado

---

## Contexto

Proyecto heredado: app móvil de quinielas para el Mundial 2026 (React Native + Expo + Supabase). El código presenta múltiple responsabilidad, código espagueti, concerns mezclados, y varios CRUDs rotos (login, crear/guardar quiniela). El Mundial arranca en junio 2026 (~7 semanas). Desarrollador único.

## MVP en Scope

1. Auth (login / registro)
2. Crear y guardar quiniela
3. Ver standings y puntuaje dentro de cada quiniela
4. Saber quién ganó en cada quiniela

**Fuera del MVP:** Pagos / IAP (fase posterior)

---

## Decisiones de Arquitectura

### Stack (sin cambios)
- React Native + Expo + Expo Router
- Supabase (PostgreSQL + Auth + Edge Functions)
- Zustand (solo UI state)
- TypeScript strict

### Nuevo: TanStack Query para server state
Reemplaza todos los `useEffect` + `useState` de data fetching. Resuelve estructuralmente los CRUDs rotos (race conditions, stale state, loading/error manual).

### Real-time: Post-MVP
El caso "ver standings actualizados al abrir la app" se cubre con `refetchOnMount` + `refetchOnWindowFocus` de TanStack Query (gratis, sin configuración extra). Supabase Realtime subscriptions se añaden post-MVP en la capa de standings.

### Scoring: fuente única en DB
`src/lib/scoring.ts` se elimina del cliente. La fuente de verdad es el RPC `recalculate_standings` en Supabase. Elimina lógica duplicada entre cliente y Edge Function.

### CRUD Factory: patrón base, no factory completo
Las entidades del dominio tienen lógica especial (submitQuiniela es RPC atómico, standings es read-only, invites es unidireccional). Se usa un patrón base consistente sin abstraer en un factory genérico.

---

## Arquitectura de Capas

```
┌─────────────────────────────────────────┐
│  SCREENS (app/)                         │  Solo composición: hooks + JSX
│  Sin lógica de negocio                  │
├─────────────────────────────────────────┤
│  QUERIES (src/queries/)                 │  TanStack Query hooks
│  useQuery / useMutation por dominio     │  Loading, error, cache, invalidación
├─────────────────────────────────────────┤
│  SERVICES (src/services/)               │  Funciones async puras
│  Solo acceso a Supabase, sin hooks      │  Lanzan AppError tipado
├─────────────────────────────────────────┤
│  SUPABASE CLIENT (src/lib/supabase.ts)  │  Cliente único, sin lógica
└─────────────────────────────────────────┘

ZUSTAND → solo UI state
  - session / user (sincronizado con onAuthStateChange)
  - pendingInvite (deep-link)
```

**Regla:** ninguna screen toca servicios directamente. Los servicios no conocen React Query.

---

## Estructura de Carpetas

```
src/
├── lib/
│   ├── supabase.ts          ← sin cambios
│   ├── errors.ts            ← nuevo: AppError class
│   ├── validation.ts        ← sin cambios
│   ├── footballApi.ts       ← extraído de api.ts (eliminado)
│   └── tournament.ts        ← sin cambios
│   [scoring.ts ELIMINADO → vive en DB RPC]
│
├── services/                ← funciones async puras
│   ├── auth.service.ts      ← signIn, signUp, signOut, getSession
│   ├── pools.service.ts     ← fetchPools, createPool, deletePool, joinPool
│   ├── predictions.service.ts ← fetchPredictions, savePredictions, submitQuiniela
│   ├── matches.service.ts   ← fetchMatches
│   ├── standings.service.ts ← fetchStandings
│   └── invites.service.ts   ← createInvite, acceptInvite
│
├── queries/                 ← TanStack Query hooks (nuevo)
│   ├── queryKeys.ts         ← constantes de cache keys
│   ├── pools.queries.ts
│   ├── predictions.queries.ts
│   ├── matches.queries.ts
│   ├── standings.queries.ts
│   └── invites.queries.ts
│
├── store/                   ← Zustand solo UI state
│   ├── auth.ts              ← session + user (mínimo)
│   └── pendingInvite.ts     ← sin cambios
│
├── components/              ← sin cambios estructurales
│   └── ui/
│
├── hooks/                   ← hooks de utilidad (no data fetching)
│   └── useAuth.ts
│
└── types/
    └── index.ts
```

---

## Patrones Clave

### Error Handling — AppError

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

// En servicios:
if (error) throw new AppError('FETCH_POOLS_FAILED', error.message)
// React Query captura y expone via query.error
```

### Service Pattern

```typescript
// src/services/pools.service.ts
export async function fetchPools(userId: string): Promise<Pool[]> {
  const { data, error } = await supabase
    .from('pools')
    .select('*, pool_members!inner(*)')
    .eq('pool_members.user_id', userId)
  if (error) throw new AppError('FETCH_POOLS_FAILED', error.message)
  return data
}
```

### Query Keys

```typescript
// src/queries/queryKeys.ts
export const queryKeys = {
  pools:       { all: ['pools'] as const,
                 byUser: (uid: string) => ['pools', uid] as const },
  predictions: { byPool: (poolId: string) => ['predictions', poolId] as const },
  standings:   { byPool: (poolId: string) => ['standings', poolId] as const },
  matches:     { all: ['matches'] as const },
}
```

### Mutation con Invalidación

```typescript
// src/queries/predictions.queries.ts
export function useSavePredictions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ poolId, scores }: SaveInput) => savePredictions(poolId, scores),
    onSuccess: (_, { poolId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.predictions.byPool(poolId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.standings.byPool(poolId) })
    },
  })
}
```

### Screen Pattern (thin)

```typescript
// Una screen solo hace esto:
const { data: predictions, isLoading, error } = usePredictions(poolId)
const { mutate: save, isPending } = useSavePredictions()
```

### Auth Flow

```typescript
// app/_layout.tsx — listener único permanente
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_, session) => setSession(session)
  )
  return () => subscription.unsubscribe()
}, [])

// Screens de auth solo llaman supabase.auth.signInWithPassword(...)
// El listener propaga el cambio al store automáticamente
```

---

## Flujo Auth (login roto → fix)

```
App arranca
    ↓
Root layout registra onAuthStateChange (una vez)
    ↓
Supabase dispara SIGNED_IN | SIGNED_OUT | TOKEN_REFRESHED
    ↓
Zustand auth store actualiza { session, user }
    ↓
Expo Router redirige: (auth) ↔ (app)
    ↓
TanStack queries con enabled: !!userId
(no se ejecutan sin sesión activa)
```

---

## Qué se Elimina

| Archivo/Patrón | Motivo |
|---|---|
| `src/lib/api.ts` | Dividido en `footballApi.ts` + servicios |
| `src/lib/scoring.ts` | Lógica mueve a DB (RPC único) |
| `useState` para loading/error en screens | Reemplazado por React Query |
| `useEffect` para data fetching | Reemplazado por `useQuery` |
| God component `predictions/index.tsx` (505 líneas) | Descompuesto en hooks + componentes |

---

## Fuera del Scope de este Refactor

- Supabase Realtime subscriptions (post-MVP)
- Pagos / IAP
- Cambios en esquema de base de datos (se auditan y parchean, no se rediseñan)
- Tests E2E
