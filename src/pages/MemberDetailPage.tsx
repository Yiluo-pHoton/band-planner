import * as React from 'react';
import { ArrowLeft, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/store/AppContext';
import { INSTRUMENT_META } from '@/lib/instruments';
import { SONG_STATUS_META } from '@/lib/songStatus';
import { cn } from '@/lib/utils';
import type { Assignment, Instrument, Song } from '@/types';

const DRAG_MIME = 'application/x-band-planner-song';

// Special board keys for non-instrument boards.
type BoardKey = Instrument | 'composer' | 'lyricist';

interface MemberDetailPageProps {
  memberId: string;
  onBack: () => void;
}

export default function MemberDetailPage({ memberId, onBack }: MemberDetailPageProps) {
  const { state, addAssignment, updateAssignment, deleteAssignment, updateSong } = useApp();
  const [dragSongId, setDragSongId] = React.useState<string | null>(null);
  const [hoverBoard, setHoverBoard] = React.useState<BoardKey | null>(null);

  const member = state.members.find((m) => m.id === memberId);

  React.useEffect(() => {
    if (!member) onBack();
  }, [member, onBack]);

  if (!member) return null;

  // For each instrument the member can play: songs they're assigned to on that part.
  const instrumentBoards: { key: Instrument; songs: Song[]; assignmentByPart: Map<string, Assignment> }[] =
    member.instruments.map((inst) => {
      const assigns = state.assignments.filter(
        (a) => a.memberId === member.id && a.part === inst,
      );
      const songs: Song[] = [];
      const map = new Map<string, Assignment>();
      for (const a of assigns) {
        const s = state.songs.find((ss) => ss.id === a.songId);
        if (s) {
          songs.push(s);
          map.set(s.id, a);
        }
      }
      songs.sort((x, y) => x.title.localeCompare(y.title));
      return { key: inst, songs, assignmentByPart: map };
    });

  const composerSongs = state.songs
    .filter((s) => s.composerIds?.includes(member.id))
    .sort((a, b) => a.title.localeCompare(b.title));
  const lyricistSongs = state.songs
    .filter((s) => s.lyricistIds?.includes(member.id))
    .sort((a, b) => a.title.localeCompare(b.title));

  const handleDrop = (board: BoardKey) => {
    const songId = dragSongId;
    setDragSongId(null);
    setHoverBoard(null);
    if (!songId) return;
    const song = state.songs.find((s) => s.id === songId);
    if (!song) return;

    if (board === 'composer') {
      if (song.composerIds?.includes(member.id)) return;
      updateSong({ ...song, composerIds: [...(song.composerIds ?? []), member.id] });
      return;
    }
    if (board === 'lyricist') {
      if (song.lyricistIds?.includes(member.id)) return;
      updateSong({ ...song, lyricistIds: [...(song.lyricistIds ?? []), member.id] });
      return;
    }
    // Instrument board: must be a required part of the song, and not already assigned.
    if (!song.requiredParts.includes(board)) return;
    const exists = state.assignments.find(
      (a) => a.songId === song.id && a.part === board && a.memberId === member.id,
    );
    if (exists) return;
    addAssignment({
      id: crypto.randomUUID(),
      songId: song.id,
      memberId: member.id,
      part: board,
      isEmergency: false,
    });
  };

  const removeFromInstrumentBoard = (a: Assignment) => deleteAssignment(a.id);
  const removeFromComposer = (song: Song) =>
    updateSong({
      ...song,
      composerIds: (song.composerIds ?? []).filter((id) => id !== member.id),
    });
  const removeFromLyricist = (song: Song) =>
    updateSong({
      ...song,
      lyricistIds: (song.lyricistIds ?? []).filter((id) => id !== member.id),
    });

  // Sort songs in pool by title.
  const songPool = React.useMemo(
    () => [...state.songs].sort((a, b) => a.title.localeCompare(b.title)),
    [state.songs],
  );

  const dragSong = dragSongId ? state.songs.find((s) => s.id === dragSongId) : null;

  // Whether the dragged song can be dropped on a given board.
  const canDropOn = (board: BoardKey): boolean => {
    if (!dragSong) return true;
    if (board === 'composer' || board === 'lyricist') return true;
    return dragSong.requiredParts.includes(board);
  };

  // Total assigned songs across all boards (for header subtitle)
  const totalAssigned =
    instrumentBoards.reduce((acc, b) => acc + b.songs.length, 0) +
    composerSongs.length +
    lyricistSongs.length;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl p-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 mb-4">
          <ArrowLeft className="h-4 w-4" />
          返回成员
        </Button>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-baseline gap-2">
            {member.instruments.map((inst) => {
              const meta = INSTRUMENT_META[inst];
              return (
                <span
                  key={inst}
                  className={cn(
                    'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                    meta.badge,
                  )}
                >
                  {meta.label}
                </span>
              );
            })}
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{member.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {totalAssigned > 0 ? `已分配 ${totalAssigned} 首` : '还没有任何分配'}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {instrumentBoards.map(({ key, songs, assignmentByPart }) => {
            const meta = INSTRUMENT_META[key];
            return (
              <Board
                key={key}
                title={meta.label}
                badgeClass={meta.badge}
                count={songs.length}
                isHover={hoverBoard === key}
                canDrop={canDropOn(key)}
                isDragging={dragSong !== null}
                onDragOver={(e) => {
                  if (!canDropOn(key)) return;
                  e.preventDefault();
                  if (hoverBoard !== key) setHoverBoard(key);
                }}
                onDragLeave={() => {
                  if (hoverBoard === key) setHoverBoard(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(key);
                }}
              >
                {songs.length === 0 ? (
                  <EmptySlot />
                ) : (
                  songs.map((s) => {
                    const a = assignmentByPart.get(s.id);
                    return (
                      <SongChip
                        key={s.id}
                        song={s}
                        isEmergency={!!a?.isEmergency}
                        onToggleEmergency={
                          a
                            ? () => updateAssignment({ ...a, isEmergency: !a.isEmergency })
                            : undefined
                        }
                        onRemove={() => {
                          if (a) removeFromInstrumentBoard(a);
                        }}
                      />
                    );
                  })
                )}
              </Board>
            );
          })}

          <Board
            title="作曲"
            badgeClass="bg-violet-100 text-violet-800 border-violet-200"
            count={composerSongs.length}
            isHover={hoverBoard === 'composer'}
            canDrop
            isDragging={dragSong !== null}
            onDragOver={(e) => {
              e.preventDefault();
              if (hoverBoard !== 'composer') setHoverBoard('composer');
            }}
            onDragLeave={() => {
              if (hoverBoard === 'composer') setHoverBoard(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop('composer');
            }}
          >
            {composerSongs.length === 0 ? (
              <EmptySlot />
            ) : (
              composerSongs.map((s) => (
                <SongChip key={s.id} song={s} onRemove={() => removeFromComposer(s)} />
              ))
            )}
          </Board>

          <Board
            title="作词"
            badgeClass="bg-pink-100 text-pink-800 border-pink-200"
            count={lyricistSongs.length}
            isHover={hoverBoard === 'lyricist'}
            canDrop
            isDragging={dragSong !== null}
            onDragOver={(e) => {
              e.preventDefault();
              if (hoverBoard !== 'lyricist') setHoverBoard('lyricist');
            }}
            onDragLeave={() => {
              if (hoverBoard === 'lyricist') setHoverBoard(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop('lyricist');
            }}
          >
            {lyricistSongs.length === 0 ? (
              <EmptySlot />
            ) : (
              lyricistSongs.map((s) => (
                <SongChip key={s.id} song={s} onRemove={() => removeFromLyricist(s)} />
              ))
            )}
          </Board>
        </div>

        {/* Song pool */}
        <div className="sticky bottom-4 mt-6 rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-md backdrop-blur">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              曲目池
            </h3>
            <p className="text-[10px] text-zinc-400">拖到上方板块完成分配</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {songPool.length === 0 ? (
              <p className="text-xs text-zinc-400">还没有曲目。先去歌曲页添加。</p>
            ) : (
              songPool.map((s) => (
                <PoolSongChip
                  key={s.id}
                  song={s}
                  isDragging={dragSongId === s.id}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_MIME, s.id);
                    e.dataTransfer.effectAllowed = 'copy';
                    setDragSongId(s.id);
                  }}
                  onDragEnd={() => {
                    setDragSongId(null);
                    setHoverBoard(null);
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface BoardProps {
  title: string;
  badgeClass: string;
  count: number;
  isHover: boolean;
  canDrop: boolean;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  children: React.ReactNode;
}

function Board({
  title,
  badgeClass,
  count,
  isHover,
  canDrop,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
}: BoardProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'rounded-xl border bg-white shadow-sm transition-all',
        isHover && canDrop ? 'border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900/10' : 'border-zinc-200',
        isDragging && !canDrop && 'opacity-40',
      )}
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2.5">
        <span
          className={cn(
            'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
            badgeClass,
          )}
        >
          {title}
        </span>
        <span className="text-[11px] tabular-nums text-zinc-400">{count}</span>
      </div>
      <div className="min-h-[5.5rem] space-y-1.5 p-2.5">{children}</div>
    </div>
  );
}

function EmptySlot() {
  return (
    <div className="flex h-full min-h-[4rem] items-center justify-center rounded-md border border-dashed border-zinc-200 px-2 text-center text-xs text-zinc-400">
      拖曲目到这里
    </div>
  );
}

function SongChip({
  song,
  isEmergency,
  onToggleEmergency,
  onRemove,
}: {
  song: Song;
  isEmergency?: boolean;
  onToggleEmergency?: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        'group flex items-center justify-between gap-1.5 rounded-md border px-2 py-1.5 text-sm',
        isEmergency ? 'border-amber-200 bg-amber-50' : 'border-zinc-200 bg-white',
      )}
    >
      <button
        type="button"
        onClick={onToggleEmergency}
        disabled={!onToggleEmergency}
        title={
          onToggleEmergency
            ? isEmergency
              ? '点击 → 设为正式'
              : '点击 → 设为替补'
            : undefined
        }
        className="flex min-w-0 flex-1 items-start gap-1.5 text-left disabled:cursor-default"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium">{song.title}</span>
            <span
              className={cn(
                'shrink-0 inline-flex items-center rounded border px-1 py-0 text-[9px] font-medium',
                SONG_STATUS_META[song.status].badge,
              )}
            >
              {SONG_STATUS_META[song.status].label}
            </span>
            {isEmergency && <Zap className="h-3 w-3 shrink-0 text-amber-600" />}
          </div>
          {song.artist && <div className="truncate text-[11px] text-zinc-500">{song.artist}</div>}
        </div>
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="rounded p-0.5 text-zinc-400 opacity-0 hover:bg-zinc-100 hover:text-red-600 group-hover:opacity-100"
        title="删除"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface PoolSongChipProps {
  song: Song;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

function PoolSongChip({ song, isDragging, onDragStart, onDragEnd }: PoolSongChipProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'cursor-grab select-none rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-sm transition-opacity hover:bg-zinc-50 active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
      title={song.artist ? `${song.title} · ${song.artist}` : song.title}
    >
      {song.title}
    </div>
  );
}
