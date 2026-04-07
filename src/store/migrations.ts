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
