import * as React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useApp } from '@/store/AppContext';
import { cn } from '@/lib/utils';
import type { Rehearsal } from '@/types';

export default function RehearsalHistoryPage() {
  const { state, deleteRehearsal, updateRehearsal } = useApp();
  const [pendingDelete, setPendingDelete] = React.useState<Rehearsal | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const sorted = React.useMemo(
    () =>
      [...state.rehearsals].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.createdAt < b.createdAt ? 1 : -1;
      }),
    [state.rehearsals],
  );

  const memberName = (id: string) => state.members.find((m) => m.id === id)?.name ?? '(已删除)';
  const songTitle = (id: string) => state.songs.find((s) => s.id === id)?.title ?? '(已删除)';

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-4xl p-6">
        <div>
          <h1 className="text-2xl font-semibold">排练历史</h1>
          <p className="text-sm text-zinc-500 mt-1">已保存的排练记录</p>
        </div>

        <div className="mt-6">
          {sorted.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 bg-white py-16 text-center">
              <p className="text-sm font-medium text-zinc-900">还没有排练记录</p>
              <p className="text-xs text-zinc-500 mt-1">在「排练规划」页保存今天的排练后会出现在这里</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {sorted.map((r) =>
                editingId === r.id ? (
                  <li key={r.id}>
                    <RehearsalEditCard
                      rehearsal={r}
                      onSave={(updated) => { updateRehearsal(updated); setEditingId(null); }}
                      onCancel={() => setEditingId(null)}
                    />
                  </li>
                ) : (
                  <li
                    key={r.id}
                    className="rounded-lg border border-zinc-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-zinc-900">{r.date}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {r.attendingMemberIds.length} 人 · {r.selectedSongIds.length} 首
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingId(r.id)}
                        >
                          <Pencil className="h-4 w-4 text-zinc-400" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setPendingDelete(r)}
                        >
                          <Trash2 className="h-4 w-4 text-zinc-400" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2 text-xs">
                      <div>
                        <p className="text-zinc-500 mb-1">到场</p>
                        <div className="flex flex-wrap gap-1">
                          {r.attendingMemberIds.length === 0 ? (
                            <span className="text-zinc-400">—</span>
                          ) : (
                            r.attendingMemberIds.map((id) => (
                              <span
                                key={id}
                                className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-zinc-700"
                              >
                                {memberName(id)}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-zinc-500 mb-1">曲目</p>
                        <div className="flex flex-wrap gap-1">
                          {r.selectedSongIds.length === 0 ? (
                            <span className="text-zinc-400">—</span>
                          ) : (
                            r.selectedSongIds.map((id) => (
                              <span
                                key={id}
                                className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-zinc-700"
                              >
                                {songTitle(id)}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                      {r.notes && (
                        <div>
                          <p className="text-zinc-500 mb-1">备注</p>
                          <p className="whitespace-pre-wrap text-zinc-700">{r.notes}</p>
                        </div>
                      )}
                    </div>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="删除这条排练记录？"
        description={pendingDelete ? `${pendingDelete.date} 的记录将被永久删除` : undefined}
        onConfirm={() => {
          if (pendingDelete) deleteRehearsal(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

/* ---------- Edit card ---------- */

function RehearsalEditCard({
  rehearsal,
  onSave,
  onCancel,
}: {
  rehearsal: Rehearsal;
  onSave: (r: Rehearsal) => void;
  onCancel: () => void;
}) {
  const { state } = useApp();
  const [date, setDate] = React.useState(rehearsal.date);
  const [attendingIds, setAttendingIds] = React.useState<Set<string>>(
    () => new Set(rehearsal.attendingMemberIds),
  );
  const [selectedSongIds, setSelectedSongIds] = React.useState<Set<string>>(
    () => new Set(rehearsal.selectedSongIds),
  );
  const [notes, setNotes] = React.useState(rehearsal.notes ?? '');

  const toggleMember = (id: string) => {
    setAttendingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSong = (id: string) => {
    setSelectedSongIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    onSave({
      ...rehearsal,
      date,
      attendingMemberIds: [...attendingIds],
      selectedSongIds: [...selectedSongIds],
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="rounded-lg border-2 border-zinc-400 bg-white p-4">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">日期</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">
            到场 ({attendingIds.size} 人)
          </label>
          <div className="flex flex-wrap gap-1">
            {state.members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMember(m.id)}
                className={cn(
                  'rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
                  attendingIds.has(m.id)
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-500 hover:border-zinc-300',
                )}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">
            曲目 ({selectedSongIds.size} 首)
          </label>
          <div className="flex flex-wrap gap-1">
            {state.songs.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSong(s.id)}
                className={cn(
                  'rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
                  selectedSongIds.has(s.id)
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300',
                )}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">备注</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="排练备注（可选）"
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none resize-none"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" onClick={handleSave}>
          保存
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancel}>
          取消
        </Button>
      </div>
    </div>
  );
}
