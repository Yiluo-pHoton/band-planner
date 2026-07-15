import * as React from 'react';
import { CalendarX, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useApp } from '@/store/AppContext';
import { cn, toLocalDateString } from '@/lib/utils';
import { applySeedAvailability } from '@/lib/seedAvailability';
import { getRehearsalDay, setRehearsalDay, ALL_WEEKDAYS, type WeekDay } from '@/lib/rehearsalDay';
import type { Availability } from '@/types';

type Brush = 'available' | 'unavailable' | 'tentative' | 'clear';
type CellStatus = Availability['status'] | null;

const WEEKS = 6;
const DAYS = WEEKS * 7;

const BRUSHES: { key: Brush; label: string; swatch: string }[] = [
  { key: 'available', label: '能来', swatch: 'bg-emerald-400' },
  { key: 'unavailable', label: '来不了', swatch: 'bg-red-500' },
  { key: 'tentative', label: '不稳定', swatch: 'bg-amber-400' },
  { key: 'clear', label: '清除', swatch: 'bg-white border border-zinc-300' },
];

// Returns the Monday of the week containing `d`.
function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay(); // 0=Sun..6=Sat
  const delta = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + delta);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export default function AvailabilityPage() {
  const { state, setAvailability } = useApp();
  const [brush, setBrush] = React.useState<Brush>('unavailable');
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [painting, setPainting] = React.useState(false);
  const [seedConfirmOpen, setSeedConfirmOpen] = React.useState(false);
  const [seedReport, setSeedReport] = React.useState<string | null>(null);
  const [rDay, setRDay] = React.useState<WeekDay>(getRehearsalDay);

  const handleRehearsalDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = Number(e.target.value) as WeekDay;
    setRDay(v);
    setRehearsalDay(v);
  };

  // End paint on global mouseup so dragging out of the grid still ends cleanly.
  React.useEffect(() => {
    if (!painting) return;
    const onUp = () => setPainting(false);
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [painting]);

  const start = React.useMemo(() => {
    const today = new Date();
    return addDays(startOfWeek(today), weekOffset * 7);
  }, [weekOffset]);

  const dates = React.useMemo(
    () => Array.from({ length: DAYS }, (_, i) => addDays(start, i)),
    [start],
  );

  // Index availability by `${memberId}|${date}` for O(1) lookup.
  const lookup = React.useMemo(() => {
    const map = new Map<string, CellStatus>();
    for (const av of state.availability) {
      map.set(`${av.memberId}|${av.date}`, av.status);
    }
    return map;
  }, [state.availability]);

  const cellStatus = (memberId: string, date: string): CellStatus => {
    return lookup.get(`${memberId}|${date}`) ?? null;
  };

  const paint = (memberId: string, date: string) => {
    const next: CellStatus = brush === 'clear' ? null : brush;
    const cur = cellStatus(memberId, date);
    if (cur === next) return; // no-op skip avoids dispatch storms during drag
    setAvailability(memberId, date, next);
  };

  const today = toLocalDateString(new Date());

  // The next rehearsal day of the current week (containing today).
  const thisRehearsalDay = React.useMemo(() => {
    const s = startOfWeek(new Date()); // Monday
    const offset = rDay === 0 ? 6 : rDay - 1; // Monday=0 offset
    return toLocalDateString(addDays(s, offset));
  }, [rDay]);

  // Sort members by rehearsal-day status: available/blank (0) → tentative (1) → unavailable (2).
  const members = React.useMemo(() => {
    const rank = (memberId: string): number => {
      const st = lookup.get(`${memberId}|${thisRehearsalDay}`);
      if (st === 'unavailable') return 2;
      if (st === 'tentative') return 1;
      return 0; // 'available' or null
    };
    return [...state.members].sort((a, b) => rank(a.id) - rank(b.id));
  }, [state.members, lookup, thisRehearsalDay]);

  // Date columns where every member is non-unavailable → "everyone can come".
  const everyoneDates = React.useMemo(() => {
    const out = new Set<string>();
    if (state.members.length === 0) return out;
    for (const d of dates) {
      const ds = toLocalDateString(d);
      const ok = state.members.every(
        (m) => lookup.get(`${m.id}|${ds}`) !== 'unavailable',
      );
      if (ok) out.add(ds);
    }
    return out;
  }, [dates, state.members, lookup]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Availability</h1>
            <p className="text-sm text-zinc-500 mt-1">
              拖动单元格标记每个成员的不可用时间。空白 = 默认可用。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500">排练日</span>
              <select
                value={rDay}
                onChange={handleRehearsalDayChange}
                className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900"
              >
                {ALL_WEEKDAYS.map((wd) => (
                  <option key={wd.value} value={wd.value}>{wd.label}</option>
                ))}
              </select>
            </div>
            <Button variant="secondary" onClick={() => setSeedConfirmOpen(true)}>
              <Download className="mr-1 h-4 w-4" />
              导入示例数据
            </Button>
          </div>
        </div>
        {seedReport && (
          <div className="mt-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700">
            {seedReport}
          </div>
        )}

        {members.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-zinc-200 bg-white py-16 text-center">
            <CalendarX className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
            <p className="text-sm font-medium text-zinc-900">还没有成员</p>
            <p className="text-xs text-zinc-500 mt-1">先去成员页添加几个人</p>
          </div>
        ) : (
          <>
            {/* Toolbar: brush + week navigation */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  画笔
                </span>
                {BRUSHES.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setBrush(b.key)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                      brush === b.key
                        ? 'border-zinc-900 bg-zinc-50 text-zinc-900'
                        : 'border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900',
                    )}
                  >
                    <span className={cn('h-3 w-3 rounded-sm', b.swatch)} />
                    {b.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
                  本周
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Timeline grid */}
            <div
              className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white select-none"
              onMouseLeave={() => setPainting(false)}
            >
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-zinc-50 px-3 py-2 text-left font-medium text-zinc-500 border-b border-zinc-200 min-w-[7rem]">
                      成员
                    </th>
                    {dates.map((d, i) => {
                      const ds = toLocalDateString(d);
                      const isToday = ds === today;
                      const isMonday = i % 7 === 0;
                      const isEveryone = everyoneDates.has(ds);
                      const dayLabel = ['一', '二', '三', '四', '五', '六', '日'][
                        (d.getDay() + 6) % 7
                      ];
                      return (
                        <th
                          key={ds}
                          className={cn(
                            'px-1 py-1 text-center font-normal border-b border-zinc-200',
                            isMonday && 'border-l border-zinc-200',
                            isEveryone && 'bg-emerald-100',
                            isToday && !isEveryone && 'bg-zinc-100',
                          )}
                          title={isEveryone ? '所有人都能来' : undefined}
                        >
                          <div className="text-[10px] text-zinc-400">{dayLabel}</div>
                          <div className={cn('text-[11px]', isToday ? 'font-semibold text-zinc-900' : 'text-zinc-600')}>
                            {d.getMonth() + 1}/{d.getDate()}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium text-zinc-900 border-b border-zinc-100 truncate">
                        {m.name}
                      </td>
                      {dates.map((d, i) => {
                        const ds = toLocalDateString(d);
                        const status = cellStatus(m.id, ds);
                        const isMonday = i % 7 === 0;
                        const isToday = ds === today;
                        const isEveryone = everyoneDates.has(ds);
                        return (
                          <td
                            key={ds}
                            className={cn(
                              'p-0 border-b border-zinc-100',
                              isMonday && 'border-l border-zinc-200',
                              isEveryone && 'bg-emerald-50',
                            )}
                          >
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setPainting(true);
                                paint(m.id, ds);
                              }}
                              onMouseEnter={() => {
                                if (painting) paint(m.id, ds);
                              }}
                              className={cn(
                                'block h-6 w-full transition-colors',
                                status === 'unavailable' && 'bg-red-500 hover:bg-red-600',
                                status === 'tentative' && 'bg-amber-400 hover:bg-amber-500',
                                status === 'available' && 'bg-emerald-300 hover:bg-emerald-400',
                                status === null && (isToday ? 'bg-zinc-100 hover:bg-zinc-200' : 'hover:bg-zinc-100'),
                              )}
                              title={`${m.name} · ${ds}${status ? ` · ${status}` : ''}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              提示：按住鼠标拖动可批量绘制；空白格子代表「默认可用」。
            </p>
          </>
        )}
      </div>

      <ConfirmDialog
        open={seedConfirmOpen}
        onOpenChange={setSeedConfirmOpen}
        title="导入示例 availability 数据？"
        description="按成员名字匹配，把 4/11–9/26 每一天的能/不能/不稳定按文档批量写入。该范围内已有数据会被覆盖。"
        confirmLabel="导入"
        onConfirm={() => {
          const r = applySeedAvailability(state.members, setAvailability, state.availability);
          const parts = [
            `已写入 ${r.applied} 条`,
            `匹配到 ${r.matchedNames.length} 个成员`,
          ];
          if (r.missingNames.length > 0) {
            parts.push(`未匹配：${r.missingNames.join('、')}`);
          }
          setSeedReport(parts.join(' · '));
        }}
      />
    </div>
  );
}
