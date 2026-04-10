---
name: band-planner-data-model
description: Source of truth for the Band Planner data model — entity interfaces, LocalStorage layout, ID generation, migrations, and invariants. Use this skill ANY time you read or write LocalStorage, add or change a field on an entity (Song, Member, Assignment, Rehearsal, Availability, etc.), introduce a new entity, write a migration, or touch serialization/deserialization code. Even if the change "looks small", consult this first — LocalStorage has no schema enforcement and silent data corruption is the most common failure mode in this app.
---

# Band Planner Data Model

LocalStorage gives you no schema, no foreign keys, no type checks at runtime. A typo in a field name or an off-by-one in a migration can corrupt every user's data without throwing. This skill is the single source of truth for the shape of the data and the rules that must always hold.

**Before editing anything that touches persisted data, re-read this file.** If your change conflicts with what's written here, update this file first, then update the code — never the other way around.

## Entities (TypeScript interfaces)

These interfaces live in `src/types/index.ts`. This file is the canonical copy. If you change one, change both in the same commit.
```ts
export type Instrument = 'vocal' | 'keys' | 'guitar_lead' | 'guitar_rhythm' | 'drums' | 'bass';

// 'writing' is original-only (composer/lyricist not both ready yet).
export type SongStatus = 'writing' | 'shelved' | 'learning' | 'rehearsing' | 'polishing' | 'ready';

export type SongKind = 'cover' | 'original';

export type Role = 'composer' | 'lyricist' | 'ops' | 'recording';

// Per-assignment learning status: how well THIS member knows THIS part of THIS song.
export type AssignmentStatus = 'want' | 'practicing' | 'mastered';

export interface Song {
  id: string;                  // UUID
  title: string;
  artist?: string;
  status: SongStatus;
  kind: SongKind;              // 'cover' | 'original'
  // For 'cover' songs this MUST be non-empty (invariant 2).
  // For 'original' songs this MAY be empty (instrumentation 待定).
  requiredParts: Instrument[];
  composerIds?: string[];      // FK -> Member.id; absent => unknown
  lyricistIds?: string[];      // FK -> Member.id; absent => unknown
  // Original-only ready flags. When BOTH true and status==='writing',
  // SongDetailPage auto-transitions status to 'learning'. Cancelling
  // a flag does NOT revert status. Absent => false.
  composerReady?: boolean;
  lyricistReady?: boolean;
  notes?: string;
  createdAt: string;           // ISO 8601 datetime
}

export interface Member {
  id: string;                  // UUID
  name: string;
  instruments: Instrument[];   // what they CAN play
  roles?: Role[];              // optional, backward-compat with v1 data
  createdAt: string;
}

export interface Assignment {
  id: string;                  // UUID
  songId: string;              // FK -> Song.id
  memberId: string;            // FK -> Member.id
  part: Instrument;            // must appear in Song.requiredParts (cover only; originals may have empty requiredParts and no assignments)
  isEmergency: boolean;        // true = backup / "only if nobody else"
  status?: AssignmentStatus;   // absent => 'want'
}

export interface Rehearsal {
  id: string;                  // UUID
  date: string;                // YYYY-MM-DD, NO timezone, NO time component
  attendingMemberIds: string[];// snapshot at save time
  selectedSongIds: string[];   // snapshot of A+B buckets at save time
  notes?: string;
  createdAt: string;           // ISO 8601
}

export interface Availability {
  id: string;                  // UUID
  memberId: string;            // FK -> Member.id
  date: string;                // YYYY-MM-DD, NO timezone
  status: 'available' | 'unavailable' | 'tentative';
}
```
## LocalStorage layout

Single key, single JSON blob. Don't scatter data across multiple keys — it makes migrations impossible to do atomically.

- **Key:** `band_planner_data_v1`
- **Shape:**
  ```ts
  interface PersistedState {
    schemaVersion: number;     // currently 3
    songs: Song[];
    members: Member[];
    assignments: Assignment[];
    rehearsals: Rehearsal[];
    availability: Availability[];
  }
  ```

### When to bump the version

Bump `schemaVersion` (and add a migration) when:
- You add a required field to an existing entity.
- You rename or remove a field.
- You change the meaning of an existing field (e.g. enum value renamed).

You do **not** need to bump when:
- You add a new optional field — old data is forward-compatible.
- You add a new entity that starts empty.

