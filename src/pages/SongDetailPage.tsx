import * as React from 'react';
import { ArrowLeft, Pencil, Trash2, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SongFormDialog } from '@/components/SongFormDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useApp } from '@/store/AppContext';
import { INSTRUMENT_META, INSTRUMENTS } from '@/lib/instruments';
import { SONG_STATUS_META, SONG_STATUSES } from '@/lib/songStatus';
import type { SongStatus } from '@/types';
import { cn } from '@/lib/utils';
import type { Assignment, Instrument, Member, Song } from '@/types';

const DRAG_MIME = 'application/x-band-planner-member';

interface SongDetailPageProps {
  songId: string;
  onBack: () => void;
}

export default function SongDetailPage({ songId, onBack }: SongDetailPageProps) {
  const { state, updateSong, deleteSong, addAssignment, updateAssignment, deleteAssignment } =
    useApp();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [dragMemberId, setDragMemberId] = React.useState<string | null>(null);
  const [dropHover, setDropHover] = React.useState<Instrument | null>(null);
  const [creditHover, setCreditHover] = React.useState<'composer' | 'lyricist' | null>(null);

  const song = state.songs.find((s) => s.id === songId);

  // If the song is gone (e.g. deleted from another tab), bounce back.
  React.useEffect(() => {
    if (!song) onBack();
  }, [song, onBack]);

  // Auto-transition: original in 'writing' status with both ready flags
  // checked → bump to 'learning'. Cancelling a flag does NOT revert.
  React.useEffect(() => {
    if (!song) return;
    if (
      song.kind === 'original' &&
      song.status === 'writing' &&
      song.composerReady &&
      song.lyricistReady
    ) {
      updateSong({ ...song, status: 'learning' });
    }
  }, [song, updateSong]);

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

  const handleDrop = (part: Instrument) => {
    const memberId = dragMemberId;
    setDragMemberId(null);
    setDropHover(null);
    if (!memberId) return;
    // Reject members whose instrument list doesn't include this part.
    const member = state.members.find((m) => m.id === memberId);
    if (!member || !member.instruments.includes(part)) return;
    // Don't add a duplicate (same member already on this part).
    const existing = state.assignments.find(
      (a) => a.songId === song.id && a.part === part && a.memberId === memberId,
    );
    if (existing) return;
    const newAssignment: Assignment = {
      id: crypto.randomUUID(),
      songId: song.id,
      memberId,
      part,
      isEmergency: false,
    };
    addAssignment(newAssignment);
  };

  const handleCreditDrop = (kind: 'composer' | 'lyricist') => {
    const memberId = dragMemberId;
    setDragMemberId(null);
    setCreditHover(null);
    if (!memberId) return;
    const field = kind === 'composer' ? 'composerIds' : 'lyricistIds';
    const current = song[field] ?? [];
    if (current.includes(memberId)) return;
    updateSong({ ...song, [field]: [...current, memberId] });
  };

  const removeCredit = (kind: 'composer' | 'lyricist', memberId: string) => {
    const field = kind === 'composer' ? 'composerIds' : 'lyricistIds';
    const current = song[field] ?? [];
    updateSong({ ...song, [field]: current.filter((id) => id !== memberId) });
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-4xl p-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 mb-4">
          <ArrowLeft className="h-4 w-4" />
          返回歌曲列表
        </Button>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {song.kind === 'original' && (
                  <span className="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-700">
                    原创
                  </span>
                )}
                <div className="relative">
                  <select
                    value={song.status}
                    disabled={song.status === 'writing'}
                    onChange={(e) =>
                      updateSong({ ...song, status: e.target.value as SongStatus })
                    }
                    title={song.status === 'writing' ? '作曲和作词都打钩后会自动进入下一阶段' : undefined}
                    className={cn(
                      'appearance-none rounded-md border px-2 py-0.5 pr-6 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zinc-400',
                      song.status === 'writing' ? 'cursor-not-allowed' : 'cursor-pointer',
                      SONG_STATUS_META[song.status].badge,
                    )}
                  >
                    {SONG_STATUSES.filter((s) => song.kind === 'original' || s !== 'writing').map((s) => (
                      <option key={s} value={s}>
                        {SONG_STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px]">
                    ▾
                  </span>
                </div>
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight truncate">{song.title}</h1>
              {song.artist && <p className="mt-1 text-sm text-zinc-500">{song.artist}</p>}
              {song.notes && (
                <p className="mt-4 whitespace-pre-wrap rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                  {song.notes}
                </p>
              )}
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
        </div>

        {song.kind === 'original' && (
          <div className="mt-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">原创署名</h2>
              <p className="text-xs text-zinc-500">拖成员到 作曲 / 作词，完成后打钩</p>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(['composer', 'lyricist'] as const).map((kind) => {
                const ids = (kind === 'composer' ? song.composerIds : song.lyricistIds) ?? [];
                const ready = kind === 'composer' ? !!song.composerReady : !!song.lyricistReady;
                const isHover = creditHover === kind;
                const tone =
                  kind === 'composer'
                    ? 'border-violet-300 bg-violet-50 text-violet-700'
                    : 'border-pink-300 bg-pink-50 text-pink-700';
                const toggleReady = () => {
                  const field = kind === 'composer' ? 'composerReady' : 'lyricistReady';
                  updateSong({ ...song, [field]: !ready });
                };
                return (
                  <div
                    key={kind}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (creditHover !== kind) setCreditHover(kind);
                    }}
                    onDragLeave={() => {
                      if (creditHover === kind) setCreditHover(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleCreditDrop(kind);
                    }}
                    className={cn(
                      'rounded-xl border bg-white shadow-sm transition-all',
                      isHover ? 'border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900/10' : 'border-zinc-200',
                    )}
                  >
                    <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2.5">
                      <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', tone)}>
                        {kind === 'composer' ? '作曲' : '作词'}
                      </span>
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-600 select-none">
                        <input
                          type="checkbox"
                          checked={ready}
                          onChange={toggleReady}
                          className="h-3.5 w-3.5 cursor-pointer accent-emerald-600"
                        />
                        完成
                      </label>
                    </div>
                    <div className="min-h-[4.5rem] space-y-1.5 p-2.5">
                      {ids.length === 0 ? (
                        <div className="flex h-full min-h-[3.5rem] items-center justify-center rounded-md border border-dashed border-zinc-200 px-2 text-center text-xs text-zinc-400">
                          拖成员到这里
                        </div>
                      ) : (
                        ids.map((id) => (
                          <div
                            key={id}
                            className="group flex items-center justify-between gap-1 rounded border border-zinc-200 bg-white px-2 py-1 text-sm"
                          >
                            <span className="truncate font-medium">{memberName(id)}</span>
                            <button
                              type="button"
                              onClick={() => removeCredit(kind, id)}
                              className="rounded p-0.5 text-zinc-400 opacity-0 hover:bg-zinc-100 hover:text-red-600 group-hover:opacity-100"
                              title="移除"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">分配</h2>
            <p className="text-xs text-zinc-500">点击成员切换正式 / 替补</p>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {INSTRUMENTS.filter((inst) => partCounts[inst]).map((inst) => {
              const meta = INSTRUMENT_META[inst];
              const count = partCounts[inst]!;
              const assignments = assignmentsForPart(inst);
              const isHover = dropHover === inst;
              const dragMember = dragMemberId
                ? state.members.find((m) => m.id === dragMemberId)
                : null;
              const canDrop = !dragMember || dragMember.instruments.includes(inst);
              return (
                <div
                  key={inst}
                  onDragOver={(e) => {
                    if (!canDrop) return;
                    e.preventDefault();
                    if (dropHover !== inst) setDropHover(inst);
                  }}
                  onDragLeave={() => {
                    if (dropHover === inst) setDropHover(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(inst);
                  }}
                  className={cn(
                    'rounded-xl border bg-white shadow-sm transition-all',
                    isHover && canDrop ? 'border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900/10' : 'border-zinc-200',
                    dragMember && !canDrop && 'opacity-40',
                  )}
                >
                  <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                          meta.badge,
                        )}
                      >
                        {meta.label}
                      </span>
                      {count > 1 && (
                        <span className="text-[11px] text-zinc-500">×{count}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-[11px] tabular-nums',
                        assignments.length >= count ? 'text-emerald-600 font-medium' : 'text-zinc-400',
                      )}
                    >
                      {assignments.length}/{count}
                    </span>
                  </div>

                  <div className="min-h-[5.5rem] space-y-1.5 p-2.5">
                    {assignments.length === 0 ? (
                      <div className="flex h-full min-h-[4rem] items-center justify-center rounded-md border border-dashed border-zinc-200 px-2 text-center text-xs text-zinc-400">
                        拖成员到这里
                      </div>
                    ) : (
                      assignments.map((a) => (
                        <div
                          key={a.id}
                          className={cn(
                            'group flex items-center justify-between gap-1 rounded border px-2 py-1 text-sm',
                            a.isEmergency
                              ? 'border-amber-200 bg-amber-50'
                              : 'border-zinc-200 bg-white',
                          )}
                        >
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                            onClick={() =>
                              updateAssignment({ ...a, isEmergency: !a.isEmergency })
                            }
                            title={a.isEmergency ? '点击 → 设为正式' : '点击 → 设为替补'}
                          >
                            <span className="truncate font-medium">
                              {memberName(a.memberId)}
                            </span>
                            {a.isEmergency && (
                              <Zap className="h-3 w-3 shrink-0 text-amber-600" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteAssignment(a.id)}
                            className="rounded p-0.5 text-zinc-400 opacity-0 hover:bg-zinc-100 hover:text-red-600 group-hover:opacity-100"
                            title="删除"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Member pool — grouped by required part of this song */}
          <div className="sticky bottom-4 mt-6 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-md backdrop-blur">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                成员池
              </h3>
              <p className="text-[10px] text-zinc-400">按 part 分组 · 已分配的会变灰</p>
            </div>
            {state.members.length === 0 ? (
              <p className="text-xs text-zinc-400">还没有成员。先去成员页添加。</p>
            ) : (() => {
              const requiredParts = INSTRUMENTS.filter((inst) => partCounts[inst]);
              // For originals with no parts: fall back to a single flat list.
              if (requiredParts.length === 0) {
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {state.members.map((m) => (
                      <PoolChip
                        key={m.id}
                        member={m}
                        isDragging={dragMemberId === m.id}
                        dimmed={false}
                        onDragStart={(e) => {
                          e.dataTransfer.setData(DRAG_MIME, m.id);
                          e.dataTransfer.effectAllowed = 'copy';
                          setDragMemberId(m.id);
                        }}
                        onDragEnd={() => {
                          setDragMemberId(null);
                          setDropHover(null);
                        }}
                      />
                    ))}
                  </div>
                );
              }
              return (
                <div className="space-y-2">
                  {requiredParts.map((part) => {
                    const meta = INSTRUMENT_META[part];
                    const eligible = state.members.filter((m) => m.instruments.includes(part));
                    const assignedIdsForPart = new Set(
                      state.assignments
                        .filter((a) => a.songId === song.id && a.part === part)
                        .map((a) => a.memberId),
                    );
                    return (
                      <div key={part} className="flex items-start gap-2">
                        <span
                          className={cn(
                            'mt-0.5 inline-flex w-14 shrink-0 items-center justify-center rounded-md border px-1 py-0.5 text-[11px] font-medium',
                            meta.badge,
                          )}
                        >
                          {meta.label}
                        </span>
                        <div className="flex flex-1 flex-wrap gap-1.5">
                          {eligible.length === 0 ? (
                            <p className="text-[11px] italic text-zinc-400 self-center">没有会这个 part 的成员</p>
                          ) : (
                            eligible.map((m) => (
                              <PoolChip
                                key={m.id}
                                member={m}
                                isDragging={dragMemberId === m.id}
                                dimmed={assignedIdsForPart.has(m.id)}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData(DRAG_MIME, m.id);
                                  e.dataTransfer.effectAllowed = 'copy';
                                  setDragMemberId(m.id);
                                }}
                                onDragEnd={() => {
                                  setDragMemberId(null);
                                  setDropHover(null);
                                }}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
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

    </div>
  );
}

interface PoolChipProps {
  member: Member;
  isDragging: boolean;
  dimmed?: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

function PoolChip({ member, isDragging, dimmed, onDragStart, onDragEnd }: PoolChipProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={dimmed ? `${member.name}（已分配到这个 part）` : member.name}
      className={cn(
        'cursor-grab select-none rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm transition-all active:cursor-grabbing',
        dimmed
          ? 'border-zinc-100 bg-zinc-50 text-zinc-400 hover:border-zinc-200'
          : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300',
        isDragging && 'opacity-40',
      )}
    >
      {member.name}
    </div>
  );
}
