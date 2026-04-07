import * as React from 'react';
import { Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MemberFormDialog } from '@/components/MemberFormDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useApp } from '@/store/AppContext';
import { INSTRUMENTS, INSTRUMENT_META } from '@/lib/instruments';
import { cn } from '@/lib/utils';
import type { Instrument, Member } from '@/types';

const DRAG_MIME = 'application/x-band-planner-member';

export default function MembersPage() {
  const { state, addMember, updateMember, deleteMember } = useApp();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Member | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<Member | undefined>(undefined);
  const [dragOver, setDragOver] = React.useState<Instrument | null>(null);

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = (m: Member) => {
    setEditing(m);
    setFormOpen(true);
  };

  const handleSubmit = (m: Member) => {
    if (editing) updateMember(m);
    else addMember(m);
  };

  const assignmentCount = (memberId: string) =>
    state.assignments.filter((a) => a.memberId === memberId).length;

  const addInstrumentToMember = (memberId: string, inst: Instrument) => {
    const m = state.members.find((x) => x.id === memberId);
    if (!m) return;
    if (m.instruments.includes(inst)) return; // already on this board
    updateMember({ ...m, instruments: [...m.instruments, inst] });
  };

  const removeInstrumentFromMember = (memberId: string, inst: Instrument) => {
    const m = state.members.find((x) => x.id === memberId);
    if (!m) return;
    updateMember({ ...m, instruments: m.instruments.filter((i) => i !== inst) });
  };

  const handleDragStart = (e: React.DragEvent, memberId: string) => {
    e.dataTransfer.setData(DRAG_MIME, memberId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleBoardDragOver = (e: React.DragEvent, inst: Instrument) => {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOver !== inst) setDragOver(inst);
  };

  const handleBoardDrop = (e: React.DragEvent, inst: Instrument) => {
    e.preventDefault();
    const memberId = e.dataTransfer.getData(DRAG_MIME);
    setDragOver(null);
    if (memberId) addInstrumentToMember(memberId, inst);
  };

  const members = state.members;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">成员</h1>
            <p className="text-sm text-zinc-500 mt-1">
              把下面的成员卡片拖到对应的乐器看板上。同一个人可以拖到多个看板。
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            添加成员
          </Button>
        </div>

        {members.length === 0 ? (
          <div className="mt-6">
            <EmptyState onAdd={openCreate} />
          </div>
        ) : (
          <>
            {/* Instrument boards */}
            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {INSTRUMENTS.map((inst) => {
                const meta = INSTRUMENT_META[inst];
                const here = members.filter((m) => m.instruments.includes(inst));
                const isOver = dragOver === inst;
                return (
                  <div
                    key={inst}
                    onDragOver={(e) => handleBoardDragOver(e, inst)}
                    onDragLeave={() => setDragOver((cur) => (cur === inst ? null : cur))}
                    onDrop={(e) => handleBoardDrop(e, inst)}
                    className={cn(
                      'rounded-lg border bg-white transition-colors',
                      isOver ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200',
                    )}
                  >
                    <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                            meta.badge,
                          )}
                        >
                          {meta.abbrev}
                        </span>
                        <span className="text-sm font-medium text-zinc-900">{meta.label}</span>
                      </div>
                      <span className="text-xs text-zinc-400">{here.length}</span>
                    </div>
                    <div className="min-h-[80px] p-2">
                      {here.length === 0 ? (
                        <p className="px-2 py-4 text-center text-xs text-zinc-400">
                          拖成员到这里
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {here.map((m) => (
                            <BoardChip
                              key={m.id}
                              member={m}
                              onRemove={() => removeInstrumentFromMember(m.id, inst)}
                              onDragStart={(e) => handleDragStart(e, m.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Member pool */}
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  全部成员 ({members.length})
                </p>
                <p className="text-xs text-zinc-400">点击编辑 · 拖到上方分配乐器</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3">
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => (
                    <PoolCard
                      key={m.id}
                      member={m}
                      onEdit={() => openEdit(m)}
                      onDelete={() => setDeleteTarget(m)}
                      onDragStart={(e) => handleDragStart(e, m.id)}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={openCreate}
                    className="flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-900"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    添加成员
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <MemberFormDialog
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
        title={`删除「${deleteTarget?.name ?? ''}」？`}
        description={
          deleteTarget
            ? `此操作不可撤销。该成员的 ${assignmentCount(deleteTarget.id)} 条 assignment 和所有出勤记录会被一并删除。`
            : undefined
        }
        onConfirm={() => {
          if (deleteTarget) deleteMember(deleteTarget.id);
        }}
      />
    </div>
  );
}

interface BoardChipProps {
  member: Member;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
}

function BoardChip({ member, onRemove, onDragStart }: BoardChipProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 shadow-sm hover:border-zinc-300 cursor-grab active:cursor-grabbing"
    >
      <span>{member.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 flex h-4 w-4 items-center justify-center rounded text-zinc-400 opacity-0 hover:bg-zinc-100 hover:text-zinc-700 group-hover:opacity-100"
        title="从这个乐器移除"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

interface PoolCardProps {
  member: Member;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
}

function PoolCard({ member, onEdit, onDelete, onDragStart }: PoolCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group relative flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm hover:border-zinc-300 cursor-grab active:cursor-grabbing"
    >
      <span className="font-medium text-zinc-900">{member.name}</span>
      <span className="text-xs text-zinc-400">· {member.instruments.length}</span>
      <div className="ml-1 flex opacity-0 group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-red-600"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-white py-16 text-center">
      <Users className="h-10 w-10 text-zinc-300 mb-3" />
      <p className="text-sm font-medium text-zinc-900">还没有成员</p>
      <p className="text-xs text-zinc-500 mt-1 mb-4">先添加成员，再把卡片拖到乐器看板</p>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4" />
        添加第一个成员
      </Button>
    </div>
  );
}
