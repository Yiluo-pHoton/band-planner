import * as React from 'react';
import { ArrowLeft, Pencil, Plus, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SongFormDialog } from '@/components/SongFormDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AssignSlotDialog } from '@/components/AssignSlotDialog';
import { useApp } from '@/store/AppContext';
import { INSTRUMENT_META, INSTRUMENTS } from '@/lib/instruments';
import { SONG_STATUS_META } from '@/lib/songStatus';
import { cn } from '@/lib/utils';
import type { Assignment, Instrument, Song } from '@/types';

interface SongDetailPageProps {
  songId: string;
  onBack: () => void;
}

export default function SongDetailPage({ songId, onBack }: SongDetailPageProps) {
  const { state, updateSong, deleteSong, addAssignment, updateAssignment, deleteAssignment } =
    useApp();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [assignDialog, setAssignDialog] = React.useState<{
    part: Instrument;
    initial?: Assignment;
  } | null>(null);
  const [deleteAssignTarget, setDeleteAssignTarget] = React.useState<Assignment | null>(null);

  const song = state.songs.find((s) => s.id === songId);

  // If the song is gone (e.g. deleted from another tab), bounce back.
  React.useEffect(() => {
    if (!song) onBack();
  }, [song, onBack]);

  if (!song) return null;

  // Group requiredParts by part type, with the count = how many of that part this song needs.
  const partCounts = INSTRUMENTS.reduce<Partial<Record<Instrument, number>>>((acc, inst) => {
    const n = song.requiredParts.filter((p) => p === inst).length;
    if (n > 0) acc[inst] = n;
    return acc;
  }, {});

  const assignmentsForPart = (part: Instrument) =>
    state.assignments.filter((a) => a.songId === song.id && a.part === part);

  const memberName = (id: string) => state.members.find((m) => m.id === id)?.name ?? '(已删除)';

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-3xl p-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 mb-3">
          <ArrowLeft className="h-4 w-4" />
          返回歌曲列表
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold truncate">{song.title}</h1>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                  SONG_STATUS_META[song.status].badge,
                )}
              >
                {SONG_STATUS_META[song.status].label}
              </span>
            </div>
            {song.artist && <p className="text-sm text-zinc-500 mt-1">{song.artist}</p>}
            {song.notes && <p className="text-sm text-zinc-700 mt-3 whitespace-pre-wrap">{song.notes}</p>}
          </div>
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold">分配</h2>
          <p className="text-sm text-zinc-500 mt-1">每个 part 谁负责。多个正式 = 谁来谁弹。</p>

          <div className="mt-4 space-y-3">
            {INSTRUMENTS.filter((inst) => partCounts[inst]).map((inst) => {
              const meta = INSTRUMENT_META[inst];
              const count = partCounts[inst]!;
              const assignments = assignmentsForPart(inst);
              return (
                <div key={inst} className="rounded-lg border border-zinc-200 bg-white">
                  <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                          meta.badge,
                        )}
                      >
                        {meta.abbrev}
                      </span>
                      <span className="text-sm font-medium">{meta.label}</span>
                      {count > 1 && (
                        <span className="text-xs text-zinc-500">需要 {count} 个同时演奏</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAssignDialog({ part: inst })}
                    >
                      <Plus className="h-4 w-4" />
                      添加
                    </Button>
                  </div>

                  {assignments.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-zinc-500">尚未分配</p>
                  ) : (
                    <ul className="divide-y divide-zinc-100">
                      {assignments.map((a) => (
                        <li
                          key={a.id}
                          className="group flex items-center justify-between px-4 py-2 hover:bg-zinc-50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{memberName(a.memberId)}</span>
                            {a.isEmergency && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                <Zap className="h-3 w-3" />
                                替补
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updateAssignment({ ...a, isEmergency: !a.isEmergency })
                              }
                            >
                              {a.isEmergency ? '设为正式' : '设为替补'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setAssignDialog({ part: inst, initial: a })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteAssignTarget(a)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <SongFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={song}
        onSubmit={(s: Song) => updateSong(s)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`删除「${song.title}」？`}
        description={`此操作不可撤销。这首歌的 ${state.assignments.filter((a) => a.songId === song.id).length} 条分配也会被一并删除。`}
        onConfirm={() => {
          deleteSong(song.id);
          onBack();
        }}
      />

      {assignDialog && (
        <AssignSlotDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setAssignDialog(null);
          }}
          songId={song.id}
          part={assignDialog.part}
          initial={assignDialog.initial}
          onSubmit={(a) => {
            if (assignDialog.initial) updateAssignment(a);
            else addAssignment(a);
          }}
        />
      )}

      <ConfirmDialog
        open={deleteAssignTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteAssignTarget(null);
        }}
        title="删除这条分配？"
        onConfirm={() => {
          if (deleteAssignTarget) deleteAssignment(deleteAssignTarget.id);
        }}
      />
    </div>
  );
}
