import * as React from 'react';
import { CalendarClock, CheckCircle2, ChevronDown, ExternalLink, HelpCircle, Save, Zap } from 'lucide-react';
import { AttendanceBar } from '@/components/AttendanceBar';
import { Button } from '@/components/ui/button';
import { SaveRehearsalDialog } from '@/components/SaveRehearsalDialog';
import { useApp } from '@/store/AppContext';
import { INSTRUMENTS, INSTRUMENT_META } from '@/lib/instruments';
import { SONG_STATUS_META } from '@/lib/songStatus';
import {
  planRehearsal,
  presentAssignmentsForPart,
  type Bucket,
  type RehearsalPlan,
} from '@/lib/rehearsalPlanner';
import { Input } from '@/components/ui/input';
import { cn, toLocalDateString } from '@/lib/utils';
import type { Instrument, Song } from '@/types';

// Short Chinese labels for the rehearsal page part rows.
const PART_SHORT_LABEL: Record<Instrument, string> = {
  vocal: '主唱',
  keys: '键盘',
  guitar_lead: '主音',
  guitar_rhythm: '节奏',
  drums: '鼓手',
  bass: '贝斯',
};

interface RehearsalPageProps {
  attendingIds: Set<string>;
  onAttendingChange: (next: Set<string>) => void;
  onSelectSong: (id: string) => void;
}

export default function RehearsalPage({
  attendingIds,
  onAttendingChange,
  onSelectSong,
}: RehearsalPageProps) {
  const { state, addRehearsal } = useApp();
  const [saveOpen, setSaveOpen] = React.useState(false);

  // Compute nearest Saturday for initial date.
  const nearestSaturday = React.useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const forward = (6 - day + 7) % 7;
    const back = forward === 0 ? 0 : 7 - forward;
    const delta = back <= forward ? -back : forward;
    d.setDate(d.getDate() + delta);
    return toLocalDateString(d);
  }, []);

  const [date, setDate] = React.useState(nearestSaturday);

  // On mount, auto-prefill attendance for the nearest Saturday.
  const mountRef = React.useRef(false);
  React.useEffect(() => {
    if (mountRef.current) return;
    mountRef.current = true;
    const suggested = new Set<string>();
    for (const m of state.members) {
      const av = state.availability.find(
        (a) => a.memberId === m.id && a.date === nearestSaturday,
      );
      if (av?.status !== 'unavailable' && av?.status !== 'tentative') {
        suggested.add(m.id);
      }
    }
    onAttendingChange(suggested);
  }, [nearestSaturday, state.members, state.availability, onAttendingChange]);

  // Recompute attendance when the user picks a new date.
  const handleDateChange = (next: string) => {
    setDate(next);
    const suggested = new Set<string>();
    for (const m of state.members) {
      const av = state.availability.find(
        (a) => a.memberId === m.id && a.date === next,
      );
      if (av?.status !== 'unavailable' && av?.status !== 'tentative') {
        suggested.add(m.id);
      }
    }
    onAttendingChange(suggested);
  };

  const plan: RehearsalPlan = React.useMemo(
    () => planRehearsal(state.songs, state.assignments, attendingIds),
    [state.songs, state.assignments, attendingIds],
  );

  const selectedSongIds = React.useMemo(
    () => [...plan.A, ...plan.B].map((s) => s.id),
    [plan],
  );

  const canSave = attendingIds.size > 0 && selectedSongIds.length > 0;

  // "What-if" hints: for each absent member, how many C songs would upgrade?
  const whatIfHints = React.useMemo(() => {
    if (plan.C.length === 0) return [];
    const absentMembers = state.members.filter((m) => !attendingIds.has(m.id));
    const results: { memberId: string; name: string; upgrades: number }[] = [];
    for (const m of absentMembers) {
      const hypothetical = new Set(attendingIds);
      hypothetical.add(m.id);
      const hypoP = planRehearsal(state.songs, state.assignments, hypothetical);
      const upgrades = plan.C.length - hypoP.C.length;
      if (upgrades > 0) results.push({ memberId: m.id, name: m.name, upgrades });
    }
    return results.sort((a, b) => b.upgrades - a.upgrades);
  }, [plan.C, state.members, state.songs, state.assignments, attendingIds]);

  // Pretty date hint: weekday + relative ("今天" / "明天" / "X 天后")
  const dateHint = React.useMemo(() => {
    const [y, mo, da] = date.split('-').map(Number) as [number, number, number];
    const target = new Date(y, mo - 1, da);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((target.getTime() - today.getTime()) / 86400000);
    const wk = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][target.getDay()];
    let rel = '';
    if (days === 0) rel = '今天';
    else if (days === 1) rel = '明天';
    else if (days === -1) rel = '昨天';
    else if (days > 0) rel = `${days} 天后`;
    else rel = `${-days} 天前`;
    return `${wk} · ${rel}`;
  }, [date]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">排练规划</h1>
            <p className="text-sm text-zinc-500 mt-1">
              选个日期，出勤会按 availability 预填，A / B / C 自动算
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-sm">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const d = new Date();
                const day = d.getDay(); // 0=Sun … 6=Sat
                const forward = (6 - day + 7) % 7; // days until next Sat
                const back = forward === 0 ? 0 : 7 - forward; // days since last Sat
                const delta = back <= forward ? -back : forward; // pick nearest
                d.setDate(d.getDate() + delta);
                handleDateChange(toLocalDateString(d));
              }}
              title="跳到最近的周六"
            >
              <CalendarClock className="mr-1 h-4 w-4" />
              下次排练
            </Button>
            <div className="flex flex-col">
              <Input
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="h-8 w-40 border-zinc-200"
              />
              <span className="mt-0.5 px-1 text-[10px] text-zinc-500">{dateHint}</span>
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={!canSave}
              onClick={() => setSaveOpen(true)}
            >
              <Save className="mr-1 h-4 w-4" />
              保存
            </Button>
          </div>
        </div>

        <section className="mt-5 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              今天到场
            </h2>
            <span className="text-xs text-zinc-400">{attendingIds.size} 人</span>
          </div>
          <AttendanceBar attendingIds={attendingIds} onChange={onAttendingChange} date={date} />
        </section>

        <div className="mt-5">
          {attendingIds.size === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white py-12 text-center">
              <p className="text-sm font-medium text-zinc-900">还没勾选到场的人</p>
              <p className="text-xs text-zinc-500 mt-1">
                在上方勾选今天到场的成员，A / B / C 三栏会自动算出来
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <BucketColumn
                bucket="A"
                title="完整阵容"
                description="所有 part 都有正式分配的人到场"
                songs={plan.A}
                attendingIds={attendingIds}
                onSelect={onSelectSong}
              />
              <BucketColumn
                bucket="B"
                title="替补阵容"
                description="有 part 靠替补补位，但全覆盖了"
                songs={plan.B}
                attendingIds={attendingIds}
                onSelect={onSelectSong}
              />
              <BucketColumn
                bucket="C"
                title="还差一点"
                description="还缺 1-2 个 part 没人能补"
                songs={plan.C}
                attendingIds={attendingIds}
                onSelect={onSelectSong}
                whatIfHints={whatIfHints}
              />
            </div>
          )}
        </div>
      </div>

      <SaveRehearsalDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        defaultDate={date}
        attendingMemberIds={[...attendingIds]}
        selectedSongIds={selectedSongIds}
        attendeeCount={attendingIds.size}
        onSubmit={(rehearsal) => addRehearsal(rehearsal)}
      />
    </div>
  );
}

