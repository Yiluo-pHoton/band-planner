import * as React from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MemberFormDialog } from '@/components/MemberFormDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useApp } from '@/store/AppContext';
import { INSTRUMENT_META } from '@/lib/instruments';
import { cn } from '@/lib/utils';
import type { Member } from '@/types';

export default function MembersPage() {
  const { state, addMember, updateMember, deleteMember } = useApp();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Member | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<Member | undefined>(undefined);

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

  const members = state.members;
  const assignmentCount = (memberId: string) =>
    state.assignments.filter((a) => a.memberId === memberId).length;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-4xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">成员</h1>
            <p className="text-sm text-zinc-500 mt-1">乐队成员与他们能演奏的乐器</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            添加成员
          </Button>
        </div>

        <div className="mt-6">
          {members.length === 0 ? (
            <EmptyState onAdd={openCreate} />
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <table className="w-full">
                <thead className="bg-zinc-50">
                  <tr className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-2 text-left">姓名</th>
                    <th className="px-4 py-2 text-left">能演奏</th>
                    <th className="px-4 py-2 text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {members.map((m) => (
                    <tr key={m.id} className="group text-sm hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium text-zinc-900">{m.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {m.instruments.map((inst) => {
                            const meta = INSTRUMENT_META[inst];
                            return (
                              <span
                                key={inst}
                                className={cn(
                                  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                                  meta.badge,
                                )}
                                title={meta.label}
                              >
                                {meta.abbrev}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(m)}>
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-white py-16 text-center">
      <Users className="h-10 w-10 text-zinc-300 mb-3" />
      <p className="text-sm font-medium text-zinc-900">还没有成员</p>
      <p className="text-xs text-zinc-500 mt-1 mb-4">把乐队成员加进来才能开始排歌</p>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4" />
        添加第一个成员
      </Button>
    </div>
  );
}
