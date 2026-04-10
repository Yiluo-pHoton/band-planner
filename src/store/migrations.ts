import type { PersistedState } from '@/types';

type Migration = (data: any) => any;

// Append-only. Never edit a migration that has shipped.
// Index 0 takes raw v0 (or null) data and produces v1.
export const migrations: Migration[] = [
  (data) => ({
    schemaVersion: 1,
    songs: data?.songs ?? [],
    members: data?.members ?? [],
    assignments: data?.assignments ?? [],
    rehearsals: data?.rehearsals ?? [],
    availability: data?.availability ?? [],
  }),
  // index 1: v1 -> v2. Rehearsal gained attendingMemberIds, selectedSongIds, createdAt.
  // Any pre-existing rehearsal rows (none should exist in the wild yet) get safe defaults.
  (data) => ({
    ...data,
    schemaVersion: 2,
    rehearsals: (data?.rehearsals ?? []).map((r: any) => ({
      id: r.id,
      date: r.date,
      attendingMemberIds: r.attendingMemberIds ?? [],
      selectedSongIds: r.selectedSongIds ?? [],
      notes: r.notes,
      createdAt: r.createdAt ?? new Date().toISOString(),
    })),
  }),
  // index 2: v2 -> v3. Song gained `kind` ('cover' | 'original'). Existing songs default to 'cover'.
  (data) => ({
    ...data,
    schemaVersion: 3,
    songs: (data?.songs ?? []).map((s: any) => ({
      ...s,
      kind: s.kind ?? 'cover',
    })),
  }),
  // index 3: v3 -> v4. AssignmentStatus collapsed: 'ready' merged into 'practicing'.
  // The old "可以排" column is gone; anything sitting there moves to "在练".
  (data) => ({
    ...data,
    schemaVersion: 4,
    assignments: (data?.assignments ?? []).map((a: any) => ({
      ...a,
      status: a.status === 'ready' ? 'practicing' : a.status,
    })),
  }),
];

export function migrate(raw: any): PersistedState {
  let data = raw;
  const from = data?.schemaVersion ?? 0;
  for (let i = from; i < migrations.length; i++) {
    const m = migrations[i];
    if (m) data = m(data);
  }
  return data as PersistedState;
}
