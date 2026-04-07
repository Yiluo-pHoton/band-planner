import * as React from 'react';
import { Music, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SongFormDialog } from '@/components/SongFormDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useApp } from '@/store/AppContext';
import { INSTRUMENT_META } from '@/lib/instruments';
import { SONG_STATUS_META } from '@/lib/songStatus';
import { cn } from '@/lib/utils';
import type { Song } from '@/types';

interface SongsPageProps {
  onSelect?: (id: string) => void;
}

export default function SongsPage({ onSelect }: SongsPageProps) {
  const { state, addSong, updateSong, deleteSong } = useApp();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Song | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<Song | undefined>(undefined);

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

  const songs = state.songs;

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
                    <th className="px-4 py-2 text-left">标题</th>
                    <th className="px-4 py-2 text-left">艺人</th>
                    <th className="px-4 py-2 text-left">状态</th>
                    <th className="px-4 py-2 text-left">需要 parts</th>
                    <th className="px-4 py-2 text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {songs.map((song) => (
                    <tr key={song.id} className="group text-sm hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {onSelect ? (
                          <button
                            type="button"
                            onClick={() => onSelect(song.id)}
                            className="text-left hover:underline"
                          >
                            {song.title}
                          </button>
                        ) : (
                          song.title
                        )}
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
                        <div className="flex flex-wrap gap-1">
                          {song.requiredParts.map((part, i) => {
                            const meta = INSTRUMENT_META[part];
                            return (
                              <span
                                key={`${part}-${i}`}
                                className={cn(
                                  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                                  meta.badge,
                                )}
                              >
                                {meta.abbrev}
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
