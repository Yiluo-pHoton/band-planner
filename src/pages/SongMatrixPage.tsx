import * as React from 'react';
import { ArrowUpDown, GripVertical, Table2, X } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { INSTRUMENT_META } from '@/lib/instruments';
import { SONG_STATUS_META } from '@/lib/songStatus';
import { cn } from '@/lib/utils';
import type { Assignment, Instrument, Member, Song, SongOpinionType } from '@/types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type InstrumentGroup = 'drums' | 'guitar' | 'vocal' | 'bass' | 'keys';
const GROUP_ORDER: InstrumentGroup[] = ['drums', 'guitar', 'vocal', 'bass', 'keys'];

function instrumentToGroup(inst: Instrument): InstrumentGroup {
  if (inst === 'vocal' || inst === 'harmony') return 'vocal';
  if (inst === 'drums') return 'drums';
  if (inst === 'guitar_lead' || inst === 'guitar_rhythm') return 'guitar';
  if (inst === 'bass') return 'bass';
  return 'keys';
}

function primaryGroup(m: Member): InstrumentGroup {
  return m.instruments.length > 0 ? instrumentToGroup(m.instruments[0]!) : 'keys';
}

const OPINION_CYCLE: (SongOpinionType | null)[] = [null, 'like', 'dislike', 'hard'];

const OPINION_DOT: Record<SongOpinionType, { bg: string; title: string }> = {
  like: { bg: 'bg-emerald-600', title: '喜欢' },
  dislike: { bg: 'bg-red-500', title: '不喜欢' },
  hard: { bg: 'bg-amber-400', title: '觉得难' },
};

const SORT_OPTIONS = [
  { key: 'custom', label: '自定义' },
  { key: 'title', label: '标题' },
  { key: 'status', label: '进度' },
] as const;

type SortKey = typeof SORT_OPTIONS[number]['key'];

const STATUS_ORDER: Record<string, number> = {
  ready: 0,
  polishing: 1,
  rehearsing: 2,
  learning: 3,
  writing: 4,
  shelved: 5,
};

const LS_KEY_ORDER = 'band-planner:song-matrix-order';
const LS_KEY_HIDDEN_SONGS = 'band-planner:song-matrix-hidden-songs';
const LS_KEY_HIDDEN_MEMBERS = 'band-planner:song-matrix-hidden-members';

/* ------------------------------------------------------------------ */
/*  Assignment Popover                                                 */
/* ------------------------------------------------------------------ */

interface AssignPopoverProps {
  song: Song;
  assignments: Assignment[];
  members: Member[];
  onAdd: (a: Assignment) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  anchorRect: DOMRect;
}

