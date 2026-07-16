import * as React from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Columns3, List, Music, Pencil, Plus, Trash2, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SongFormDialog } from '@/components/SongFormDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useApp } from '@/store/AppContext';
import { INSTRUMENTS, INSTRUMENT_META } from '@/lib/instruments';
import { SONG_STATUSES, SONG_STATUS_META, isStatusAllowed } from '@/lib/songStatus';
import { nextRehearsalDates, type WeekDay } from '@/lib/rehearsalDay';
import { cn } from '@/lib/utils';
import type { Assignment, Availability, Member, Song, SongStatus } from '@/types';

// A song is "fully assigned" iff every required part has at least one
// non-emergency assignment (matching count for duplicates). Shelved songs
// are not flagged — we don't nag about songs the band has set aside.
function unassignedCount(song: Song, assignments: Assignment[]): number {
  if (song.status === 'shelved') return 0;
  let missing = 0;
  for (const inst of INSTRUMENTS) {
    const required = song.requiredParts.filter((p) => p === inst).length;
    if (required === 0) continue;
    const regular = assignments.filter(
      (a) => a.songId === song.id && a.part === inst && !a.isEmergency,
    ).length;
    if (regular < required) missing += required - regular;
  }
  return missing;
}

/** Members assigned (non-emergency) to a song who are unavailable on ALL
 *  of the next `count` rehearsal days. Returns member names for display. */
function findUnavailableMembers(
  songId: string,
  assignments: Assignment[],
  members: Member[],
  availability: Availability[],
  dates: string[],
): string[] {
  if (dates.length === 0) return [];
  const songAssignments = assignments.filter((a) => a.songId === songId && !a.isEmergency);
  const memberIds = [...new Set(songAssignments.map((a) => a.memberId))];
  const result: string[] = [];
  for (const mId of memberIds) {
    const allUnavailable = dates.every((date) => {
      const av = availability.find((a) => a.memberId === mId && a.date === date);
      return av?.status === 'unavailable';
    });
    if (allUnavailable) {
      const m = members.find((x) => x.id === mId);
      if (m) result.push(m.name);
    }
  }
  return result;
}

/** Check whether every unavailable member's parts are covered by an
 *  available emergency (替补) assignee. Returns true when fully covered. */
function checkBackupCoverage(
  songId: string,
  assignments: Assignment[],
  availability: Availability[],
  dates: string[],
): boolean {
  if (dates.length === 0) return false;
  const regular = assignments.filter((a) => a.songId === songId && !a.isEmergency);
  const memberIds = [...new Set(regular.map((a) => a.memberId))];
  const unavailIds = memberIds.filter((mId) =>
    dates.every((date) => {
      const av = availability.find((x) => x.memberId === mId && x.date === date);
      return av?.status === 'unavailable';
    }),
  );
  if (unavailIds.length === 0) return true;
  for (const mId of unavailIds) {
    const parts = regular.filter((a) => a.memberId === mId);
    for (const pa of parts) {
      const backups = assignments.filter(
        (a) => a.songId === songId && a.part === pa.part && a.isEmergency,
      );
      const ok = backups.some((b) =>
        !dates.every((date) => {
          const av = availability.find((x) => x.memberId === b.memberId && x.date === date);
          return av?.status === 'unavailable';
        }),
      );
      if (!ok) return false;
    }
  }
  return true;
}

interface SongsPageProps {
  onSelect?: (id: string) => void;
}

type SortKey = 'title' | 'artist' | 'status';
type SortDir = 'asc' | 'desc';
type ViewMode = 'table' | 'cards';

