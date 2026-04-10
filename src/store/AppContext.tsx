import * as React from 'react';
import type { Assignment, Availability, Member, PersistedState, Rehearsal, Song } from '@/types';
import { loadState, saveState } from '@/store/persist';

// Action types are union-typed so the reducer is exhaustive.
// Add new entity actions here as we add them in later steps.
type Action =
  | { type: 'songs/add'; song: Song }
  | { type: 'songs/update'; song: Song }
  | { type: 'songs/delete'; id: string }
  | { type: 'members/add'; member: Member }
  | { type: 'members/update'; member: Member }
  | { type: 'members/delete'; id: string }
  | { type: 'assignments/add'; assignment: Assignment }
  | { type: 'assignments/update'; assignment: Assignment }
  | { type: 'assignments/delete'; id: string }
  | { type: 'rehearsals/add'; rehearsal: Rehearsal }
  | { type: 'rehearsals/update'; rehearsal: Rehearsal }
  | { type: 'rehearsals/delete'; id: string }
  // Upsert: replaces any existing row for (memberId, date). Pass status=null to clear.
  | { type: 'availability/set'; memberId: string; date: string; status: Availability['status'] | null };

function reducer(state: PersistedState, action: Action): PersistedState {
  switch (action.type) {
    case 'songs/add':
      return { ...state, songs: [...state.songs, action.song] };

    case 'songs/update': {
      // If requiredParts shrank, drop assignments for parts no longer needed.
      // Invariant #3 in the data-model skill.
      const allowedParts = new Set(action.song.requiredParts);
      return {
        ...state,
        songs: state.songs.map((s) => (s.id === action.song.id ? action.song : s)),
        assignments: state.assignments.filter(
          (a) => a.songId !== action.song.id || allowedParts.has(a.part),
        ),
      };
    }

    case 'songs/delete':
      // Cascade: drop assignments that reference this song.
      // See band-planner-data-model invariant #1.
      return {
        ...state,
        songs: state.songs.filter((s) => s.id !== action.id),
        assignments: state.assignments.filter((a) => a.songId !== action.id),
      };

    case 'members/add':
      return { ...state, members: [...state.members, action.member] };

    case 'members/update': {
      const updated = action.member;
      // If the member dropped an instrument, also drop any assignment that
      // referenced them on that part. Invariant #4 in the data-model skill.
      const allowedParts = new Set(updated.instruments);
      return {
        ...state,
        members: state.members.map((m) => (m.id === updated.id ? updated : m)),
        assignments: state.assignments.filter(
          (a) => a.memberId !== updated.id || allowedParts.has(a.part),
        ),
      };
    }

    case 'members/delete':
      // Cascade: drop assignments + availability + composer/lyricist refs for this member.
      return {
        ...state,
        members: state.members.filter((m) => m.id !== action.id),
        assignments: state.assignments.filter((a) => a.memberId !== action.id),
        availability: state.availability.filter((av) => av.memberId !== action.id),
        songs: state.songs.map((s) => {
          const hasC = s.composerIds?.includes(action.id);
          const hasL = s.lyricistIds?.includes(action.id);
          if (!hasC && !hasL) return s;
          return {
            ...s,
            composerIds: hasC ? s.composerIds!.filter((id) => id !== action.id) : s.composerIds,
            lyricistIds: hasL ? s.lyricistIds!.filter((id) => id !== action.id) : s.lyricistIds,
          };
        }),
      };

    case 'assignments/add':
      return { ...state, assignments: [...state.assignments, action.assignment] };

    case 'assignments/update':
      return {
        ...state,
        assignments: state.assignments.map((a) =>
          a.id === action.assignment.id ? action.assignment : a,
        ),
      };

    case 'assignments/delete':
      return {
        ...state,
        assignments: state.assignments.filter((a) => a.id !== action.id),
      };

    case 'rehearsals/add':
      return { ...state, rehearsals: [...state.rehearsals, action.rehearsal] };

    case 'rehearsals/update':
      return {
        ...state,
        rehearsals: state.rehearsals.map((r) =>
          r.id === action.rehearsal.id ? action.rehearsal : r,
        ),
      };

    case 'rehearsals/delete':
      return {
        ...state,
        rehearsals: state.rehearsals.filter((r) => r.id !== action.id),
      };

    case 'availability/set': {
      // Drop any existing row for this (memberId, date), then insert if status is non-null.
      // Honors data-model invariant 6 (no duplicate (memberId, date) rows).
      const filtered = state.availability.filter(
        (av) => !(av.memberId === action.memberId && av.date === action.date),
      );
      if (action.status === null) {
        return { ...state, availability: filtered };
      }
      return {
        ...state,
        availability: [
          ...filtered,
          {
            id: crypto.randomUUID(),
            memberId: action.memberId,
            date: action.date,
            status: action.status,
          },
        ],
      };
    }

    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

interface AppContextValue {
  state: PersistedState;
  addSong: (song: Song) => void;
  updateSong: (song: Song) => void;
  deleteSong: (id: string) => void;
  addMember: (member: Member) => void;
  updateMember: (member: Member) => void;
  deleteMember: (id: string) => void;
  addAssignment: (assignment: Assignment) => void;
  updateAssignment: (assignment: Assignment) => void;
  deleteAssignment: (id: string) => void;
  addRehearsal: (rehearsal: Rehearsal) => void;
  updateRehearsal: (rehearsal: Rehearsal) => void;
  deleteRehearsal: (id: string) => void;
  setAvailability: (memberId: string, date: string, status: Availability['status'] | null) => void;
}

const AppContext = React.createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, undefined, loadState);

  // Persist on every state change.
  React.useEffect(() => {
    saveState(state);
  }, [state]);

  const value = React.useMemo<AppContextValue>(
    () => ({
      state,
      addSong: (song) => dispatch({ type: 'songs/add', song }),
      updateSong: (song) => dispatch({ type: 'songs/update', song }),
      deleteSong: (id) => dispatch({ type: 'songs/delete', id }),
      addMember: (member) => dispatch({ type: 'members/add', member }),
      updateMember: (member) => dispatch({ type: 'members/update', member }),
      deleteMember: (id) => dispatch({ type: 'members/delete', id }),
      addAssignment: (assignment) => dispatch({ type: 'assignments/add', assignment }),
      updateAssignment: (assignment) => dispatch({ type: 'assignments/update', assignment }),
      deleteAssignment: (id) => dispatch({ type: 'assignments/delete', id }),
      addRehearsal: (rehearsal) => dispatch({ type: 'rehearsals/add', rehearsal }),
      updateRehearsal: (rehearsal) => dispatch({ type: 'rehearsals/update', rehearsal }),
      deleteRehearsal: (id) => dispatch({ type: 'rehearsals/delete', id }),
      setAvailability: (memberId, date, status) =>
        dispatch({ type: 'availability/set', memberId, date, status }),
    }),
    [state],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
