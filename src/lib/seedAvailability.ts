// Hardcoded availability seed extracted from the band status doc (2026-04).
// Matches members by `name` string. Saturdays only, 2026-04-11 .. 2026-09-26.

import type { Availability, Member } from '@/types';

type Status = Availability['status'];
const U: Status = 'unavailable';
const T: Status = 'tentative';

const SATURDAYS = [
  '2026-04-11', '2026-04-18', '2026-04-25',
  '2026-05-02', '2026-05-09', '2026-05-16', '2026-05-23', '2026-05-30',
  '2026-06-06', '2026-06-13', '2026-06-20', '2026-06-27',
  '2026-07-04', '2026-07-11', '2026-07-18', '2026-07-25',
  '2026-08-01', '2026-08-08', '2026-08-15', '2026-08-22', '2026-08-29',
  '2026-09-05', '2026-09-12', '2026-09-19', '2026-09-26',
];

interface SeedRule {
  name: string;
  entries: Array<[string, Status]>;
}

export const SEED_RULES: SeedRule[] = [
  // Nadie, Haifeng (Sakikoz), Serene → all available, no entries
  {
    name: 'Boran',
    entries: [
      ['2026-07-04', U], ['2026-07-11', U], ['2026-07-18', U], ['2026-07-25', U],
      ['2026-08-01', U], ['2026-08-08', U], ['2026-08-15', U], ['2026-08-22', U], ['2026-08-29', U],
    ],
  },
  {
    name: 'Ahem',
    entries: [
      ['2026-04-18', U], ['2026-04-25', U],
      ['2026-05-02', U], ['2026-05-09', U], ['2026-05-16', U], ['2026-05-23', U], ['2026-05-30', U],
      ['2026-06-06', U], ['2026-06-13', U], ['2026-06-20', U], ['2026-06-27', U],
      ['2026-07-04', U], ['2026-07-11', U], ['2026-07-18', U], ['2026-07-25', U],
      ['2026-08-01', U], ['2026-08-08', U], ['2026-08-15', U], ['2026-08-22', U], ['2026-08-29', U],
      ['2026-09-05', U], ['2026-09-12', U], ['2026-09-19', U], ['2026-09-26', U],
    ],
  },
  {
    name: 'Frank',
    entries: SATURDAYS.map((d) => [d, U] as [string, Status]),
  },
  {
    name: 'Yibo',
    entries: SATURDAYS.map((d) => [d, T] as [string, Status]),
  },
  {
    name: 'Bingxue',
    entries: [
      ['2026-05-09', T], ['2026-05-16', T],
    ],
  },
  {
    name: '小树',
    entries: [
      ['2026-05-09', U], ['2026-05-16', U], ['2026-05-23', U], ['2026-05-30', U],
      ['2026-06-06', U], ['2026-06-13', U], ['2026-06-20', U], ['2026-06-27', U],
      ['2026-07-04', U], ['2026-07-11', U], ['2026-07-18', U], ['2026-07-25', U],
      ['2026-08-01', U], ['2026-08-08', U], ['2026-08-15', U], ['2026-08-22', U], ['2026-08-29', U],
      ['2026-09-05', U], ['2026-09-12', U], ['2026-09-19', U], ['2026-09-26', U],
    ],
  },
  {
    name: 'Sky',
    entries: [
      ['2026-04-11', T], ['2026-04-18', T], ['2026-04-25', T],
      ['2026-05-02', T], ['2026-05-09', T], ['2026-05-16', T],
      ['2026-05-23', U], ['2026-05-30', U],
      ['2026-06-06', T], ['2026-06-13', T], ['2026-06-20', T], ['2026-06-27', T],
      ['2026-07-04', T], ['2026-07-11', T], ['2026-07-18', T], ['2026-07-25', T],
      ['2026-08-01', T], ['2026-08-08', T], ['2026-08-15', T], ['2026-08-22', T], ['2026-08-29', T],
      ['2026-09-05', T], ['2026-09-12', T], ['2026-09-19', T], ['2026-09-26', T],
    ],
  },
  {
    name: 'Sonia',
    entries: [
      ['2026-05-23', U], ['2026-05-30', U],
    ],
  },
  {
    name: 'Shane',
    entries: [
      ['2026-04-11', T], ['2026-04-18', T], ['2026-04-25', T],
    ],
  },
];

export interface SeedReport {
  applied: number;        // total (memberId, date) writes
  matchedNames: string[]; // member names successfully matched
  missingNames: string[]; // rules that did not match any member
}

/**
 * Applies SEED_RULES against the current member list. For each rule,
 * looks up a member by exact `name`, then dispatches setAvailability for
 * every (date, status) entry. Members not in the rules are untouched;
 * existing rows on those dates get overwritten by the upsert reducer.
 */
export function applySeedAvailability(
  members: Member[],
  setAvailability: (memberId: string, date: string, status: Status | null) => void,
): SeedReport {
  const matched: string[] = [];
  const missing: string[] = [];
  let applied = 0;

  for (const rule of SEED_RULES) {
    const m = members.find((mm) => mm.name === rule.name);
    if (!m) {
      missing.push(rule.name);
      continue;
    }
    matched.push(rule.name);
    for (const [date, status] of rule.entries) {
      setAvailability(m.id, date, status);
      applied++;
    }
  }

  return { applied, matchedNames: matched, missingNames: missing };
}
