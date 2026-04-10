import * as React from 'react';
import { Users, Zap } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { cn } from '@/lib/utils';
import { INSTRUMENT_META } from '@/lib/instruments';
import type { Assignment, AssignmentStatus, Instrument, Member, Song } from '@/types';

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

interface CardData {
  assignment: Assignment;
  song: Song;
}

const SECTIONS: { key: AssignmentStatus; label: string; tint: string; dropTint: string }[] = [
  { key: 'want', label: '可以练', tint: 'bg-zinc-50', dropTint: 'ring-zinc-300' },
  { key: 'practicing', label: '在练', tint: 'bg-amber-50', dropTint: 'ring-amber-300' },
  { key: 'mastered', label: '练好了', tint: 'bg-sky-50', dropTint: 'ring-sky-300' },
];

const DRAG_MIME = 'application/x-band-planner-assignment';
const statusOf = (a: Assignment): AssignmentStatus => a.status ?? 'want';

/* Instrument grouping for the column layout. */
type InstrumentGroup = 'vocal' | 'drums' | 'guitar' | 'bass' | 'keys';
const GROUP_ORDER: InstrumentGroup[] = ['vocal', 'drums', 'guitar', 'bass', 'keys'];
const GROUP_LABEL: Record<InstrumentGroup, string> = {
  vocal: '主唱',
  drums: '鼓手',
  guitar: '吉他手',
  bass: '贝斯手',
  keys: '键盘手',
};

