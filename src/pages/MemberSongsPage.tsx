import * as React from 'react';
import { Users, Zap } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { cn } from '@/lib/utils';
import { INSTRUMENT_META, INSTRUMENTS } from '@/lib/instruments';
import type { Assignment, AssignmentStatus, Member, Song } from '@/types';

interface CardData {
  assignment: Assignment;
  song: Song;
}

const COLUMNS: { key: AssignmentStatus; label: string; tint: string }[] = [
  { key: 'want', label: '可以练', tint: 'bg-zinc-50 border-zinc-200' },
  { key: 'practicing', label: '在练', tint: 'bg-amber-50 border-amber-200' },
  { key: 'mastered', label: '练好了', tint: 'bg-sky-50 border-sky-200' },
];

const DRAG_MIME = 'application/x-band-planner-assignment';

const statusOf = (a: Assignment): AssignmentStatus => a.status ?? 'want';

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

  // Group assignments by member id, with the resolved song attached.
  const cardsByMember = React.useMemo(() => {
    const map = new Map<string, CardData[]>();
    for (const m of state.members) map.set(m.id, []);
    for (const a of state.assignments) {
      const song = songById.get(a.songId);
      if (!song) continue;
      if (!map.has(a.memberId)) map.set(a.memberId, []);
      map.get(a.memberId)!.push({ assignment: a, song });
    }
    // Stable sort within each member by song title.
    for (const [, arr] of map) {
      arr.sort((x, y) => x.song.title.localeCompare(y.song.title));
    }
    return map;
  }, [state.members, state.assignments, songById]);

  const handleDrop = (memberId: string, target: AssignmentStatus) => {
    if (!dragId) return;
    const a = state.assignments.find((x) => x.id === dragId);
    setDragId(null);
    if (!a) return;
    if (a.memberId !== memberId) return; // only allow drops within the same member's board
    if (statusOf(a) === target) return;
    updateAssignment({ ...a, status: target });
  };

  // Sort boards by primary instrument (first entry of member.instruments) in
  // canonical INSTRUMENTS order; members with no instrument go last; ties broken
  // by name.
  const sortedMembers = React.useMemo(() => {
    const rank = (m: Member) => {
      const first = m.instruments[0];
      const idx = first ? INSTRUMENTS.indexOf(first) : -1;
      return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
    };
    return [...state.members].sort((a, b) => {
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      return a.name.localeCompare(b.name);
    });
  }, [state.members]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-semibold">成员曲目</h1>
        <p className="text-sm text-zinc-500 mt-1">
          每个成员一块板。拖拽卡片在「想练 / 在练 / 可以排」之间移动。
        </p>

        {sortedMembers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-6 space-y-3">
            {sortedMembers.map((m) => (
              <MemberBoard
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
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-zinc-200 bg-white py-16 text-center">
      <Users className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
      <p className="text-sm font-medium text-zinc-900">还没有成员</p>
      <p className="text-xs text-zinc-500 mt-1">先去成员页添加几个人</p>
    </div>
  );
}

interface MemberBoardProps {
  member: Member;
  cards: CardData[];
  dragId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (memberId: string, target: AssignmentStatus) => void;
  onToggleEmergency: (a: Assignment) => void;
  onSelectMember?: (id: string) => void;
}

function MemberBoard({ member, cards, dragId, onDragStart, onDragEnd, onDrop, onToggleEmergency, onSelectMember }: MemberBoardProps) {
  const byStatus: Record<AssignmentStatus, CardData[]> = {
    want: [],
    practicing: [],
    mastered: [],
  };
  for (const c of cards) byStatus[statusOf(c.assignment)].push(c);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white">
      <header
        onClick={onSelectMember ? () => onSelectMember(member.id) : undefined}
        className={cn(
          'flex items-center justify-between border-b border-zinc-100 px-3 py-1.5',
          onSelectMember && 'cursor-pointer hover:bg-zinc-50',
        )}
      >
        <h2
          className={cn(
            'text-sm font-semibold text-zinc-900',
            onSelectMember && 'group-hover:underline',
          )}
        >
          {member.name}
        </h2>
        <span className="text-xs text-zinc-500">{cards.length} 首</span>
      </header>
      <div className="grid grid-cols-1 gap-2 p-2 md:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => (
          <Column
            key={col.key}
            label={col.label}
            tint={col.tint}
            cards={byStatus[col.key]}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onDrop(member.id, col.key);
            }}
            renderCard={(c) => (
              <Card
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
            )}
          />
        ))}
      </div>
    </section>
  );
}

interface ColumnProps {
  label: string;
  tint: string;
  cards: CardData[];
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  renderCard: (c: CardData) => React.ReactNode;
}

function Column({ label, tint, cards, onDragOver, onDrop, renderCard }: ColumnProps) {
  return (
    <div
      className={cn('rounded-md border p-1.5 min-h-[4rem]', tint)}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </span>
        <span className="text-[10px] text-zinc-400">{cards.length}</span>
      </div>
      <div className="space-y-1">
        {cards.length === 0 ? (
          <div className="rounded border border-dashed border-zinc-200 bg-white/50 px-2 py-2 text-center text-[10px] text-zinc-300">
            拖到这里
          </div>
        ) : (
          cards.map((c) => renderCard(c))
        )}
      </div>
    </div>
  );
}

interface CardProps {
  card: CardData;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onToggleEmergency: () => void;
}

function Card({ card, isDragging, onDragStart, onDragEnd, onToggleEmergency }: CardProps) {
  const partMeta = INSTRUMENT_META[card.assignment.part];
  const emergency = card.assignment.isEmergency;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onToggleEmergency}
      title={emergency ? '点击 → 设为正式' : '点击 → 设为替补'}
      className={cn(
        'cursor-grab rounded border px-1.5 py-1 shadow-sm transition-opacity active:cursor-grabbing',
        emergency ? 'border-amber-200 bg-amber-50' : 'border-zinc-200 bg-white',
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium leading-tight text-zinc-900">
            {card.song.title}
          </div>
          {card.song.artist && (
            <div className="truncate text-[10px] leading-tight text-zinc-500">{card.song.artist}</div>
          )}
        </div>
        <span
          className={cn(
            'shrink-0 rounded border px-1 py-0 text-[9px] font-medium',
            partMeta.badge,
          )}
        >
          {partMeta.abbrev}
        </span>
      </div>
      {emergency && (
        <div className="mt-1 flex items-center gap-0.5 text-[10px] font-medium text-amber-700">
          <Zap className="h-3 w-3" />
          应急
        </div>
      )}
    </div>
  );
}
