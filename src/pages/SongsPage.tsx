import * as React from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Music, Pencil, Plus, Trash2 } from 'lucide-react';
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

export default function SongsPage({ onSelect }: SongsPageProps) {
  const { state, addSong, updateSong, deleteSong } = useApp();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Song | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<Song | undefined>(undefined);
  const [sort, setSort] = React.useState<{ key: SortKey; dir: SortDir } | null>(null);

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

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-4xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">歌曲</h1>
            <p className="text-sm text-zinc-500 mt-1">乐队曲库与每首歌需要的 part</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            添加歌曲
          </Button>
        </div>

        <div className="mt-6">
          {songs.length === 0 ? (
            <EmptyState onAdd={openCreate} />
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <table className="w-full">
                <thead className="bg-zinc-50">
                  <tr className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <SortableTh label="标题" sortKey="title" sort={sort} onClick={cycleSort} />
                    <SortableTh label="艺人" sortKey="artist" sort={sort} onClick={cycleSort} />
                    <SortableTh label="状态" sortKey="status" sort={sort} onClick={cycleSort} />
                    <th className="px-4 py-2 text-left">需要 parts</th>
                    <th className="px-4 py-2 text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {songs.map((song) => (
                    <tr key={song.id} className="group text-sm hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        <div className="flex items-center gap-1.5">
                          {onSelect ? (
                            <button
                              type="button"
                              onClick={() => onSelect(song.id)}
                              className="text-left hover:underline"
                            >
                              {song.title}
                            </button>
                          ) : (
                            <span>{song.title}</span>
                          )}
                          {(() => {
                            const missing = unassignedCount(song, state.assignments);
                            if (missing === 0) return null;
                            return (
                              <span
                                className="inline-flex items-center gap-0.5 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                                title={`还有 ${missing} 个 part 没有正式分配`}
                              >
                                <AlertTriangle className="h-3 w-3" />
                                缺 {missing}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{song.artist || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                            SONG_STATUS_META[song.status].badge,
                          )}
                        >
                          {SONG_STATUS_META[song.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="grid grid-cols-6 gap-1">
                          {INSTRUMENTS.map((inst) => {
                            const count = song.requiredParts.filter((p) => p === inst).length;
                            const meta = INSTRUMENT_META[inst];
                            if (count === 0) {
                              return <span key={inst} className="h-5" />;
                            }
                            return (
                              <span
                                key={inst}
                                className={cn(
                                  'inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 text-xs font-medium',
                                  meta.badge,
                                )}
                              >
                                {meta.abbrev}
                                {count > 1 && <span className="ml-0.5 text-[10px]">×{count}</span>}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(song)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(song)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
    <th className="px-4 py-2 text-left">
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
