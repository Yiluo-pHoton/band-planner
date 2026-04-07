// Per-day availability seed extracted from the band status doc (2026-04).
// Matches members by exact `name`. Range: 2026-04-11 .. 2026-09-26.
//
// Encoding philosophy:
//   - Doc lists which weekdays a member can come; unlisted weekdays => unavailable.
//   - Absence periods override everything to unavailable.
//   - Vague "maybe absent" periods become tentative on those weeks.
//   - Members not in SEED_RULES are untouched.

import type { Availability, Member } from '@/types';

type Status = Availability['status'];
const A: Status = 'available';
const U: Status = 'unavailable';
const T: Status = 'tentative';

// Day-of-week constants (JS getDay: 0=Sun .. 6=Sat).
const SUN = 0, MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6;

const RANGE_START = '2026-04-11';
const RANGE_END = '2026-09-26';

interface SeedRule {
  name: string;
  // Default status for any day not matched by an override.
  // Usually 'unavailable' (we only know the days they CAN come).
  fallback: Status;
  // Weekdays they can come on (status 'available' unless overridden).
  availableWeekdays?: number[];
  // Weekdays they tentatively can come on.
  tentativeWeekdays?: number[];
  // Override windows: [startISO, endISO, status] inclusive on both ends.
  windows?: Array<[string, string, Status]>;
  // Per-date overrides (highest priority).
  perDate?: Array<[string, Status]>;
}

export const SEED_RULES: SeedRule[] = [
  {
    name: 'Nadie',
    fallback: U,
    availableWeekdays: [FRI, SAT],
  },
  {
    name: 'Haifeng',
    fallback: U,
    availableWeekdays: [MON, TUE, WED, THU, SAT],
  },
  {
    name: 'Boran',
    fallback: U,
    availableWeekdays: [MON, WED, FRI, SAT],
    // 7-8月不在
    windows: [['2026-07-01', '2026-08-31', U]],
  },
  {
    name: 'Ahem',
    fallback: U,
    availableWeekdays: [FRI, SAT],
    // 4/18 - 9月 基本全程不在
    windows: [['2026-04-18', '2026-09-26', U]],
  },
  {
    name: 'Frank',
    fallback: U,
    // 周六不能, 周三/周五能
    availableWeekdays: [WED, FRI],
    // 4月底之后离开, 9月回归
    windows: [['2026-05-01', '2026-08-31', U]],
  },
  {
    name: 'Yibo',
    fallback: U,
    // 周六应该能 (uncertain), 其他待定
    tentativeWeekdays: [SAT],
  },
  {
    name: 'Bingxue',
    fallback: U,
    availableWeekdays: [MON, WED, FRI, SAT],
    // 5月可能有一至两周缺席 — 不确定哪几周, 标 tentative
    perDate: [
      ['2026-05-09', T],
      ['2026-05-16', T],
    ],
  },
  {
    name: '小树',
    fallback: U,
    availableWeekdays: [FRI, SAT],
    // 5月初之后不在
    windows: [['2026-05-04', '2026-09-26', U]],
  },
  {
    name: 'Sky',
    fallback: U,
    // 周六不稳定, 周五也是
    tentativeWeekdays: [FRI, SAT],
    // 5/18 - 6/1 不在
    windows: [['2026-05-18', '2026-06-01', U]],
  },
  {
    name: 'Serene',
    fallback: U,
    availableWeekdays: [MON, TUE, WED, SAT],
  },
  {
    name: 'Sonia',
    fallback: U,
    availableWeekdays: [SAT],
    tentativeWeekdays: [FRI],
    // 5月最后两周不在
    perDate: [
      ['2026-05-23', U],
      ['2026-05-30', U],
    ],
  },
  {
    name: 'Shane',
    fallback: U,
    // 几乎能 (周六), 周日也能
    availableWeekdays: [SAT, SUN],
    // 4月极忙
    perDate: [
      ['2026-04-11', T],
      ['2026-04-18', T],
      ['2026-04-25', T],
    ],
  },
];

export interface SeedReport {
  applied: number;
  matchedNames: string[];
  missingNames: string[];
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function eachDay(startISO: string, endISO: string): Date[] {
  const out: Date[] = [];
  const start = new Date(startISO + 'T00:00:00');
  const end = new Date(endISO + 'T00:00:00');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(new Date(d));
  }
  return out;
}

function statusForDate(rule: SeedRule, d: Date): Status {
  const iso = toISO(d);
  const dow = d.getDay();

  // perDate has highest priority
  if (rule.perDate) {
    for (const [date, st] of rule.perDate) {
      if (date === iso) return st;
    }
  }
  // windows next
  if (rule.windows) {
    for (const [s, e, st] of rule.windows) {
      if (iso >= s && iso <= e) return st;
    }
  }
  // weekday rules
  if (rule.availableWeekdays?.includes(dow)) return A;
  if (rule.tentativeWeekdays?.includes(dow)) return T;
  return rule.fallback;
}

/**
 * Applies SEED_RULES against the current member list.
 * For each matched member, writes one entry per day in [RANGE_START, RANGE_END]
 * after first clearing existing availability in that range (via null upserts on
 * any pre-existing rows in range).
 */
export function applySeedAvailability(
  members: Member[],
  setAvailability: (memberId: string, date: string, status: Status | null) => void,
  existingAvailability?: Availability[],
): SeedReport {
  const matched: string[] = [];
  const missing: string[] = [];
  let applied = 0;

  const days = eachDay(RANGE_START, RANGE_END);

  for (const rule of SEED_RULES) {
    const m = members.find((mm) => mm.name === rule.name);
    if (!m) {
      missing.push(rule.name);
      continue;
    }
    matched.push(rule.name);

    // Clear any existing rows in range first (only those that exist, to avoid noise).
    if (existingAvailability) {
      for (const av of existingAvailability) {
        if (av.memberId !== m.id) continue;
        if (av.date >= RANGE_START && av.date <= RANGE_END) {
          setAvailability(m.id, av.date, null);
        }
      }
    }

    for (const d of days) {
      const iso = toISO(d);
      const st = statusForDate(rule, d);
      setAvailability(m.id, iso, st);
      applied++;
    }
  }

  return { applied, matchedNames: matched, missingNames: missing };
}
