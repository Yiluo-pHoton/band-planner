const STORAGE_KEY = 'band-planner:rehearsal-day';

const DAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const;

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function getRehearsalDay(): WeekDay {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const n = Number(raw);
      if (n >= 0 && n <= 6) return n as WeekDay;
    }
  } catch { /* ignore */ }
  return 6; // Saturday default
}

export function setRehearsalDay(day: WeekDay): void {
  localStorage.setItem(STORAGE_KEY, String(day));
}

export function rehearsalDayLabel(day: WeekDay): string {
  return DAY_LABELS[day] ?? '周六';
}

export const ALL_WEEKDAYS: { value: WeekDay; label: string }[] = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
];

export function nearestWeekday(day: WeekDay): Date {
  const d = new Date();
  const cur = d.getDay();
  const forward = (day - cur + 7) % 7;
  const back = forward === 0 ? 0 : 7 - forward;
  const delta = back <= forward ? -back : forward;
  d.setDate(d.getDate() + delta);
  return d;
}

export function countWeekdaysBetween(from: string, to: string, day: WeekDay): number {
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  if (start > end) return 0;
  const cur = new Date(start);
  while (cur.getDay() !== day) cur.setDate(cur.getDate() + 1);
  let count = 0;
  while (cur <= end) {
    count++;
    cur.setDate(cur.getDate() + 7);
  }
  return count;
}

export function collectWeekdaysBetween(from: string, to: string, day: WeekDay): string[] {
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  if (start > end) return [];
  const cur = new Date(start);
  while (cur.getDay() !== day) cur.setDate(cur.getDate() + 1);
  const result: string[] = [];
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    result.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 7);
  }
  return result;
}
