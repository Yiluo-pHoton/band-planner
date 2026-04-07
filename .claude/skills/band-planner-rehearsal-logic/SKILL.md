---
name: band-planner-rehearsal-logic
description: The complete spec for the rehearsal planning page (Tab 5) — how songs are sorted into the A / B / C columns based on who's attending and which parts are covered. Use this skill ANY time you touch the rehearsal planning page, the attendance toggles, the A/B/C computation, or any helper that decides "which songs can we actually play today". This is the most subtle business logic in the whole app and changes here break in non-obvious ways. Re-read the algorithm and the edge case list before editing.
---

# Rehearsal Planning Logic (Tab 5)

The rehearsal page answers one question: **given who showed up today, what can we actually play?** It splits eligible songs into three buckets:

- **A — fully playable** (every required part is covered by a regular, non-emergency assignment, by someone who's here)
- **B — playable with backups** (some parts only have an emergency-assigned player who's here)
- **C — almost there** (still missing 1 or 2 parts even after counting emergency players)

Songs that can't even fit in C are not shown at all. Songs with `status === 'shelved'` are never shown anywhere on this page.

This logic is fragile because each branch depends on the previous one's output and edge cases (double parts, dual-assigned members) hide easily. **Re-read this whole file before changing anything.**

## Inputs

- `songs: Song[]`
- `members: Member[]`
- `assignments: Assignment[]`
- `attendingIds: Set<string>` — the set of `Member.id` toggled "present" for this session

## Status priority (highest first)

Used for sorting within each column:

1. `ready`
2. `polishing`
3. `rehearsing`
4. `learning`
5. ~~`shelved`~~ — filtered out, never displayed

## Coverage rules

A song's `requiredParts` is a list, **not a set**. `['vocal', 'vocal']` means the song needs two vocalists; `['vocal']` needs one. Coverage works by occurrence:

> For each occurrence of a part in `requiredParts`, you need a *distinct* assignment that satisfies it.

Two assignments can both be `vocal`, but they must come from two different `(memberId, assignmentId)` pairs. The same member assigned twice to the same song still only fills one slot per assignment row — but in practice we don't allow duplicate `(songId, memberId, part)` rows in the data, so this rarely matters.

A part-occurrence is **covered** if there exists an assignment where:
- `assignment.songId === song.id`
- `assignment.part === part`
- `assignment.memberId ∈ attendingIds`

We track coverage in two flavors:
- **regular-covered**: the matching assignment has `isEmergency === false`
- **emergency-covered**: the matching assignment has `isEmergency === true`

A part-occurrence is "covered at all" if it has either; it's "regular-covered" only if at least one regular assignment satisfies it.

## Algorithm (reference implementation)

```ts
type Bucket = 'A' | 'B' | 'C' | null;

function bucketFor(song: Song, assignments: Assignment[], attendingIds: Set<string>): Bucket {
  const songAssignments = assignments.filter(a => a.songId === song.id);

  // Greedy match: walk requiredParts in order, consume one assignment per slot.
  const usedRegular = new Set<string>();
  const usedEmergency = new Set<string>();
  let regularSlots = 0;
  let emergencyOnlySlots = 0;
  let uncoveredSlots = 0;

  for (const part of song.requiredParts) {
    // Try a regular assignment first
    const reg = songAssignments.find(a =>
      a.part === part &&
      !a.isEmergency &&
      attendingIds.has(a.memberId) &&
      !usedRegular.has(a.id)
    );
    if (reg) { usedRegular.add(reg.id); regularSlots++; continue; }

    // Fall back to an emergency assignment
    const emg = songAssignments.find(a =>
      a.part === part &&
      a.isEmergency &&
      attendingIds.has(a.memberId) &&
      !usedEmergency.has(a.id)
    );
    if (emg) { usedEmergency.add(emg.id); emergencyOnlySlots++; continue; }

    uncoveredSlots++;
  }

  if (uncoveredSlots === 0 && emergencyOnlySlots === 0) return 'A';
  if (uncoveredSlots === 0) return 'B';
  if (uncoveredSlots <= 2) return 'C';
  return null;
}
```

Then:

```ts
function planRehearsal(songs, assignments, attendingIds) {
  const A = [], B = [], C = [];
  for (const song of songs) {
    if (song.status === 'shelved') continue;
    const b = bucketFor(song, assignments, new Set(attendingIds));
    if (b === 'A') A.push(song);
    else if (b === 'B') B.push(song);
    else if (b === 'C') C.push(song);
  }
  const byStatus = (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status];
  return { A: A.sort(byStatus), B: B.sort(byStatus), C: C.sort(byStatus) };
}
```

`STATUS_RANK` is the priority list above with `ready=0` (sorted ascending).

## Why greedy match is correct

Walking `requiredParts` in order and consuming one assignment per slot works because:

1. Assignments are typed by `part`, so an assignment for `vocal` can only fill a `vocal` slot — there's no cross-instrument substitution to optimize.
2. Within a single part, assignments are interchangeable from the slot's perspective (we don't care *which* vocalist fills which `vocal` slot, just that two distinct ones exist).
3. Therefore matching is a bipartite matching where each part forms an isolated subgraph, and greedy = optimal.

If you ever introduce something like "lead vocal vs backing vocal" as a sub-distinction, this becomes a real bipartite matching problem and you need to redo the algorithm.

## Edge cases (read carefully)

1. **Double vocal, only one vocalist present.** `requiredParts = ['vocal','vocal']`, one vocalist attending. First slot covered, second slot uncovered → 1 uncovered → goes to C (if total uncovered ≤ 2). Correct.
2. **Both regular and emergency assignment for the same part exist, both attending.** Algorithm prefers regular first (so the emergency player is "saved" for another slot if there is one). The song still ends up in A. Correct.
3. **Same member assigned to two different parts of the same song.** Allowed in data. They count as two separate assignments, fill two separate slots. The UI must show both, but at actual playtime the human can only do one — that's a display problem, not a logic problem, and we leave it to the user to resolve out of band.
4. **Member is assigned but not in `instruments`.** Shouldn't happen — the data-model invariants forbid it — but if it does, treat the assignment as valid (don't filter on `member.instruments`). Validation belongs in the assignment editor, not in the planner.
5. **Song with empty `requiredParts`.** Shouldn't happen (data-model invariant). If it does anyway, `uncoveredSlots === 0 && emergencyOnlySlots === 0` is trivially true → goes to A. Don't add a special case; fix the data instead.
6. **Nobody attending (`attendingIds` is empty).** Every song with `requiredParts.length > 2` gets filtered out (more than 2 uncovered). Songs with 1 or 2 required parts and no coverage end up in C. Render the empty-state placeholder per the UI conventions skill.
7. **All assignments are emergency.** Song goes to B if every slot is covered by an emergency player; to C if 1-2 slots are still uncovered.
8. **`isEmergency` flag flipped on an existing assignment.** No special handling needed — recompute on every render. Don't memoize coverage state across attendance changes.

## Test scenarios (manual checklist)

When you change the algorithm, walk through these by hand:

- **Trio, all present, all regular** → song in A.
- **Trio, drummer only has an emergency assignment, drummer present** → song in B.
- **Trio, drummer absent, no backup** → song in C.
- **Trio, drummer absent, bassist absent, no backups** → song hidden (3 required, 2 uncovered fits in C; verify boundary).
- **Quartet, 3 uncovered** → song hidden.
- **Double-vocal song, 2 vocalists present** → song in A.
- **Double-vocal song, 1 vocalist present** → song in C.
- **Shelved song with full coverage** → not shown anywhere.
- **Two songs with same status, alphabetical?** No — we don't sort by title within status. Insertion order is fine. If you change this, document it here.

## What this skill does NOT cover

- The visual layout of the three columns — that's in `band-planner-ui-conventions`.
- Persisting attendance — attendance is **session-only** state (React state), not persisted to LocalStorage. If you want to remember attendance across reloads, that's a feature change, ask first.
- Suggesting setlists / picking N songs out of A — out of scope for this page.