When you do bump, also rename the storage key (e.g. `band_planner_data_v2`) only if the change is large enough that loading old data with the new code would be dangerous. Otherwise keep the same key and rely on the migration chain to upgrade in place. **Default: keep the key, run migrations.** Renaming the key strands old users' data unless the migration explicitly reads from the old key and deletes it.

## ID generation

Always `crypto.randomUUID()`. Never auto-increment.

Why: auto-increment requires reading the current max from storage, which means two tabs racing to insert can collide. UUIDs are collision-free without coordination, and they make it safe to construct objects locally (e.g. in optimistic UI) before persisting.

```ts
const newSong: Song = {
  id: crypto.randomUUID(),
  title,
  status: 'learning',
  requiredParts: ['vocal'],
  createdAt: new Date().toISOString(),
};
```

## Migrations

Every schema change ships with a migration function. They live in `src/store/migrations.ts` as an ordered array. On every app boot, the loader reads the persisted blob, looks at its `schemaVersion`, and runs every migration with a higher index in order.

```ts
type Migration = (data: any) => any;

export const migrations: Migration[] = [
  // index 0: v0 -> v1 (initial)
  (data) => ({ ...data, schemaVersion: 1 }),
  // index 1: v1 -> v2 example
  // (data) => ({ ...data, songs: data.songs.map(s => ({ ...s, key: s.key ?? null })), schemaVersion: 2 }),
];

export function migrate(raw: any): PersistedState {
  let data = raw ?? emptyState();
  const from = data.schemaVersion ?? 0;
  for (let i = from; i < migrations.length; i++) {
    data = migrations[i](data);
  }
  return data;
}
```

Rules:
- Migrations are **append-only**. Never edit a migration that has shipped — users may already have run it.
- Each migration must be idempotent-safe: if it ran on garbage data, it should produce something the next migration can handle (or throw a clear error caught by the loader).
- Unknown fields are preserved, not dropped, unless you're explicitly removing them.

## Invariants

These must hold after every reducer action and after every load. If you write code that could violate one, you have a bug.

1. **Referential integrity.** Every `Assignment.songId` resolves to a `Song`, every `Assignment.memberId` resolves to a `Member`, every `Availability.memberId` resolves to a `Member`. **When you delete a Song, cascade-delete its Assignments. When you delete a Member, cascade-delete that member's Assignments and Availability rows. When you delete a Member, also strip that member's id from every song's `composerIds` and `lyricistIds`.**
2. **`Song.requiredParts` is non-empty for `kind: 'cover'`.** Originals (`kind: 'original'`) may have an empty `requiredParts` (instrumentation 待定). The Song form must enforce the cover-only check; the reducer must reject empty parts on covers.
3. **`Assignment.part` must appear in `Song.requiredParts`.** Dropping a part from a song must also delete any assignments that referenced that part.
4. **`Assignment.part` must be in `Member.instruments`.** If a member is edited to drop an instrument, delete their assignments for that part.
5. **Dates are wall-clock `YYYY-MM-DD` strings, never `Date` objects, never ISO with timezone.** This is the single most common bug source. Storing `new Date().toISOString()` for a "rehearsal day" makes it shift across midnight UTC for users in negative timezones. Use a helper:
   ```ts
   export function toLocalDateString(d: Date): string {
     const y = d.getFullYear();
     const m = String(d.getMonth() + 1).padStart(2, '0');
     const day = String(d.getDate()).padStart(2, '0');
     return `${y}-${m}-${day}`;
   }
   ```
6. **No duplicate (memberId, date) Availability rows.** Updating availability replaces the existing row; it never inserts a second one.
7. **IDs are immutable.** Never reassign an `id` after creation — anything referencing it would dangle.

## Serialization template

Keep this in `src/store/persist.ts`:

```ts
const STORAGE_KEY = 'band_planner_data_v1';

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return migrate(JSON.parse(raw));
  } catch (e) {
    console.error('Failed to load state, starting fresh:', e);
    return emptyState();
  }
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export function emptyState(): PersistedState {
  return {
    schemaVersion: migrations.length,
    songs: [],
    members: [],
    assignments: [],
    rehearsals: [],
    availability: [],
  };
}
```

Notes:
- Wrap parse in try/catch — corrupted JSON should not brick the app.
- Don't `JSON.stringify` with a replacer that drops fields; that loses unknown fields from forward versions.
- Don't write on every keystroke — debounce in the store, or save on each completed action.
