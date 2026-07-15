import { doc, setDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PersistedState } from '@/types';
import { migrate, migrations } from '@/store/migrations';

const STORAGE_KEY = 'band_planner_data_v1';
const FIRESTORE_DOC = 'bands/default';

export function emptyState(): PersistedState {
  return {
    schemaVersion: migrations.length,
    songs: [],
    members: [],
    assignments: [],
    rehearsals: [],
    availability: [],
    shows: [],
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

/** Write state to Firestore. Returns the timestamp used as write marker. */
export function saveToFirestore(state: PersistedState, writeId: string): void {
  const ref = doc(db, FIRESTORE_DOC);
  setDoc(ref, { ...state, _writeId: writeId }).catch((e) => {
    console.error('Failed to save to Firestore:', e);
  });
}

/** Subscribe to real-time Firestore updates. Calls `onChange` for remote changes only. */
export function subscribeFirestore(
  localWriteId: () => string,
  onChange: (state: PersistedState) => void,
): Unsubscribe {
  const ref = doc(db, FIRESTORE_DOC);
  return onSnapshot(ref, (snapshot) => {
    const data = snapshot.data();
    if (!data) return;

    // Skip our own writes
    if (data['_writeId'] === localWriteId()) return;

    // Strip internal field and migrate
    const { _writeId: _, ...rest } = data;
    try {
      const migrated = migrate(rest);
      onChange(migrated);
    } catch (e) {
      console.error('Failed to process Firestore snapshot:', e);
    }
  });
}
