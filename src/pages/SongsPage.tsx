import * as React from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, LayoutGrid, List, Music, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SongFormDialog } from '@/components/SongFormDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useApp } from '@/store/AppContext';
import { INSTRUMENTS, INSTRUMENT_META } from '@/lib/instruments';
import { SONG_STATUSES, SONG_STATUS_META } from '@/lib/songStatus';
import { cn } from '@/lib/utils';
import type { Assignment, Song } from '@/types';

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
  const [view, setView] = React.useState<ViewMode>('table');

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

  const totalCount = state.songs.length;
  const originalCount = state.songs.filter((s) => s.kind === 'original').length;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-5xl p-6">
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
                title="卡片视图"
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded transition-colors',
                  view === 'cards' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900',
                )}
              >
                <LayoutGrid className="h-4 w-4" />
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
          ) : view === 'table' ? (
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
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-zinc-900">{song.title}</span>
                              {song.kind === 'original' && (
                                <span className="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                                  原创
                                </span>
                              )}
                              {missing > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                                  title={`还有 ${missing} 个 part 没有正式分配`}
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  缺 {missing}
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
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {songs.map((song) => {
                const missing = unassignedCount(song, state.assignments);
                return (
                  <SongCard
                    key={song.id}
                    song={song}
                    missing={missing}
                    onSelect={onSelect ? () => onSelect(song.id) : undefined}
                    onEdit={() => openEdit(song)}
                    onDelete={() => setDeleteTarget(song)}
                  />
                );
              })}
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

interface SongCardProps {
  song: Song;
  missing: number;
  onSelect?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SongCard({ song, missing, onSelect, onEdit, onDelete }: SongCardProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors',
        onSelect ? 'cursor-pointer hover:border-zinc-300 hover:shadow-md' : 'hover:border-zinc-300',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-zinc-900">{song.title}</p>
          {song.artist && (
            <p className="mt-0.5 truncate text-xs text-zinc-500">{song.artist}</p>
          )}
        </div>
        <span
          className={cn(
            'shrink-0 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium',
            SONG_STATUS_META[song.status].badge,
          )}
        >
          {SONG_STATUS_META[song.status].label}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {song.kind === 'original' && (
          <span className="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
            原创
          </span>
        )}
        {missing > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            缺 {missing}
          </span>
        )}
      </div>

      <PartsRow song={song} />

      <div
        className="absolute bottom-2 right-2 flex gap-0.5 rounded-md bg-white/90 opacity-0 backdrop-blur-sm group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
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
