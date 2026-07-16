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

/** Write state to Firestore. */
export function saveToFirestore(state: PersistedState, writeId: string): void {
  try {
    const ref = doc(db, FIRESTORE_DOC);
    // JSON round-trip strips `undefined` values that Firestore rejects.
    const clean = JSON.parse(JSON.stringify({ ...state, _writeId: writeId }));
    setDoc(ref, clean).catch((e) => {
      console.error('Failed to save to Firestore:', e);
    });
  } catch (e) {
    console.error('Failed to save to Firestore (sync):', e);
  }
}

/**
 * Subscribe to real-time Firestore updates.
 * `onChange` fires for remote changes only.
 * `onReady(hasData)` fires once on the very first snapshot so the caller
 * knows Firestore has been consulted and it is safe to start writing.
 */
export function subscribeFirestore(
  localWriteId: () => string,
  onChange: (state: PersistedState) => void,
  onReady: (hasData: boolean) => void,
): Unsubscribe {
  const ref = doc(db, FIRESTORE_DOC);
  let ready = false;
  return onSnapshot(ref, (snapshot) => {
    const data = snapshot.data();

    if (!ready) {
      ready = true;
      onReady(!!data);
    }

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