export default function SongsPage({ onSelect }: SongsPageProps) {
  const { state, addSong, updateSong, deleteSong } = useApp();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Song | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<Song | undefined>(undefined);
  const [sort, setSort] = React.useState<{ key: SortKey; dir: SortDir } | null>(null);
  const [view, setViewRaw] = React.useState<ViewMode>(() => {
    const saved = localStorage.getItem('band-planner:songs-view');
    return saved === 'table' ? 'table' : 'cards';
  });
  const setView = (v: ViewMode) => {
    setViewRaw(v);
    localStorage.setItem('band-planner:songs-view', v);
  };

  const cycleSort = (key: SortKey) => {
    setSort((cur) => {
      if (!cur || cur.key !== key) return { key, dir: 'asc' };
      if (cur.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = (song: Song) => {
    setEditing(song);
    setFormOpen(true);
  };

  const handleSubmit = (song: Song) => {
    if (editing) updateSong(song);
    else addSong(song);
  };

  const songs = React.useMemo(() => {
    if (!sort) return state.songs;
    const statusRank = (s: Song) => SONG_STATUSES.indexOf(s.status);
    const cmp = (a: Song, b: Song): number => {
      let v = 0;
      if (sort.key === 'title') v = a.title.localeCompare(b.title, 'zh');
      else if (sort.key === 'artist') v = (a.artist ?? '').localeCompare(b.artist ?? '', 'zh');
      else if (sort.key === 'status') v = statusRank(a) - statusRank(b);
      return sort.dir === 'asc' ? v : -v;
    };
    return [...state.songs].sort(cmp);
  }, [state.songs, sort]);

  const rDay = (state.rehearsalDay ?? 6) as WeekDay;
  const upcoming3 = React.useMemo(() => nextRehearsalDates(rDay, 3), [rDay]);

  const unavailableMap = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const song of state.songs) {
      if (song.status === 'shelved') continue;
      const names = findUnavailableMembers(
        song.id, state.assignments, state.members, state.availability, upcoming3,
      );
      if (names.length > 0) map.set(song.id, names);
    }
    return map;
  }, [state.songs, state.assignments, state.members, state.availability, upcoming3]);

  const backupCoveredMap = React.useMemo(() => {
    const map = new Map<string, boolean>();
    for (const [songId] of unavailableMap) {
      map.set(songId, checkBackupCoverage(songId, state.assignments, state.availability, upcoming3));
    }
    return map;
  }, [unavailableMap, state.assignments, state.availability, upcoming3]);

  const totalCount = state.songs.length;
  const originalCount = state.songs.filter((s) => s.kind === 'original').length;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto px-6 py-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">歌曲</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {totalCount === 0
                ? '乐队曲库'
                : `${totalCount} 首${originalCount > 0 ? ` · ${originalCount} 原创` : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-zinc-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setView('table')}
                title="表格视图"
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded transition-colors',
                  view === 'table' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900',
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView('cards')}
                title="看板视图"
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded transition-colors',
                  view === 'cards' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900',
                )}
              >
                <Columns3 className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              添加歌曲
            </Button>
          </div>
        </div>

        <div className="mt-6">
          {songs.length === 0 ? (
            <EmptyState onAdd={openCreate} />
          ) : view === 'cards' ? (
            <KanbanBoard
              songs={state.songs}
              assignments={state.assignments}
              unavailableMap={unavailableMap}
              backupCoveredMap={backupCoveredMap}
              onSelect={onSelect}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onStatusChange={(song, status) => updateSong({ ...song, status })}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <table className="w-full">
                <thead className="bg-zinc-50/60">
                  <tr className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <SortableTh label="歌曲" sortKey="title" sort={sort} onClick={cycleSort} />
                    <SortableTh label="状态" sortKey="status" sort={sort} onClick={cycleSort} />
                    <th className="px-5 py-3 text-left">配器</th>
                    <th className="w-20 px-5 py-3 text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {songs.map((song) => {
                    const missing = unassignedCount(song, state.assignments);
                    const unavailNames = unavailableMap.get(song.id);
                    const hasWarning = missing > 0 || (unavailNames && unavailNames.length > 0);
                    const backupCovered = backupCoveredMap.get(song.id) ?? false;
                    const titleColor = !hasWarning ? 'text-zinc-900'
                      : (missing === 0 && backupCovered) ? 'text-amber-600'
                      : 'text-red-600';
                    return (
                      <tr
                        key={song.id}
                        onClick={() => onSelect?.(song.id)}
                        className={cn(
                          'group text-sm',
                          onSelect ? 'cursor-pointer hover:bg-zinc-50' : 'hover:bg-zinc-50/70',
                        )}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={cn('font-medium', titleColor)}>{song.title}</span>
                              {song.kind === 'original' && (
                                <span className="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                                  原创
                                </span>
                              )}
                              {missing > 0 && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800"
                                  title={`还有 ${missing} 个 part 没有正式分配`}
                                >
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  缺 {missing}
                                </span>
                              )}
                              {unavailNames && unavailNames.length > 0 && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700"
                                  title={`${unavailNames.join('、')} 连续 3 次排练不在`}
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                  {unavailNames.join('、')}
                                </span>
                              )}
                            </div>
                            {song.artist && (
                              <span className="text-xs text-zinc-500">{song.artist}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                              SONG_STATUS_META[song.status].badge,
                            )}
                          >
                            {SONG_STATUS_META[song.status].label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <PartsRow song={song} />
                        </td>
                        <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(song)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(song)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <SongFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteTarget !== undefined}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(undefined);
        }}
        title={`删除「${deleteTarget?.title ?? ''}」？`}
        description="此操作不可撤销。相关的 assignment 也会被一并删除。"
        onConfirm={() => {
          if (deleteTarget) deleteSong(deleteTarget.id);
        }}
      />
    </div>
  );
}

interface SortableThProps {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: SortDir } | null;
  onClick: (key: SortKey) => void;
}

function SortableTh({ label, sortKey, sort, onClick }: SortableThProps) {
  const active = sort?.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort?.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className="px-5 py-3 text-left">
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-zinc-900',
          active ? 'text-zinc-900' : 'text-zinc-500',
        )}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </th>
  );
}

function PartsRow({ song }: { song: Song }) {
  // Compact inline list of just the present parts (no fixed grid).
  const present = INSTRUMENTS.flatMap((inst) => {
    const count = song.requiredParts.filter((p) => p === inst).length;
    return count > 0 ? [{ inst, count }] : [];
  });
  if (present.length === 0) {
    return <span className="text-xs text-zinc-400 italic">配器待定</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {present.map(({ inst, count }) => {
        const meta = INSTRUMENT_META[inst];
        return (
          <span
            key={inst}
            className={cn(
              'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
              meta.badge,
            )}
          >
            {meta.abbrev}
            {count > 1 && <span className="ml-0.5 text-[10px]">×{count}</span>}
          </span>
        );
      })}
    </div>
  );
}

/* ---- Kanban board grouped by status ---- */

const STATUS_TINT: Record<string, string> = {
  writing: 'bg-violet-50/60',
  learning: 'bg-zinc-50/60',
  rehearsing: 'bg-sky-50/60',
  polishing: 'bg-indigo-50/60',
  ready: 'bg-emerald-50/60',
  shelved: 'bg-zinc-100/40',
};

const MIME = 'application/x-band-song-id';
const ORDER_KEY = 'band-planner:songs-kanban-order';

type ColumnOrder = Partial<Record<SongStatus, string[]>>;

function loadColumnOrder(): ColumnOrder {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (raw) return JSON.parse(raw) as ColumnOrder;
  } catch { /* ignore */ }
  return {};
}

function saveColumnOrder(order: ColumnOrder) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(order));
}

function sortByOrder(songs: Song[], order: string[]): Song[] {
  const posMap = new Map(order.map((id, i) => [id, i]));
  return [...songs].sort((a, b) => {
    const pa = posMap.get(a.id) ?? Infinity;
    const pb = posMap.get(b.id) ?? Infinity;
    return pa - pb;
  });
}

interface KanbanBoardProps {
  songs: Song[];
  assignments: Assignment[];
  unavailableMap: Map<string, string[]>;
  backupCoveredMap: Map<string, boolean>;
  onSelect?: (id: string) => void;
  onEdit: (song: Song) => void;
  onDelete: (song: Song) => void;
  onStatusChange: (song: Song, status: SongStatus) => void;
}

function KanbanBoard({ songs, assignments, unavailableMap, backupCoveredMap, onSelect, onEdit, onDelete, onStatusChange }: KanbanBoardProps) {
  const [dragOver, setDragOver] = React.useState<SongStatus | null>(null);
  const [dragOverIdx, setDragOverIdx] = React.useState<number | null>(null);
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrder>(loadColumnOrder);

  const updateOrder = (next: ColumnOrder) => {
    setColumnOrder(next);
    saveColumnOrder(next);
  };

  const columns = SONG_STATUSES.map((status) => {
    const colSongs = songs.filter((s) => s.status === status);
    const order = columnOrder[status] ?? [];
    return {
      status,
      meta: SONG_STATUS_META[status],
      songs: sortByOrder(colSongs, order),
    };
  });

  const visibleColumns = columns.filter((c) => c.songs.length > 0 || c.status !== 'shelved');

  const handleDrop = (targetStatus: SongStatus, e: React.DragEvent, insertIdx?: number) => {
    e.preventDefault();
    setDragOver(null);
    setDragOverIdx(null);
    const songId = e.dataTransfer.getData(MIME);
    if (!songId) return;
    const song = songs.find((s) => s.id === songId);
    if (!song) return;

    const sameColumn = song.status === targetStatus;

    if (!sameColumn) {
      // Cross-column: validate status change
      if (targetStatus === 'writing' && song.kind !== 'original') return;
      if (song.status === 'writing' && song.kind === 'original' && !(song.composerReady && song.lyricistReady)) return;
      const missing = unassignedCount(song, assignments);
      if (!isStatusAllowed(targetStatus, missing)) return;
    }

    // Update column order
    const next = { ...columnOrder };

    // Remove from source column order
    const sourceStatus = song.status;
    const sourceOrder = (next[sourceStatus] ?? columns.find((c) => c.status === sourceStatus)!.songs.map((s) => s.id)).filter((id) => id !== songId);
    next[sourceStatus] = sourceOrder;

    // Insert into target column order
    const targetCol = columns.find((c) => c.status === targetStatus)!;
    const targetOrder = (next[targetStatus] ?? targetCol.songs.map((s) => s.id)).filter((id) => id !== songId);
    const idx = insertIdx != null ? Math.min(insertIdx, targetOrder.length) : targetOrder.length;
    targetOrder.splice(idx, 0, songId);
    next[targetStatus] = targetOrder;

    updateOrder(next);

    if (!sameColumn) {
      onStatusChange(song, targetStatus);
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {visibleColumns.map((col) => (
        <div
          key={col.status}
          className={cn(
            'flex min-w-[13rem] flex-1 flex-col rounded-xl border bg-white shadow-sm transition-colors',
            dragOver === col.status ? 'border-zinc-400 ring-2 ring-zinc-200' : 'border-zinc-200',
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(col.status);
          }}
          onDragLeave={() => { setDragOver(null); setDragOverIdx(null); }}
          onDrop={(e) => handleDrop(col.status, e)}
        >
          <div className={cn('flex items-center justify-between rounded-t-xl border-b px-3 py-2', STATUS_TINT[col.status])}>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
                  col.meta.badge,
                )}
              >
                {col.meta.label}
              </span>
            </div>
            <span className="text-[10px] font-medium text-zinc-400">{col.songs.length}</span>
          </div>

          <div className={cn('flex-1 space-y-1.5 p-2', col.songs.length === 0 && 'min-h-[4rem]')}>
            {col.songs.length === 0 ? (
              <p className="py-4 text-center text-[10px] text-zinc-300">
                {dragOver === col.status ? '放到这里' : '暂无'}
              </p>
            ) : (
              col.songs.map((song, idx) => {
                const missing = unassignedCount(song, assignments);
                const unavailNames = unavailableMap.get(song.id);
                const backupCovered = backupCoveredMap.get(song.id) ?? false;
                return (
                  <KanbanCard
                    key={song.id}
                    song={song}
                    missing={missing}
                    unavailNames={unavailNames}
                    backupCovered={backupCovered}
                    isDropTarget={dragOver === col.status && dragOverIdx === idx}
                    onDragOver={() => { setDragOver(col.status); setDragOverIdx(idx); }}
                    onDrop={(e) => { e.stopPropagation(); handleDrop(col.status, e, idx); }}
                    onSelect={onSelect ? () => onSelect(song.id) : undefined}
                    onEdit={() => onEdit(song)}
                    onDelete={() => onDelete(song)}
                  />
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface KanbanCardProps {
  song: Song;
  missing: number;
  unavailNames?: string[];
  backupCovered?: boolean;
  isDropTarget?: boolean;
  onDragOver?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onSelect?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function KanbanCard({ song, missing, unavailNames, backupCovered, isDropTarget, onDragOver, onDrop, onSelect, onEdit, onDelete }: KanbanCardProps) {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(MIME, song.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDragging(false)}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(); }}
      onDrop={onDrop}
      onClick={onSelect}
      className={cn(
        'group relative cursor-grab rounded-lg border bg-white px-2.5 py-2 transition-colors active:cursor-grabbing',
        isDropTarget ? 'border-zinc-400 border-t-2' : 'border-zinc-200',
        onSelect && 'hover:border-zinc-300 hover:shadow-sm',
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-center gap-1.5">
        <p className={cn(
          'min-w-0 flex-1 truncate text-[13px] font-medium leading-tight',
          !(missing > 0 || (unavailNames && unavailNames.length > 0))
            ? 'text-zinc-900'
            : (missing === 0 && backupCovered) ? 'text-amber-600' : 'text-red-600',
        )}>
          {song.title}
        </p>
        {song.kind === 'original' && (
          <span className="shrink-0 rounded border border-violet-300 bg-violet-50 px-1 py-0 text-[9px] font-medium text-violet-700">
            原创
          </span>
        )}
      </div>
      {song.artist && (
        <p className="truncate text-[10px] leading-tight text-zinc-500">{song.artist}</p>
      )}
      <div className="mt-1">
        <PartsRow song={song} />
      </div>
      {(missing > 0 || (unavailNames && unavailNames.length > 0)) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {missing > 0 && (
            <span
              className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800"
              title={`还有 ${missing} 个 part 没有正式分配`}
            >
              <AlertTriangle className="h-3 w-3" />
              缺{missing}
            </span>
          )}
          {unavailNames && unavailNames.length > 0 && (
            <span
              className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-red-300 bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-700"
              title={`${unavailNames.join('、')} 连续 3 次排练不在`}
            >
              <UserX className="h-3 w-3" />
              {unavailNames.join('/')}
            </span>
          )}
        </div>
      )}

      {/* Hover actions */}
      <div
        className="absolute -right-1 -top-1 flex gap-0.5 rounded-md border border-zinc-200 bg-white shadow-sm opacity-0 group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onEdit} className="p-1 text-zinc-500 hover:text-zinc-900">
          <Pencil className="h-3 w-3" />
        </button>
        <button type="button" onClick={onDelete} className="p-1 text-red-500 hover:text-red-700">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-white py-16 text-center">
      <Music className="h-10 w-10 text-zinc-300 mb-3" />
      <p className="text-sm font-medium text-zinc-900">还没有歌曲</p>
      <p className="text-xs text-zinc-500 mt-1 mb-4">添加你乐队的第一首歌</p>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4" />
        添加第一首歌
      </Button>
    </div>
  );
}