function AssignPopover({ song, assignments, members, onAdd, onDelete, onClose, anchorRect }: AssignPopoverProps) {
  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Group required parts with slot index for duplicates
  const partSlots: { part: Instrument; slotIdx: number }[] = [];
  const partCounts = new Map<Instrument, number>();
  for (const part of song.requiredParts) {
    const idx = partCounts.get(part) ?? 0;
    partSlots.push({ part, slotIdx: idx });
    partCounts.set(part, idx + 1);
  }

  // Assignments for this song grouped by part+slotIdx
  const songAssignments = assignments.filter((a) => a.songId === song.id);

  function assignmentsForPart(part: Instrument): Assignment[] {
    return songAssignments.filter((a) => a.part === part);
  }

  // Eligible members for a part: members who play that instrument
  function eligibleMembers(part: Instrument): Member[] {
    return members.filter((m) => m.instruments.includes(part));
  }

  // Position the popover below the anchor, clamped to viewport
  const top = anchorRect.bottom + 4;
  const left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - 320));

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 w-[18rem] rounded-lg border border-zinc-200 bg-white shadow-xl"
      style={{ top, left }}
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900">{song.title}</p>
          {song.artist && <p className="truncate text-[10px] text-zinc-500">{song.artist}</p>}
        </div>
        <button type="button" onClick={onClose} className="shrink-0 rounded p-0.5 text-zinc-400 hover:text-zinc-900">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto p-2 space-y-1.5">
        {partSlots.map(({ part, slotIdx }) => {
          const partAssigns = assignmentsForPart(part);
          const assigned = partAssigns[slotIdx];
          const alreadyAssignedIds = new Set(partAssigns.map((a) => a.memberId));
          const eligible = eligibleMembers(part);
          const meta = INSTRUMENT_META[part];

          return (
            <div key={`${part}-${slotIdx}`} className="flex items-center gap-2">
              <span className={cn('shrink-0 rounded border px-1 py-0.5 text-[9px] font-bold', meta.badge)}>
                {meta.abbrev}
              </span>
              <select
                className="flex-1 min-w-0 rounded border border-zinc-200 px-1.5 py-1 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                value={assigned?.memberId ?? ''}
                onChange={(e) => {
                  const memberId = e.target.value;
                  if (assigned) onDelete(assigned.id);
                  if (memberId) {
                    onAdd({
                      id: crypto.randomUUID(),
                      songId: song.id,
                      memberId,
                      part,
                      isEmergency: false,
                    });
                  }
                }}
              >
                <option value="">-- 未分配 --</option>
                {eligible.map((m) => (
                  <option
                    key={m.id}
                    value={m.id}
                    disabled={alreadyAssignedIds.has(m.id) && assigned?.memberId !== m.id}
                  >
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
        {partSlots.length === 0 && (
          <p className="text-xs text-zinc-400 py-2 text-center">没有需求声部</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SongMatrixPage() {
  const { state, setSongOpinion, addAssignment, deleteAssignment } = useApp();

  // Song row order
  const [customOrder, setCustomOrder] = React.useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY_ORDER);
      if (raw) return JSON.parse(raw) as string[];
    } catch { /* ignore */ }
    return [];
  });
  const [sortKey, setSortKey] = React.useState<SortKey>('custom');
  const [dragIdx, setDragIdx] = React.useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = React.useState<number | null>(null);

  // Assignment popover
  const [popoverSongId, setPopoverSongId] = React.useState<string | null>(null);
  const [popoverRect, setPopoverRect] = React.useState<DOMRect | null>(null);

  const openPopover = (songId: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopoverSongId(songId);
    setPopoverRect(rect);
  };
  const closePopover = () => {
    setPopoverSongId(null);
    setPopoverRect(null);
  };

  // Visibility toggles
  const [hiddenSongIds, setHiddenSongIds] = React.useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY_HIDDEN_SONGS);
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch { /* ignore */ }
    return new Set();
  });
  const [hiddenMemberIds, setHiddenMemberIds] = React.useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY_HIDDEN_MEMBERS);
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch { /* ignore */ }
    return new Set();
  });

  const persistHiddenSongs = (s: Set<string>) => {
    setHiddenSongIds(s);
    localStorage.setItem(LS_KEY_HIDDEN_SONGS, JSON.stringify([...s]));
  };
  const persistHiddenMembers = (s: Set<string>) => {
    setHiddenMemberIds(s);
    localStorage.setItem(LS_KEY_HIDDEN_MEMBERS, JSON.stringify([...s]));
  };

  const toggleSong = (id: string) => {
    const next = new Set(hiddenSongIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    persistHiddenSongs(next);
  };
  const toggleMember = (id: string) => {
    const next = new Set(hiddenMemberIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    persistHiddenMembers(next);
  };

  // Members sorted by instrument group
  const sortedMembers = React.useMemo(() => {
    return [...state.members].sort((a, b) => {
      const ga = GROUP_ORDER.indexOf(primaryGroup(a));
      const gb = GROUP_ORDER.indexOf(primaryGroup(b));
      if (ga !== gb) return ga - gb;
      return a.name.localeCompare(b.name);
    });
  }, [state.members]);

  const visibleMembers = React.useMemo(
    () => sortedMembers.filter((m) => !hiddenMemberIds.has(m.id)),
    [sortedMembers, hiddenMemberIds],
  );

  // Songs sorted
  const sortedSongs = React.useMemo(() => {
    const songs = state.songs.filter((s) => s.status !== 'shelved');
    if (sortKey === 'title') {
      return [...songs].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sortKey === 'status') {
      return [...songs].sort((a, b) => {
        const sa = STATUS_ORDER[a.status] ?? 99;
        const sb = STATUS_ORDER[b.status] ?? 99;
        if (sa !== sb) return sa - sb;
        return a.title.localeCompare(b.title);
      });
    }
    // Custom order
    const posMap = new Map(customOrder.map((id, i) => [id, i]));
    return [...songs].sort((a, b) => {
      const pa = posMap.get(a.id) ?? 9999;
      const pb = posMap.get(b.id) ?? 9999;
      if (pa !== pb) return pa - pb;
      return a.title.localeCompare(b.title);
    });
  }, [state.songs, sortKey, customOrder]);

  const visibleSongs = React.useMemo(
    () => sortedSongs.filter((s) => !hiddenSongIds.has(s.id)),
    [sortedSongs, hiddenSongIds],
  );

  // Assignment lookup: `songId|memberId` -> 'regular' | 'emergency'
  // A member with both regular and emergency assignments for the same song counts as regular.
  const assignmentMap = React.useMemo(() => {
    const map = new Map<string, 'regular' | 'emergency'>();
    for (const a of state.assignments) {
      const key = `${a.songId}|${a.memberId}`;
      if (!a.isEmergency) {
        map.set(key, 'regular');
      } else if (!map.has(key)) {
        map.set(key, 'emergency');
      }
    }
    return map;
  }, [state.assignments]);

  // Opinion lookup: `songId|memberId` -> opinion
  const opinionMap = React.useMemo(() => {
    const map = new Map<string, SongOpinionType>();
    for (const o of state.songOpinions ?? []) {
      map.set(`${o.songId}|${o.memberId}`, o.opinion);
    }
    return map;
  }, [state.songOpinions]);

  const cycleOpinion = (songId: string, memberId: string) => {
    const current = opinionMap.get(`${songId}|${memberId}`) ?? null;
    const idx = OPINION_CYCLE.indexOf(current);
    const next = OPINION_CYCLE[(idx + 1) % OPINION_CYCLE.length] ?? null;
    setSongOpinion(songId, memberId, next);
  };

  // Row drag reorder
  const handleDragEnd = () => {
    if (dragIdx === null || dragOverIdx === null || dragIdx === dragOverIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const ids = visibleSongs.map((s) => s.id);
    const [moved] = ids.splice(dragIdx, 1);
    if (moved) ids.splice(dragOverIdx, 0, moved);
    // Merge with any hidden song IDs to preserve their position
    const fullOrder = [...ids];
    for (const s of sortedSongs) {
      if (!fullOrder.includes(s.id)) fullOrder.push(s.id);
    }
    setCustomOrder(fullOrder);
    setSortKey('custom');
    localStorage.setItem(LS_KEY_ORDER, JSON.stringify(fullOrder));
    setDragIdx(null);
    setDragOverIdx(null);
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-5">
        <h1 className="text-2xl font-semibold tracking-tight">曲目矩阵</h1>
        <p className="text-sm text-zinc-500 mt-1">
          绿底 = 已分配 · 点击格子标记意见：
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600 mx-1 align-middle" />喜欢
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 mx-1 align-middle" />不喜欢
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400 mx-1 align-middle" />觉得难
        </p>

        {/* Toolbar */}
        <div className="mt-4 flex flex-wrap items-start gap-4">
          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-xs text-zinc-500">排序:</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSortKey(opt.key)}
                className={cn(
                  'rounded px-2 py-0.5 text-xs font-medium transition-colors',
                  sortKey === opt.key
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-500 hover:text-zinc-900',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Song toggles */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-zinc-400 mr-1">曲目:</span>
            {sortedSongs.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSong(s.id)}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
                  hiddenSongIds.has(s.id)
                    ? 'bg-zinc-100 text-zinc-400'
                    : 'bg-zinc-900 text-white',
                )}
              >
                {s.title}
              </button>
            ))}
          </div>

          {/* Member toggles */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-zinc-400 mr-1">成员:</span>
            {sortedMembers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMember(m.id)}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
                  hiddenMemberIds.has(m.id)
                    ? 'bg-zinc-100 text-zinc-400'
                    : 'bg-zinc-900 text-white',
                )}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {/* Matrix */}
        {visibleSongs.length === 0 || visibleMembers.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center">
            <Table2 className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
            <p className="text-sm font-medium text-zinc-900">没有可显示的内容</p>
            <p className="text-xs text-zinc-500 mt-1">用上面的开关显示曲目和成员</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white select-none">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-zinc-50 px-3 py-2 text-left font-medium text-zinc-500 border-b border-r border-zinc-200 min-w-[10rem]">
                    曲目
                  </th>
                  {visibleMembers.map((m, i) => {
                    const prevGroup = i > 0 ? primaryGroup(visibleMembers[i - 1]!) : null;
                    const curGroup = primaryGroup(m);
                    const isGroupStart = curGroup !== prevGroup;
                    const meta = m.instruments[0] ? INSTRUMENT_META[m.instruments[0]] : null;
                    return (
                      <th
                        key={m.id}
                        className={cn(
                          'px-1 py-1.5 text-center font-normal border-b border-zinc-200 min-w-[3rem]',
                          isGroupStart && i > 0 && 'border-l-2 border-l-zinc-300',
                        )}
                      >
                        <div className="text-[10px] font-medium text-zinc-900 truncate max-w-[3.5rem] mx-auto">
                          {m.name}
                        </div>
                        {meta && (
                          <span className={cn('inline-block rounded px-0.5 text-[7px] font-bold mt-0.5', meta.badge)}>
                            {meta.abbrev}
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visibleSongs.map((song, rowIdx) => (
                  <tr
                    key={song.id}
                    draggable
                    onDragStart={() => { setDragIdx(rowIdx); }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverIdx(rowIdx); }}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      dragIdx === rowIdx && 'opacity-40',
                      dragOverIdx === rowIdx && dragIdx !== null && dragIdx !== rowIdx && 'border-t-2 border-t-zinc-900',
                    )}
                  >
                    <td className="sticky left-0 z-10 bg-white px-2 py-1.5 border-b border-r border-zinc-200">
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="h-3 w-3 shrink-0 text-zinc-300 cursor-grab" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openPopover(song.id, e); }}
                              className="truncate text-xs font-medium text-zinc-900 hover:text-zinc-600 hover:underline cursor-pointer"
                            >
                              {song.title}
                            </button>
                            <span className={cn(
                              'shrink-0 rounded border px-1 py-0 text-[8px] font-medium',
                              SONG_STATUS_META[song.status].badge,
                            )}>
                              {SONG_STATUS_META[song.status].label}
                            </span>
                          </div>
                          {song.artist && (
                            <div className="truncate text-[10px] text-zinc-400">{song.artist}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    {visibleMembers.map((member, colIdx) => {
                      const key = `${song.id}|${member.id}`;
                      const assignType = assignmentMap.get(key) ?? null;
                      const opinion = opinionMap.get(key) ?? null;
                      const prevGroup = colIdx > 0 ? primaryGroup(visibleMembers[colIdx - 1]!) : null;
                      const curGroup = primaryGroup(member);
                      const isGroupStart = curGroup !== prevGroup;
                      return (
                        <td
                          key={member.id}
                          className={cn(
                            'p-0 border-b border-zinc-100',
                            isGroupStart && colIdx > 0 && 'border-l-2 border-l-zinc-300',
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => cycleOpinion(song.id, member.id)}
                            className={cn(
                              'flex h-7 w-full items-center justify-center transition-colors',
                              assignType === 'regular' && 'bg-emerald-100 hover:bg-emerald-200',
                              assignType === 'emergency' && 'bg-amber-100 hover:bg-amber-200',
                              !assignType && 'hover:bg-zinc-50',
                            )}
                            title={`${member.name} × ${song.title}${assignType === 'regular' ? ' (正式)' : assignType === 'emergency' ? ' (替补)' : ''}${opinion ? ` · ${OPINION_DOT[opinion].title}` : ''}`}
                          >
                            {opinion && (
                              <span className={cn(
                                'h-3 w-3 rounded-full',
                                OPINION_DOT[opinion].bg,
                              )} />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignment popover */}
      {popoverSongId && popoverRect && (() => {
        const song = state.songs.find((s) => s.id === popoverSongId);
        if (!song) return null;
        return (
          <AssignPopover
            song={song}
            assignments={state.assignments}
            members={state.members}
            onAdd={addAssignment}
            onDelete={deleteAssignment}
            onClose={closePopover}
            anchorRect={popoverRect}
          />
        );
      })()}
    </div>
  );
}
