import * as React from 'react';
import { ArrowLeft, CalendarPlus, GripVertical, Music, X } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { INSTRUMENTS } from '@/lib/instruments';
import { SONG_STATUS_META } from '@/lib/songStatus';
import { cn } from '@/lib/utils';
import type { Assignment, Instrument, Member, Rehearsal, Show, Song } from '@/types';

/* ---- helpers ---- */

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function countSaturdaysBetween(from: string, to: string): number {
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  let count = 0;
  const cur = new Date(start);
  while (cur.getDay() !== 6) cur.setDate(cur.getDate() + 1);
  while (cur <= end) { count++; cur.setDate(cur.getDate() + 7); }
  return count;
}

/** Readiness score (0-100) for a song relative to a set of performer IDs. */
function computeReadiness(
  song: Song,
  performerIds: string[],
  assignments: Assignment[],
): { score: number; coveredParts: number; totalParts: number; emergencyCover: number } {
  const performerSet = new Set(performerIds);
  const songAssignments = assignments.filter((a) => a.songId === song.id);
  const totalParts = song.requiredParts.length;

  // Status points (40)
  const statusPoints: Record<string, number> = {
    ready: 40,
    polishing: 30,
    rehearsing: 20,
  };
  const sp = statusPoints[song.status] ?? 0;

  if (totalParts === 0) {
    return { score: sp, coveredParts: 0, totalParts: 0, emergencyCover: 0 };
  }

  // Count coverage per required part slot
  let coveredParts = 0;
  let emergencyCover = 0;

  for (const inst of INSTRUMENTS) {
    const required = song.requiredParts.filter((p) => p === inst).length;
    if (required === 0) continue;

    // Non-emergency assignments from performers
    const regularFromPerformers = songAssignments.filter(
      (a) => a.part === inst && !a.isEmergency && performerSet.has(a.memberId),
    ).length;

    // Emergency assignments from performers (backup)
    const emergencyFromPerformers = songAssignments.filter(
      (a) => a.part === inst && a.isEmergency && performerSet.has(a.memberId),
    ).length;

    const regularCover = Math.min(regularFromPerformers, required);
    coveredParts += regularCover;

    const remaining = required - regularCover;
    if (remaining > 0) {
      emergencyCover += Math.min(emergencyFromPerformers, remaining);
    }
  }

  // Coverage points (40) — proportion of parts covered by regular performers
  const cp = totalParts > 0 ? (coveredParts / totalParts) * 40 : 40;

  // Emergency fill points (20) — proportion of uncovered parts that have emergency backup
  const uncovered = totalParts - coveredParts;
  const ep = uncovered > 0 ? (emergencyCover / uncovered) * 20 : 20;

  return {
    score: Math.round(sp + cp + ep),
    coveredParts,
    totalParts,
    emergencyCover,
  };
}

/* ---- component ---- */

interface ShowDetailPageProps {
  showId: string;
  onBack: () => void;
  onSelectSong: (id: string) => void;
}

export default function ShowDetailPage({ showId, onBack, onSelectSong }: ShowDetailPageProps) {
  const { state, updateShow, addRehearsal, deleteRehearsal } = useApp();
  const show = state.shows.find((s) => s.id === showId);

  if (!show) {
    return (
      <div className="p-6">
        <button type="button" onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="inline h-4 w-4 mr-1" />返回
        </button>
        <p className="mt-4 text-sm text-zinc-500">演出不存在</p>
      </div>
    );
  }

  const todayStr = toLocalDateString(new Date());
  const days = daysUntil(show.date);
  // Count rehearsals: Saturdays between today and show date + any manually-added non-Saturday rehearsals
  const saturdayCount = countSaturdaysBetween(todayStr, show.date);
  const manualNonSaturday = state.rehearsals.filter((r) => {
    if (r.date <= todayStr || r.date > show.date) return false;
    const d = new Date(r.date + 'T00:00:00');
    return d.getDay() !== 6;
  }).length;
  const rehearsals = saturdayCount + manualNonSaturday;

  return (
    <div className="p-6">
      <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="h-4 w-4" />返回演出列表
      </button>

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-zinc-900">{show.title}</h1>
        <div className="mt-1 flex items-center gap-3 text-sm text-zinc-500">
          <span>{show.date}</span>
          {days >= 0 && <span>{days === 0 ? '今天' : `${days}天后`}</span>}
          {days >= 0 && <span>{rehearsals} 次排练</span>}
          {days < 0 && <span className="text-zinc-400">已结束</span>}
          {show.notes && <span className="text-zinc-400">| {show.notes}</span>}
        </div>
      </div>

      {/* Performer bar */}
      <PerformerBar show={show} members={state.members} onUpdate={updateShow} />

      {/* Rehearsal schedule */}
      <RehearsalSchedule
        showDate={show.date}
        rehearsals={state.rehearsals}
        onAddRehearsal={addRehearsal}
        onDeleteRehearsal={deleteRehearsal}
      />

      {/* Main two-column layout */}
      <div className="mt-5 flex gap-5" style={{ minHeight: '60vh' }}>
        <CandidatePool
          show={show}
          songs={state.songs}
          assignments={state.assignments}
          onSelectSong={onSelectSong}
        />
        <SetlistPanel
          show={show}
          songs={state.songs}
          assignments={state.assignments}
          onUpdateShow={updateShow}
          onSelectSong={onSelectSong}
        />
      </div>
    </div>
  );
}

