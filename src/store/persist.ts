import type { PersistedState } from '@/types';
import { migrate, migrations } from '@/store/migrations';

const STORAGE_KEY = 'band_planner_data_v1';

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
