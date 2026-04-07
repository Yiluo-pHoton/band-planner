import type { Assignment, Song, SongStatus } from '@/types';

// See .claude/skills/band-planner-rehearsal-logic/SKILL.md
// Edit that skill BEFORE editing this file. Re-read the edge case list.

export type Bucket = 'A' | 'B' | 'C';

// Lower number = higher priority. Used for sorting within each column.
export const STATUS_RANK: Record<SongStatus, number> = {
  ready: 0,
  polishing: 1,
  rehearsing: 2,
  learning: 3,
  shelved: 99, // never shown, but keep the type total
};

/**
 * Decide which bucket a song belongs to given today's attendance.
 *
 * Returns null if the song can't even fit in C (more than 2 uncovered slots).
 *
 * Greedy match is correct here because each `part` forms an isolated bipartite
 * subgraph: a `vocal` assignment can only fill a `vocal` slot, and within a
 * single part the assignments are interchangeable from the slot's perspective.
 * See "Why greedy match is correct" in the rehearsal-logic skill.
 */
export function bucketFor(
  song: Song,
  assignments: Assignment[],
  attendingIds: Set<string>,
): Bucket | null {
  const songAssignments = assignments.filter((a) => a.songId === song.id);

  const usedRegular = new Set<string>();
  const usedEmergency = new Set<string>();
  let emergencyOnlySlots = 0;
  let uncoveredSlots = 0;

  for (const part of song.requiredParts) {
    // Prefer a regular (non-emergency) assignment first.
    const reg = songAssignments.find(
      (a) =>
        a.part === part &&
        !a.isEmergency &&
        attendingIds.has(a.memberId) &&
        !usedRegular.has(a.id),
    );
    if (reg) {
      usedRegular.add(reg.id);
      continue;
    }

    // Fall back to an emergency assignment.
    const emg = songAssignments.find(
      (a) =>
        a.part === part &&
        a.isEmergency &&
        attendingIds.has(a.memberId) &&
        !usedEmergency.has(a.id),
    );
    if (emg) {
      usedEmergency.add(emg.id);
      emergencyOnlySlots++;
      continue;
    }

    uncoveredSlots++;
  }

  if (uncoveredSlots === 0 && emergencyOnlySlots === 0) return 'A';
  if (uncoveredSlots === 0) return 'B';
  if (uncoveredSlots <= 2) return 'C';
  return null;
}

export interface RehearsalPlan {
  A: Song[];
  B: Song[];
  C: Song[];
}

export function planRehearsal(
  songs: Song[],
  assignments: Assignment[],
  attendingIds: Set<string>,
): RehearsalPlan {
  const A: Song[] = [];
  const B: Song[] = [];
  const C: Song[] = [];

  for (const song of songs) {
    if (song.status === 'shelved') continue; // edge case 5 / shelved rule
    const b = bucketFor(song, assignments, attendingIds);
    if (b === 'A') A.push(song);
    else if (b === 'B') B.push(song);
    else if (b === 'C') C.push(song);
  }

  const byStatus = (a: Song, b: Song) => STATUS_RANK[a.status] - STATUS_RANK[b.status];
  return { A: A.sort(byStatus), B: B.sort(byStatus), C: C.sort(byStatus) };
}

/**
 * For a given song + part, find the assignment that the planner would actually
 * "consume" today, plus the leftover assignments that exist but aren't being
 * used (e.g. a second bassist who's also present). Used by the rehearsal page
 * to show "who's actually playing this part today".
 *
 * Returns assignments in display order: chosen first, then unused (regular
 * before emergency).
 */
export function presentAssignmentsForPart(
  songId: string,
  part: Assignment['part'],
  assignments: Assignment[],
  attendingIds: Set<string>,
): Assignment[] {
  return assignments
    .filter((a) => a.songId === songId && a.part === part && attendingIds.has(a.memberId))
    .sort((a, b) => Number(a.isEmergency) - Number(b.isEmergency));
}
