import * as React from 'react';
import { ArrowDownUp, CalendarX, ChevronLeft, ChevronRight, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useApp } from '@/store/AppContext';
import { cn, toLocalDateString } from '@/lib/utils';
import { applySeedAvailability } from '@/lib/seedAvailability';
import { ALL_WEEKDAYS, type WeekDay } from '@/lib/rehearsalDay';
import type { Availability, AvailabilityStatus, Member } from '@/types';

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
  const { state, setAvailability, setRehearsalDays, updateMember } = useApp();
  const rDays: WeekDay[] = (state.rehearsalDays ?? [6]) as WeekDay[];
  const rDaySet = React.useMemo(() => new Set(rDays), [rDays]);
  const [brush, setBrush] = React.useState<Brush>('unavailable');
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [painting, setPainting] = React.useState(false);
  const [seedConfirmOpen, setSeedConfirmOpen] = React.useState(false);
  const [seedReport, setSeedReport] = React.useState<string | null>(null);

  const toggleRehearsalDay = (day: WeekDay) => {
    const next = rDaySet.has(day)
      ? rDays.filter((d) => d !== day)
      : [...rDays, day];
    setRehearsalDays(next);
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

  // This week's rehearsal day dates (for sorting).
  const thisWeekRehearsalDates = React.useMemo(() => {
    const s = startOfWeek(new Date());
    return rDays.map((d) => {
      const offset = d === 0 ? 6 : d - 1;
      return toLocalDateString(addDays(s, offset));
    });
  }, [rDays]);

  // Members list: default order from state, only sorted on button click.
  const [sortedMembers, setSortedMembers] = React.useState<Member[] | null>(null);
  const members = sortedMembers ?? state.members;

  const sortByRehearsalDay = () => {
    const rank = (memberId: string): number => {
      let worst = 0;
      for (const rd of thisWeekRehearsalDates) {
        const st = lookup.get(`${memberId}|${rd}`);
        if (st === 'unavailable') worst = Math.max(worst, 2);
        else if (st === 'tentative') worst = Math.max(worst, 1);
      }
      return worst;
    };
    setSortedMembers([...state.members].sort((a, b) => rank(a.id) - rank(b.id)));
  };

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
              <div className="flex">
                {ALL_WEEKDAYS.map((wd) => (
                  <button
                    key={wd.value}
                    type="button"
                    onClick={() => toggleRehearsalDay(wd.value)}
                    className={cn(
                      'border px-2 py-1 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md -ml-px first:ml-0',
                      rDaySet.has(wd.value)
                        ? 'border-zinc-900 bg-zinc-900 text-white z-10 relative'
                        : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50',
                    )}
                  >
                    {wd.label.replace('周', '')}
                  </button>
                ))}
              </div>
            </div>
            <Button variant="secondary" onClick={sortByRehearsalDay}>
              <ArrowDownUp className="mr-1 h-4 w-4" />
              排序
            </Button>
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

            {/* Weekly defaults */}
            <WeeklyDefaultsPanel
              members={state.members}
              dates={dates}
              brush={brush}
              onUpdateMember={updateMember}
              onSetAvailability={setAvailability}
            />
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

/* ---------- Weekly defaults panel ---------- */

const STATUS_STYLE: Record<AvailabilityStatus, string> = {
  unavailable: 'bg-red-500 text-white',
  available: 'bg-emerald-400 text-white',
  tentative: 'bg-amber-400 text-white',
};

// Day labels in Mon-Sun order for display
const WEEKDAY_ORDER: { value: WeekDay; short: string }[] = [
  { value: 1, short: '一' },
  { value: 2, short: '二' },
  { value: 3, short: '三' },
  { value: 4, short: '四' },
  { value: 5, short: '五' },
  { value: 6, short: '六' },
  { value: 0, short: '日' },
];

function WeeklyDefaultsPanel({
  members,
  dates,
  brush,
  onUpdateMember,
  onSetAvailability,
}: {
  members: Member[];
  dates: Date[];
  brush: Brush;
  onUpdateMember: (m: Member) => void;
  onSetAvailability: (memberId: string, date: string, status: Availability['status'] | null) => void;
}) {
  const [applyReport, setApplyReport] = React.useState<string | null>(null);
  const [painting, setPainting] = React.useState(false);

  React.useEffect(() => {
    if (!painting) return;
    const onUp = () => setPainting(false);
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [painting]);

  const getDefault = (member: Member, day: WeekDay): AvailabilityStatus => {
    return member.weeklyDefaults?.[String(day)] as AvailabilityStatus | undefined ?? 'unavailable';
  };

  const paintCell = (member: Member, day: WeekDay) => {
    const target: AvailabilityStatus = brush === 'clear' ? 'unavailable' : brush;
    const cur = getDefault(member, day);
    if (cur === target) return;
    const updated = { ...member.weeklyDefaults, [String(day)]: target };
    onUpdateMember({ ...member, weeklyDefaults: updated });
  };

  const applyToFuture = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDates = dates.filter((d) => d >= today);
    let count = 0;
    for (const m of members) {
      for (const d of futureDates) {
        const day = d.getDay() as WeekDay;
        const status = getDefault(m, day);
        onSetAvailability(m.id, toLocalDateString(d), status);
        count++;
      }
    }
    setApplyReport(`已应用 ${count} 条到可见日期范围`);
  };

  if (members.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">每周常规 Availability</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            点击或拖动设置状态（红=来不了 / 绿=能来 / 黄=不稳定），然后点"应用"覆盖到上方表格
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={applyToFuture}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          应用到可见日期
        </Button>
      </div>
      {applyReport && (
        <p className="mb-2 text-xs text-zinc-600">{applyReport}</p>
      )}
      <div
        className="inline-block rounded-lg border border-zinc-200 bg-white select-none"
        onMouseLeave={() => setPainting(false)}
      >
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="bg-zinc-50 px-3 py-2 text-left font-medium text-zinc-500 border-b border-zinc-200">
                成员
              </th>
              {WEEKDAY_ORDER.map((wd) => (
                <th key={wd.value} className="px-0 py-2 text-center font-medium text-zinc-500 border-b border-zinc-200 w-9">
                  {wd.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td className="bg-white px-3 py-1 font-medium text-zinc-900 border-b border-zinc-100 whitespace-nowrap">
                  {m.name}
                </td>
                {WEEKDAY_ORDER.map((wd) => {
                  const status = getDefault(m, wd.value);
                  return (
                    <td key={wd.value} className="p-0 border-b border-zinc-100">
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); setPainting(true); paintCell(m, wd.value); }}
                        onMouseEnter={() => { if (painting) paintCell(m, wd.value); }}
                        className={cn(
                          'block h-6 w-full transition-colors',
                          STATUS_STYLE[status],
                        )}
                        title={`${m.name} · 周${wd.short} · ${status}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