/* ---- Performer bar (grouped by instrument) ---- */

type InstrumentGroup = 'vocal' | 'drums' | 'guitar' | 'bass' | 'keys';
const GROUP_ORDER: InstrumentGroup[] = ['vocal', 'drums', 'guitar', 'bass', 'keys'];
const GROUP_LABEL: Record<InstrumentGroup, string> = {
  vocal: '主唱', drums: '鼓', guitar: '吉他', bass: '贝斯', keys: '键盘',
};
function instrumentToGroup(inst: Instrument): InstrumentGroup {
  if (inst === 'guitar_lead' || inst === 'guitar_rhythm') return 'guitar';
  return inst as InstrumentGroup;
}

function primaryGroupOf(instruments: Instrument[]): InstrumentGroup {
  const groups = new Set(instruments.map(instrumentToGroup));
  for (const g of GROUP_ORDER) {
    if (groups.has(g)) return g;
  }
  return 'keys';
}

function PerformerBar({
  show,
  members,
  onUpdate,
}: {
  show: Show;
  members: Member[];
  onUpdate: (show: Show) => void;
}) {
  const performerSet = new Set(show.performerIds);
  const toggle = (id: string) => {
    const next = performerSet.has(id)
      ? show.performerIds.filter((pid) => pid !== id)
      : [...show.performerIds, id];
    onUpdate({ ...show, performerIds: next });
  };

  const grouped = React.useMemo(() => {
    const map = new Map<InstrumentGroup, Member[]>();
    for (const g of GROUP_ORDER) map.set(g, []);
    for (const m of members) {
      const g = primaryGroupOf(m.instruments);
      map.get(g)!.push(m);
    }
    return GROUP_ORDER
      .map((g) => ({ group: g, label: GROUP_LABEL[g], members: map.get(g)! }))
      .filter((g) => g.members.length > 0);
  }, [members]);

  return (
    <div>
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">参演成员</p>
      <div className="flex flex-wrap gap-4">
        {grouped.map(({ group, label, members: grpMembers }) => (
          <div key={group} className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-400 mr-0.5">{label}</span>
            {grpMembers.map((m) => {
              const active = performerSet.has(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  className={cn(
                    'rounded-full px-3 py-1 text-sm font-medium transition-colors',
                    active
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200',
                  )}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Candidate pool (left column) ---- */

function CandidatePool({
  show,
  songs,
  assignments,
  onSelectSong,
}: {
  show: Show;
  songs: Song[];
  assignments: Assignment[];
  onSelectSong: (id: string) => void;
}) {
  const setlistSet = new Set(show.setlistSongIds);

  const candidates = React.useMemo(() => {
    const eligible = songs.filter(
      (s) => s.status === 'rehearsing' || s.status === 'polishing' || s.status === 'ready',
    );
    return eligible
      .map((song) => ({
        song,
        ...computeReadiness(song, show.performerIds, assignments),
      }))
      .sort((a, b) => b.score - a.score);
  }, [songs, show.performerIds, assignments]);

  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
        候选曲目 ({candidates.length})
      </p>
      {candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Music className="h-8 w-8 text-zinc-300 mb-2" />
          <p className="text-sm text-zinc-500">没有符合条件的曲目</p>
          <p className="text-xs text-zinc-400 mt-1">歌曲状态至少需要达到"能合了"</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
          {candidates.map(({ song, score, coveredParts, totalParts, emergencyCover }) => {
            const inSetlist = setlistSet.has(song.id);
            const meta = SONG_STATUS_META[song.status];
            const coverLabel = totalParts > 0
              ? `${coveredParts}/${totalParts}${emergencyCover > 0 ? ` +${emergencyCover}替` : ''}`
              : '';

            return (
              <div
                key={song.id}
                draggable={!inSetlist}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'copy';
                  e.dataTransfer.setData('application/x-band-song-id', song.id);
                }}
                className={cn(
                  'rounded-lg border p-3 text-sm transition-colors',
                  inSetlist
                    ? 'border-zinc-100 bg-zinc-50 opacity-40'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm cursor-grab',
                )}
              >
                {/* Top row: score + status */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className={cn(
                    'text-lg font-bold leading-none',
                    score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-zinc-300',
                  )}>
                    {score}
                  </span>
                  <span className={cn('inline-block rounded px-1.5 py-0.5 text-xs font-medium border', meta.badge)}>
                    {meta.label}
                  </span>
                </div>

                {/* Title (clickable) */}
                <p
                  className="font-medium text-zinc-900 truncate cursor-pointer hover:text-zinc-600"
                  onClick={() => onSelectSong(song.id)}
                >
                  {song.title}
                </p>

                {/* Artist + coverage */}
                <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                  {song.artist && <span className="truncate">{song.artist}</span>}
                  {coverLabel && <span>{coverLabel}</span>}
                </div>

                {inSetlist && (
                  <p className="mt-1.5 text-xs text-zinc-400">已在歌单中</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---- Setlist panel (right column) ---- */

function SetlistPanel({
  show,
  songs,
  assignments,
  onUpdateShow,
  onSelectSong,
}: {
  show: Show;
  songs: Song[];
  assignments: Assignment[];
  onUpdateShow: (show: Show) => void;
  onSelectSong: (id: string) => void;
}) {
  const [dragIdx, setDragIdx] = React.useState<number | null>(null);
  const [overIdx, setOverIdx] = React.useState<number | null>(null);

  const songMap = React.useMemo(() => {
    const m = new Map<string, Song>();
    for (const s of songs) m.set(s.id, s);
    return m;
  }, [songs]);

  const remove = (songId: string) => {
    onUpdateShow({ ...show, setlistSongIds: show.setlistSongIds.filter((id) => id !== songId) });
  };

  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(idx);
  };

  const handleDrop = (targetIdx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const ids = [...show.setlistSongIds];
    const [moved] = ids.splice(dragIdx, 1);
    if (moved) {
      ids.splice(targetIdx, 0, moved);
      onUpdateShow({ ...show, setlistSongIds: ids });
    }
    setDragIdx(null);
    setOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
  };

  // Support dragging from candidate pool
  const handlePoolDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // Check for internal reorder first
    const plainIdx = e.dataTransfer.getData('text/plain');
    if (plainIdx && dragIdx !== null) return; // internal reorder handled by item-level drop
    const songId = e.dataTransfer.getData('application/x-band-song-id');
    if (songId && !show.setlistSongIds.includes(songId)) {
      onUpdateShow({ ...show, setlistSongIds: [...show.setlistSongIds, songId] });
    }
  };

  const count = show.setlistSongIds.length;
  const capacityLabel = show.minSongs != null && show.maxSongs != null
    ? `${count} / ${show.minSongs}~${show.maxSongs} 首`
    : show.maxSongs != null
      ? `${count} / ${show.maxSongs} 首`
      : show.durationMinutes != null
        ? `${count} 首 / ${show.durationMinutes}min`
        : `${count} 首`;

  const overMin = show.minSongs != null && count >= show.minSongs;
  const overMax = show.maxSongs != null && count > show.maxSongs;

  return (
    <div
      className="w-80 shrink-0 rounded-lg border border-zinc-200 bg-white flex flex-col"
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
      onDrop={handlePoolDrop}
    >
      <div className="border-b border-zinc-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">演出歌单</p>
          <span className={cn(
            'text-xs font-medium',
            overMax ? 'text-red-500' : overMin ? 'text-emerald-600' : 'text-zinc-400',
          )}>
            {capacityLabel}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-2 py-2">
        {show.setlistSongIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Music className="h-8 w-8 text-zinc-300 mb-2" />
            <p className="text-xs text-zinc-400">从左侧添加曲目</p>
          </div>
        ) : (
          <div className="space-y-1">
            {show.setlistSongIds.map((songId, idx) => {
              const song = songMap.get(songId);
              if (!song) return null;
              const meta = SONG_STATUS_META[song.status];
              const readiness = computeReadiness(song, show.performerIds, assignments);
              const isDragging = dragIdx === idx;
              const isOver = overIdx === idx;

              return (
                <div
                  key={songId}
                  draggable
                  onDragStart={handleDragStart(idx)}
                  onDragOver={handleDragOver(idx)}
                  onDrop={handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-all',
                    isDragging && 'opacity-30',
                    isOver && 'border-t-2 border-zinc-400',
                    !isDragging && !isOver && 'hover:bg-zinc-50',
                  )}
                >
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-zinc-300 cursor-grab" />
                  <span className="w-5 shrink-0 text-xs text-zinc-400 text-right">{idx + 1}</span>
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => onSelectSong(song.id)}
                  >
                    <p className="text-sm font-medium text-zinc-900 truncate">{song.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn('inline-block rounded px-1 py-0.5 text-xs border', meta.badge)} style={{ fontSize: '10px' }}>
                        {meta.label}
                      </span>
                      <span className={cn(
                        'text-xs',
                        readiness.score >= 80 ? 'text-emerald-600' : readiness.score >= 50 ? 'text-amber-600' : 'text-zinc-400',
                      )}>
                        {readiness.score}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(songId)}
                    className="shrink-0 rounded p-1 text-zinc-300 hover:bg-red-50 hover:text-red-500"
                    title="移出歌单"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Rehearsal schedule ---- */

function collectSaturdaysBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  const cur = new Date(start);
  while (cur.getDay() !== 6) cur.setDate(cur.getDate() + 1);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 7);
  }
  return dates;
}

function RehearsalSchedule({
  showDate,
  rehearsals,
  onAddRehearsal,
  onDeleteRehearsal,
}: {
  showDate: string;
  rehearsals: Rehearsal[];
  onAddRehearsal: (r: Rehearsal) => void;
  onDeleteRehearsal: (id: string) => void;
}) {
  const [addingDate, setAddingDate] = React.useState('');
  const [expanded, setExpanded] = React.useState(false);
  const todayStr = toLocalDateString(new Date());

  // Auto Saturdays between now and show
  const saturdays = React.useMemo(
    () => new Set(collectSaturdaysBetween(todayStr, showDate)),
    [todayStr, showDate],
  );

  // Existing rehearsal dates from store
  const existingDates = React.useMemo(() => {
    const m = new Map<string, string>(); // date -> rehearsal id
    for (const r of rehearsals) {
      if (r.date > todayStr && r.date <= showDate) {
        m.set(r.date, r.id);
      }
    }
    return m;
  }, [rehearsals, todayStr, showDate]);

  // Merge: all saturdays + manually added non-saturday rehearsals
  const allDates = React.useMemo(() => {
    const set = new Set(saturdays);
    for (const d of existingDates.keys()) set.add(d);
    return [...set].sort();
  }, [saturdays, existingDates]);

  const handleAdd = () => {
    if (!addingDate || addingDate <= todayStr || addingDate > showDate) return;
    if (existingDates.has(addingDate)) return;
    onAddRehearsal({
      id: crypto.randomUUID(),
      date: addingDate,
      attendingMemberIds: [],
      selectedSongIds: [],
      createdAt: new Date().toISOString(),
    });
    setAddingDate('');
  };

  const handleRemove = (date: string) => {
    const rid = existingDates.get(date);
    if (rid) onDeleteRehearsal(rid);
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-xs font-medium text-zinc-500 uppercase tracking-wide hover:text-zinc-700"
      >
        排练计划 ({allDates.length} 次) {expanded ? '▾' : '▸'}
      </button>

      {expanded && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-2 mb-2">
            {allDates.map((date) => {
              const isSaturday = saturdays.has(date);
              const isManual = existingDates.has(date) && !isSaturday;
              return (
                <span
                  key={date}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs',
                    isSaturday ? 'bg-zinc-100 text-zinc-600' : 'bg-amber-50 text-amber-700 border border-amber-200',
                  )}
                >
                  {date.slice(5)}
                  {isSaturday && <span className="text-zinc-400">六</span>}
                  {isManual && (
                    <button
                      type="button"
                      onClick={() => handleRemove(date)}
                      className="ml-0.5 text-amber-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={addingDate}
              min={todayStr}
              max={showDate}
              onChange={(e) => setAddingDate(e.target.value)}
              className="rounded-md border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!addingDate}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 disabled:opacity-40"
            >
              <CalendarPlus className="h-3 w-3" />
              添加排练
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