interface WhatIfHint {
  memberId: string;
  name: string;
  upgrades: number;
}

interface BucketColumnProps {
  bucket: Bucket;
  title: string;
  description: string;
  songs: Song[];
  attendingIds: Set<string>;
  onSelect: (id: string) => void;
  whatIfHints?: WhatIfHint[];
}

const BUCKET_TINT: Record<Bucket, { headerBg: string; headerText: string; ring: string; icon: React.ReactNode }> = {
  A: {
    headerBg: 'bg-emerald-50 border-emerald-200',
    headerText: 'text-emerald-800',
    ring: 'border-emerald-200',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  },
  B: {
    headerBg: 'bg-amber-50 border-amber-200',
    headerText: 'text-amber-800',
    ring: 'border-amber-200',
    icon: <Zap className="h-4 w-4 text-amber-600" />,
  },
  C: {
    headerBg: 'bg-red-50 border-red-200',
    headerText: 'text-red-800',
    ring: 'border-red-200',
    icon: <HelpCircle className="h-4 w-4 text-red-600" />,
  },
};

function BucketColumn({ bucket, title, description, songs, attendingIds, onSelect, whatIfHints }: BucketColumnProps) {
  const tint = BUCKET_TINT[bucket];
  const hints = whatIfHints?.slice(0, 3); // show top 3 most impactful absent members
  return (
    <div className={cn('overflow-hidden rounded-xl border bg-white shadow-sm', tint.ring)}>
      <div className={cn('border-b px-3 py-2', tint.headerBg)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {tint.icon}
            <p className={cn('text-[13px] font-semibold tracking-tight', tint.headerText)}>
              {bucket} · {title}
            </p>
          </div>
          <span className={cn('rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-medium', tint.headerText)}>
            {songs.length}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-zinc-600">{description}</p>
      </div>

      {songs.length === 0 ? (
        <p className="px-3 py-6 text-center text-[11px] text-zinc-400">暂无</p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {songs.map((song) => (
            <li key={song.id}>
              <SongCard song={song} attendingIds={attendingIds} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      )}

      {hints && hints.length > 0 && (
        <div className="border-t border-zinc-100 bg-zinc-50/50 px-3 py-2">
          <p className="mb-1 text-[10px] font-medium text-zinc-500">如果再来一个人：</p>
          <div className="space-y-0.5">
            {hints.map((h) => (
              <p key={h.memberId} className="text-[11px] text-zinc-600">
                <span className="font-medium text-zinc-800">{h.name}</span>
                <span className="ml-1 text-emerald-600">+{h.upgrades} 首可练</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SongCardProps {
  song: Song;
  attendingIds: Set<string>;
  onSelect: (id: string) => void;
}

function SongCard({ song, attendingIds, onSelect }: SongCardProps) {
  const { state } = useApp();
  const [expanded, setExpanded] = React.useState(false);
  const memberName = (id: string) => state.members.find((m) => m.id === id)?.name ?? '?';

  const uniqueParts = INSTRUMENTS.filter((p) => song.requiredParts.includes(p));

  // Quick summary: how many parts covered vs required
  const totalRequired = song.requiredParts.length;
  const totalCovered = uniqueParts.reduce((sum, part) => {
    const present = presentAssignmentsForPart(song.id, part, state.assignments, attendingIds);
    const usable = present.filter((a) => (a.status ?? 'want') !== 'want');
    const required = song.requiredParts.filter((p) => p === part).length;
    return sum + Math.min(usable.length, required);
  }, 0);
  const allCovered = totalCovered >= totalRequired;

  return (
    <div className="px-3 py-1.5">
      {/* Collapsed row: title + status + coverage indicator */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 text-left hover:bg-zinc-50 -mx-1 px-1 rounded"
      >
        <ChevronDown
          className={cn(
            'h-3 w-3 shrink-0 text-zinc-400 transition-transform',
            !expanded && '-rotate-90',
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-medium leading-tight text-zinc-900">{song.title}</p>
            {song.kind === 'original' && (
              <span className="inline-flex items-center rounded border border-violet-300 bg-violet-50 px-1 py-0 text-[9px] font-medium text-violet-700">
                原创
              </span>
            )}
          </div>
          {song.artist && (
            <p className="truncate text-[10px] leading-tight text-zinc-500">{song.artist}</p>
          )}
        </div>
        {/* Coverage fraction */}
        <span className={cn(
          'shrink-0 text-[10px] font-medium tabular-nums',
          allCovered ? 'text-emerald-600' : 'text-red-600',
        )}>
          {totalCovered}/{totalRequired}
        </span>
        <span
          className={cn(
            'shrink-0 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
            SONG_STATUS_META[song.status].badge,
          )}
        >
          {SONG_STATUS_META[song.status].label}
        </span>
      </button>

      {/* Expanded: part details + link to full page */}
      {expanded && (
        <div className="mt-1 ml-5 space-y-0.5">
          {uniqueParts.length === 0 && song.kind === 'original' && (
            <p className="text-[11px] text-zinc-500 italic">配器待定</p>
          )}
          {uniqueParts.map((part) => {
            const meta = INSTRUMENT_META[part];
            const present = presentAssignmentsForPart(song.id, part, state.assignments, attendingIds);
            const required = song.requiredParts.filter((p) => p === part).length;
            const usable = present.filter((a) => (a.status ?? 'want') !== 'want');
            const covered = Math.min(usable.length, required);
            const missing = required - covered;
            return (
              <div key={part} className="flex items-center gap-1.5 text-[11px]">
                <span
                  className={cn(
                    'inline-flex w-10 shrink-0 items-center justify-center rounded border px-1 py-0 text-[9px] font-medium',
                    meta.badge,
                  )}
                >
                  {PART_SHORT_LABEL[part]}
                </span>
                {present.length === 0 ? (
                  <span className="text-red-600">缺{required > 1 ? ` ×${required}` : ''}</span>
                ) : (
                  <span className="text-zinc-700">
                    {present.map((a, i) => {
                      const notReady = (a.status ?? 'want') === 'want';
                      return (
                        <span
                          key={a.id}
                          className={cn(notReady && 'text-zinc-400 line-through')}
                          title={notReady ? '状态：可以练（还没练好）' : undefined}
                        >
                          {i > 0 && '、'}
                          {memberName(a.memberId)}
                          {a.isEmergency && <Zap className="inline h-3 w-3 text-amber-600 ml-0.5" />}
                        </span>
                      );
                    })}
                    {missing > 0 && <span className="text-red-600 ml-1">还缺 {missing}</span>}
                  </span>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => onSelect(song.id)}
            className="mt-1 inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-800"
          >
            <ExternalLink className="h-3 w-3" />
            打开分配页
          </button>
        </div>
      )}
    </div>
  );
}

