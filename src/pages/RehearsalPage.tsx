import * as React from 'react';
import { CheckCircle2, HelpCircle, Save, Zap } from 'lucide-react';
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
import type { Song } from '@/types';

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
  const [date, setDate] = React.useState(() => toLocalDateString(new Date()));

  // Recompute attendance when the user picks a new date: include all members
  // whose availability for that date is NOT 'unavailable' (so 'available',
  // 'tentative', or unspecified all count). This trampes manual edits — that's
  // intentional, the date picker is the "reset to suggestion" button.
  const handleDateChange = (next: string) => {
    setDate(next);
    const suggested = new Set<string>();
    for (const m of state.members) {
      const av = state.availability.find(
        (a) => a.memberId === m.id && a.date === next,
      );
      if (av?.status !== 'unavailable') suggested.add(m.id);
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

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">排练规划</h1>
            <p className="text-sm text-zinc-500 mt-1">
              选日期 → 出勤会按 availability 预填，勾上下能排哪些歌
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-40"
            />
            <Button
              type="button"
              variant="default"
              disabled={!canSave}
              onClick={() => setSaveOpen(true)}
            >
              <Save className="mr-1 h-4 w-4" />
              保存
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <AttendanceBar attendingIds={attendingIds} onChange={onAttendingChange} />
        </div>

        <div className="mt-6">
          {attendingIds.size === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 bg-white py-16 text-center">
              <p className="text-sm font-medium text-zinc-900">还没勾选到场的人</p>
              <p className="text-xs text-zinc-500 mt-1">
                在上方勾选今天到场的成员，A / B / C 三栏会自动算出来
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <BucketColumn
                bucket="A"
                title="A · 完整阵容"
                description="所有 part 都有正式分配的人到场"
                songs={plan.A}
                attendingIds={attendingIds}
                onSelect={onSelectSong}
              />
              <BucketColumn
                bucket="B"
                title="B · 替补阵容"
                description="有 part 只能靠替补补位，但全覆盖了"
                songs={plan.B}
                attendingIds={attendingIds}
                onSelect={onSelectSong}
              />
              <BucketColumn
                bucket="C"
                title="C · 还差一点"
                description="还缺 1-2 个 part 没人能补"
                songs={plan.C}
                attendingIds={attendingIds}
                onSelect={onSelectSong}
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

interface BucketColumnProps {
  bucket: Bucket;
  title: string;
  description: string;
  songs: Song[];
  attendingIds: Set<string>;
  onSelect: (id: string) => void;
}

function BucketColumn({ bucket, title, description, songs, attendingIds, onSelect }: BucketColumnProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold">{title}</p>
          <span className="text-xs text-zinc-500">{songs.length}</span>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>

      {songs.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-zinc-400">暂无</p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {songs.map((song) => (
            <li key={song.id}>
              <SongCard song={song} bucket={bucket} attendingIds={attendingIds} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface SongCardProps {
  song: Song;
  bucket: Bucket;
  attendingIds: Set<string>;
  onSelect: (id: string) => void;
}

function SongCard({ song, bucket, attendingIds, onSelect }: SongCardProps) {
  const { state } = useApp();
  const memberName = (id: string) => state.members.find((m) => m.id === id)?.name ?? '?';

  // For each unique part in requiredParts, list the present assignments.
  // We don't try to show "this person is on slot 1, that person on slot 2"
  // because the planner doesn't expose that — and it doesn't matter to a human.
  const uniqueParts = INSTRUMENTS.filter((p) => song.requiredParts.includes(p));

  return (
    <button
      type="button"
      onClick={() => onSelect(song.id)}
      className="block w-full px-4 py-3 text-left hover:bg-zinc-50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900">{song.title}</p>
          {song.artist && (
            <p className="truncate text-xs text-zinc-500 mt-0.5">{song.artist}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <BucketBadge bucket={bucket} />
          <span
            className={cn(
              'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
              SONG_STATUS_META[song.status].badge,
            )}
          >
            {SONG_STATUS_META[song.status].label}
          </span>
        </div>
      </div>

      <div className="mt-2 space-y-1">
        {uniqueParts.map((part) => {
          const meta = INSTRUMENT_META[part];
          const present = presentAssignmentsForPart(song.id, part, state.assignments, attendingIds);
          const required = song.requiredParts.filter((p) => p === part).length;
          const covered = Math.min(present.length, required);
          const missing = required - covered;
          return (
            <div key={part} className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  'inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
                  meta.badge,
                )}
              >
                {meta.abbrev}
              </span>
              {present.length === 0 ? (
                <span className="text-red-600">缺{required > 1 ? ` ×${required}` : ''}</span>
              ) : (
                <span className="text-zinc-700">
                  {present.map((a, i) => (
                    <span key={a.id}>
                      {i > 0 && '、'}
                      {memberName(a.memberId)}
                      {a.isEmergency && <Zap className="inline h-3 w-3 text-amber-600 ml-0.5" />}
                    </span>
                  ))}
                  {missing > 0 && <span className="text-red-600 ml-1">还缺 {missing}</span>}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </button>
  );
}

function BucketBadge({ bucket }: { bucket: Bucket }) {
  if (bucket === 'A') {
    return (
      <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
      </span>
    );
  }
  if (bucket === 'B') {
    return (
      <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
        <Zap className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
      <HelpCircle className="h-3 w-3" />
    </span>
  );
}