function instrumentToGroup(inst: Instrument): InstrumentGroup {
  if (inst === 'vocal') return 'vocal';
  if (inst === 'drums') return 'drums';
  if (inst === 'guitar_lead' || inst === 'guitar_rhythm') return 'guitar';
  if (inst === 'bass') return 'bass';
  return 'keys';
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

interface MemberSongsPageProps {
  onSelectMember?: (id: string) => void;
}

export default function MemberSongsPage({ onSelectMember }: MemberSongsPageProps = {}) {
  const { state, updateAssignment } = useApp();
  const [dragId, setDragId] = React.useState<string | null>(null);

  const songById = React.useMemo(
    () => new Map(state.songs.map((s) => [s.id, s])),
    [state.songs],
  );

  const cardsByMember = React.useMemo(() => {
    const map = new Map<string, CardData[]>();
    for (const m of state.members) map.set(m.id, []);
    for (const a of state.assignments) {
      const song = songById.get(a.songId);
      if (!song) continue;
      if (!map.has(a.memberId)) map.set(a.memberId, []);
      map.get(a.memberId)!.push({ assignment: a, song });
    }
    for (const [, arr] of map) arr.sort((x, y) => x.song.title.localeCompare(y.song.title));
    return map;
  }, [state.members, state.assignments, songById]);

  const handleDrop = (memberId: string, target: AssignmentStatus) => {
    if (!dragId) return;
    const a = state.assignments.find((x) => x.id === dragId);
    setDragId(null);
    if (!a || a.memberId !== memberId || statusOf(a) === target) return;
    updateAssignment({ ...a, status: target });
  };

  // Group members by instrument role, in GROUP_ORDER.
  const groupedMembers = React.useMemo(() => {
    const groups: { group: InstrumentGroup; members: Member[] }[] =
      GROUP_ORDER.map((g) => ({ group: g, members: [] }));
    const placed = new Set<string>();

    for (const { group, members: bucket } of groups) {
      for (const m of state.members) {
        if (placed.has(m.id)) continue;
        if (!m.instruments[0]) continue;
        const primary = instrumentToGroup(m.instruments[0]);
        if (primary === group) {
          bucket.push(m);
          placed.add(m.id);
        }
      }
      bucket.sort((a, b) => a.name.localeCompare(b.name));
    }
    // Anyone not placed (no instruments) goes at the end.
    const unplaced = state.members.filter((m) => !placed.has(m.id));
    if (unplaced.length > 0) groups.push({ group: 'keys' as InstrumentGroup, members: unplaced });

    return groups.filter((g) => g.members.length > 0);
  }, [state.members]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto px-4 py-5">
        <div className="px-2">
          <h1 className="text-2xl font-semibold tracking-tight">成员曲目</h1>
          <p className="text-sm text-zinc-500 mt-1">拖拽切状态，点击切替补</p>
        </div>

        {state.members.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center">
            <Users className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
            <p className="text-sm font-medium text-zinc-900">还没有成员</p>
            <p className="text-xs text-zinc-500 mt-1">先去成员页添加几个人</p>
          </div>
        ) : (
          <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
            {groupedMembers.map(({ group, members }) => (
              <div key={group} className="flex gap-2">
                {/* Group label — vertical text */}
                <div className="flex w-5 shrink-0 items-start justify-center pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300" style={{ writingMode: 'vertical-rl' }}>
                    {GROUP_LABEL[group]}
                  </span>
                </div>
                {members.map((m) => (
                  <MemberColumn
                    key={m.id}
                    member={m}
                    cards={cardsByMember.get(m.id) ?? []}
                    dragId={dragId}
                    onDragStart={setDragId}
                    onDragEnd={() => setDragId(null)}
                    onDrop={handleDrop}
                    onToggleEmergency={(a) => updateAssignment({ ...a, isEmergency: !a.isEmergency })}
                    onSelectMember={onSelectMember}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  One column per member                                              */
/* ------------------------------------------------------------------ */

interface MemberColumnProps {
  member: Member;
  cards: CardData[];
  dragId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (memberId: string, target: AssignmentStatus) => void;
  onToggleEmergency: (a: Assignment) => void;
  onSelectMember?: (id: string) => void;
}

function MemberColumn({
  member, cards, dragId, onDragStart, onDragEnd, onDrop, onToggleEmergency, onSelectMember,
}: MemberColumnProps) {
  const byStatus: Record<AssignmentStatus, CardData[]> = { want: [], practicing: [], mastered: [] };
  for (const c of cards) byStatus[statusOf(c.assignment)].push(c);

  const instruments = member.instruments.map((i) => INSTRUMENT_META[i].abbrev).join('/');

  return (
    <div className="flex w-44 shrink-0 flex-col rounded-xl border border-zinc-200 bg-white shadow-sm">
      {/* Member header */}
      <button
        type="button"
        onClick={onSelectMember ? () => onSelectMember(member.id) : undefined}
        className={cn(
          'border-b border-zinc-100 px-3 py-2 text-left',
          onSelectMember && 'hover:bg-zinc-50 cursor-pointer',
        )}
      >
        <p className="text-sm font-semibold text-zinc-900 truncate">{member.name}</p>
        <p className="text-[10px] text-zinc-400">{instruments} · {cards.length} 首</p>
      </button>

      {/* 3 stacked sections */}
      <div className="flex flex-1 flex-col gap-1 p-1.5">
        {SECTIONS.map((sec) => (
          <StatusSection
            key={sec.key}
            section={sec}
            cards={byStatus[sec.key]}
            memberId={member.id}
            dragId={dragId}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDrop={onDrop}
            onToggleEmergency={onToggleEmergency}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status section within a member column                              */
/* ------------------------------------------------------------------ */

interface StatusSectionProps {
  section: typeof SECTIONS[number];
  cards: CardData[];
  memberId: string;
  dragId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (memberId: string, target: AssignmentStatus) => void;
  onToggleEmergency: (a: Assignment) => void;
}

function StatusSection({ section, cards, memberId, dragId, onDragStart, onDragEnd, onDrop, onToggleEmergency }: StatusSectionProps) {
  const [isOver, setIsOver] = React.useState(false);

  return (
    <div
      className={cn(
        'rounded-md border p-1 transition-all min-h-[2rem]',
        section.tint,
        isOver && `ring-2 ${section.dropTint}`,
      )}
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsOver(false); onDrop(memberId, section.key); }}
    >
      <div className="flex items-center justify-between px-1 mb-0.5">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">{section.label}</span>
        {cards.length > 0 && <span className="text-[9px] text-zinc-400">{cards.length}</span>}
      </div>
      <div className="space-y-0.5">
        {cards.length === 0 ? (
          <div className="rounded border border-dashed border-zinc-200/60 bg-white/40 py-1 text-center text-[9px] text-zinc-300">
            {isOver ? '放这里' : '—'}
          </div>
        ) : (
          cards.map((c) => (
            <Pill
              key={c.assignment.id}
              card={c}
              isDragging={dragId === c.assignment.id}
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_MIME, c.assignment.id);
                e.dataTransfer.effectAllowed = 'move';
                onDragStart(c.assignment.id);
              }}
              onDragEnd={onDragEnd}
              onToggleEmergency={() => onToggleEmergency(c.assignment)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pill                                                               */
/* ------------------------------------------------------------------ */

interface PillProps {
  card: CardData;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onToggleEmergency: () => void;
}

function Pill({ card, isDragging, onDragStart, onDragEnd, onToggleEmergency }: PillProps) {
  const partMeta = INSTRUMENT_META[card.assignment.part];
  const emergency = card.assignment.isEmergency;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onToggleEmergency}
      title={`${card.song.title}${card.song.artist ? ` — ${card.song.artist}` : ''}\n${partMeta.label}${emergency ? ' (替补)' : ''}\n点击切换替补`}
      className={cn(
        'flex cursor-grab items-center gap-1 rounded border px-1.5 py-0.5 transition-opacity active:cursor-grabbing',
        emergency
          ? 'border-amber-200 bg-amber-50'
          : 'border-zinc-200 bg-white',
        isDragging && 'opacity-40',
      )}
    >
      <span className={cn('shrink-0 rounded px-0.5 text-[7px] font-bold leading-none', partMeta.badge)}>
        {partMeta.abbrev}
      </span>
      <span className="truncate text-[11px] leading-tight text-zinc-800">{card.song.title}</span>
      {emergency && <Zap className="h-2.5 w-2.5 shrink-0 text-amber-600" />}
    </div>
  );
}
