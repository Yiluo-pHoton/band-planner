// Source of truth: see .claude/skills/band-planner-data-model/SKILL.md

export type Instrument =
  | 'vocal'
  | 'keys'
  | 'guitar_lead'
  | 'guitar_rhythm'
  | 'drums'
  | 'bass';

// 'writing' is original-only: composer/lyricist not both ready yet.
export type SongStatus = 'writing' | 'shelved' | 'learning' | 'rehearsing' | 'polishing' | 'ready';

export type Role = 'composer' | 'lyricist' | 'ops' | 'recording';

// Per-assignment learning status: how well THIS member knows THIS part of THIS song.
// Optional for forward-compat with v1/v2 data; missing => treated as 'want'.
export type AssignmentStatus = 'want' | 'practicing' | 'mastered';

export type SongKind = 'cover' | 'original';

export interface Song {
  id: string;
  title: string;
  artist?: string;
  status: SongStatus;
  kind: SongKind;
  // For 'cover' songs this MUST be non-empty (invariant 2).
  // For 'original' songs this MAY be empty (instrumentation 待定).
  requiredParts: Instrument[];
  composerIds?: string[];   // FK -> Member.id; optional, absent => unknown
  lyricistIds?: string[];   // FK -> Member.id; optional, absent => unknown
  // Original-only: ready flags. When BOTH true and status==='writing',
  // SongDetailPage auto-transitions status to 'learning'. Cancelling a flag
  // does NOT revert status. Absent => false.
  composerReady?: boolean;
  lyricistReady?: boolean;
  notes?: string;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  instruments: Instrument[];
  roles?: Role[];           // optional for backward compat with v1 data
  createdAt: string;
}

export interface Assignment {
  id: string;
  songId: string;
  memberId: string;
  part: Instrument;
  isEmergency: boolean;
  status?: AssignmentStatus; // optional; absent => 'want'
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
  status: AvailabilityStatus;
}

export type AvailabilityStatus = 'available' | 'unavailable' | 'tentative';

export interface PersistedState {
  schemaVersion: number;
  songs: Song[];
  members: Member[];
  assignments: Assignment[];
  rehearsals: Rehearsal[];
  availability: Availability[];
}
