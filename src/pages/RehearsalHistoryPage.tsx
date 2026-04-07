import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useApp } from '@/store/AppContext';
import type { Rehearsal } from '@/types';

export default function RehearsalHistoryPage() {
  const { state, deleteRehearsal } = useApp();
  const [pendingDelete, setPendingDelete] = React.useState<Rehearsal | null>(null);

  // Newest first by date, then by createdAt as tiebreaker.
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
              {sorted.map((r) => (
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setPendingDelete(r)}
                    >
                      <Trash2 className="h-4 w-4 text-zinc-400" />
                    </Button>
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
              ))}
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
