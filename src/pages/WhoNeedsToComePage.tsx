import * as React from 'react';
import { ClipboardList } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { INSTRUMENT_META, INSTRUMENTS } from '@/lib/instruments';
import { SONG_STATUS_META } from '@/lib/songStatus';
import { cn } from '@/lib/utils';
import type { Assignment, Instrument, Member, Song } from '@/types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type InstrumentGroup = 'vocal' | 'drums' | 'guitar' | 'bass' | 'keys';
const GROUP_ORDER: InstrumentGroup[] = ['vocal', 'drums', 'guitar', 'bass', 'keys'];
const GROUP_LABEL: Record<InstrumentGroup, string> = {
  vocal: '主唱', drums: '鼓手', guitar: '吉他手', bass: '贝斯手', keys: '键盘手',
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

interface MemberNeed {
  member: Member;
  /** Songs where this member has a regular (non-emergency) assignment. */
  regularSongs: { song: Song; parts: Instrument[] }[];
  /** Songs where this member only has emergency assignments. */
  emergencySongs: { song: Song; parts: Instrument[] }[];
}

function computeNeeds(
  selectedSongIds: Set<string>,
  songs: Song[],
  members: Member[],
  assignments: Assignment[],
): MemberNeed[] {
  if (selectedSongIds.size === 0) return [];

  const songMap = new Map(songs.map((s) => [s.id, s]));
  const memberMap = new Map(members.map((m) => [m.id, m]));

  // memberId -> { regular: Map<songId, parts[]>, emergency: Map<songId, parts[]> }
  const needMap = new Map<string, {
    regular: Map<string, Instrument[]>;
    emergency: Map<string, Instrument[]>;
  }>();

  for (const a of assignments) {
    if (!selectedSongIds.has(a.songId)) continue;
    if (!needMap.has(a.memberId)) {
      needMap.set(a.memberId, { regular: new Map(), emergency: new Map() });
    }
    const entry = needMap.get(a.memberId)!;
    const bucket = a.isEmergency ? entry.emergency : entry.regular;
    if (!bucket.has(a.songId)) bucket.set(a.songId, []);
    bucket.get(a.songId)!.push(a.part);
  }

  const results: MemberNeed[] = [];
  for (const [memberId, { regular, emergency }] of needMap) {
    const member = memberMap.get(memberId);
    if (!member) continue;
    // Only include if has at least one assignment
    if (regular.size === 0 && emergency.size === 0) continue;

    const regularSongs: MemberNeed['regularSongs'] = [];
    for (const [songId, parts] of regular) {
      const song = songMap.get(songId);
      if (song) regularSongs.push({ song, parts });
    }

    const emergencySongs: MemberNeed['emergencySongs'] = [];
    for (const [songId, parts] of emergency) {
      // Only count as emergency if not also regular for the same song
      if (regular.has(songId)) continue;
      const song = songMap.get(songId);
      if (song) emergencySongs.push({ song, parts });
    }

    results.push({ member, regularSongs, emergencySongs });
  }

  // Sort: most regular songs first
  results.sort((a, b) => b.regularSongs.length - a.regularSongs.length);
  return results;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function WhoNeedsToComePage() {
  const { state } = useApp();
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('band-planner:who-needs-songs');
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch { /* ignore */ }
    return new Set();
  });

  const persistSelection = (ids: Set<string>) => {
    localStorage.setItem('band-planner:who-needs-songs', JSON.stringify([...ids]));
  };

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      persistSelection(next);
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set(activeSongs.map((s) => s.id));
    setSelectedIds(all);
    persistSelection(all);
  };
  const clearAll = () => {
    setSelectedIds(new Set());
    persistSelection(new Set());
  };

  // Only show non-shelved songs
  const activeSongs = React.useMemo(
    () => state.songs.filter((s) => s.status !== 'shelved'),
    [state.songs],
  );

  const needs = React.useMemo(
    () => computeNeeds(selectedIds, state.songs, state.members, state.assignments),
    [selectedIds, state.songs, state.members, state.assignments],
  );

  // Group needs by instrument
  const groupedNeeds = React.useMemo(() => {
    const groups = GROUP_ORDER.map((g) => ({
      group: g,
      label: GROUP_LABEL[g],
      members: [] as MemberNeed[],
    }));
    for (const need of needs) {
      const g = primaryGroupOf(need.member.instruments);
      const bucket = groups.find((x) => x.group === g);
      if (bucket) bucket.members.push(need);
    }
    return groups.filter((g) => g.members.length > 0);
  }, [needs]);

  // Uncovered parts: required parts in selected songs with no assignment at all
  const uncoveredParts = React.useMemo(() => {
    if (selectedIds.size === 0) return [];
    const results: { song: Song; part: Instrument }[] = [];
    for (const songId of selectedIds) {
      const song = state.songs.find((s) => s.id === songId);
      if (!song) continue;
      for (const inst of INSTRUMENTS) {
        const required = song.requiredParts.filter((p) => p === inst).length;
        if (required === 0) continue;
        const assigned = state.assignments.filter(
          (a) => a.songId === songId && a.part === inst,
        ).length;
        if (assigned < required) {
          for (let i = 0; i < required - assigned; i++) {
            results.push({ song, part: inst });
          }
        }
      }
    }
    return results;
  }, [selectedIds, state.songs, state.assignments]);

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold text-zinc-900">谁需要到场</h1>
        <p className="text-sm text-zinc-500 mt-1">选几首歌，看看需要哪些人</p>

        {/* Song picker */}
        <div className="mt-5">
          <div className="flex items-center gap-3 mb-2">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">选择曲目</p>
            <button type="button" onClick={selectAll} className="text-xs text-zinc-400 hover:text-zinc-600">全选</button>
            <button type="button" onClick={clearAll} className="text-xs text-zinc-400 hover:text-zinc-600">清空</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeSongs.map((song) => {
              const selected = selectedIds.has(song.id);
              const meta = SONG_STATUS_META[song.status];
              return (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => toggle(song.id)}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                    selected
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50',
                  )}
                >
                  {song.title}
                  {!selected && (
                    <span className={cn('ml-1.5 inline-block rounded px-1 py-0.5 text-[10px] border', meta.badge)}>
                      {meta.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results */}
        {selectedIds.size === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-10 w-10 text-zinc-300 mb-3" />
            <p className="text-sm text-zinc-500">选几首歌看看谁需要到场</p>
          </div>
        ) : (
          <div className="mt-6">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">
              需要到场 ({needs.length} 人)
            </p>

            <div className="space-y-4">
              {groupedNeeds.map(({ group, label, members: grpNeeds }) => (
                <div key={group}>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{label}</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {grpNeeds.map(({ member, regularSongs, emergencySongs }) => (
                      <div
                        key={member.id}
                        className="rounded-lg border border-zinc-200 bg-white p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-zinc-900">{member.name}</p>
                          <span className="text-xs text-zinc-400">
                            {member.instruments.map((i) => INSTRUMENT_META[i].abbrev).join('/')}
                          </span>
                        </div>

                        {regularSongs.length > 0 && (
                          <div className="space-y-0.5">
                            {regularSongs.map(({ song, parts }) => (
                              <div key={song.id} className="flex items-center gap-1.5 text-xs">
                                <span className="text-zinc-800 truncate">{song.title}</span>
                                <span className="shrink-0 text-zinc-400">
                                  {parts.map((p) => INSTRUMENT_META[p].abbrev).join('+')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {emergencySongs.length > 0 && (
                          <div className="mt-1.5 border-t border-zinc-100 pt-1.5">
                            <p className="text-[10px] text-amber-500 font-medium mb-0.5">替补</p>
                            {emergencySongs.map(({ song, parts }) => (
                              <div key={song.id} className="flex items-center gap-1.5 text-xs text-zinc-400">
                                <span className="truncate">{song.title}</span>
                                <span className="shrink-0">
                                  {parts.map((p) => INSTRUMENT_META[p].abbrev).join('+')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Uncovered parts warning */}
            {uncoveredParts.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-700 mb-1">未分配的 part</p>
                <div className="flex flex-wrap gap-1.5">
                  {uncoveredParts.map(({ song, part }, i) => (
                    <span key={`${song.id}-${part}-${i}`} className="inline-flex items-center gap-1 rounded bg-white border border-amber-200 px-2 py-0.5 text-xs text-amber-800">
                      {song.title}
                      <span className={cn('rounded px-0.5 text-[10px] font-bold', INSTRUMENT_META[part].badge)}>
                        {INSTRUMENT_META[part].abbrev}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
