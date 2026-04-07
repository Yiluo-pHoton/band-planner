// Source of truth: see .claude/skills/band-planner-data-model/SKILL.md

export type Instrument =
  | 'vocal'
  | 'keys'
  | 'guitar_lead'
  | 'guitar_rhythm'
  | 'drums'
  | 'bass';

export type SongStatus = 'shelved' | 'learning' | 'rehearsing' | 'polishing' | 'ready';

export interface Song {
  id: string;
  title: string;
  artist?: string;
  status: SongStatus;
  requiredParts: Instrument[];
  notes?: string;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  instruments: Instrument[];
  createdAt: string;
}

export interface Assignment {
  id: string;
  songId: string;
  memberId: string;
  part: Instrument;
  isEmergency: boolean;
}

export interface Rehearsal {
  id: string;
  date: string;                  // YYYY-MM-DD wall-clock
  attendingMemberIds: string[];  // snapshot
  selectedSongIds: string[];     // snapshot (A+B buckets at save time)
  notes?: string;
  createdAt: string;             // ISO 8601
}

export interface Availability {
  id: string;
  memberId: string;
  date: string;
  status: 'available' | 'unavailable' | 'tentative';
}

export interface PersistedState {
  schemaVersion: number;
  songs: Song[];
  members: Member[];
  assignments: Assignment[];
  rehearsals: Rehearsal[];
  availability: Availability[];
}
