import * as React from 'react';
import { Check, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useApp } from '@/store/AppContext';
import { INSTRUMENT_META } from '@/lib/instruments';
import { cn } from '@/lib/utils';
import type { Assignment, Instrument } from '@/types';

interface AssignSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songId: string;
  part: Instrument;
  // If editing, pass the existing assignment; otherwise undefined for create.
  initial?: Assignment;
  // Caller decides whether to add or update. For create mode this can contain
  // multiple assignments (multi-select). For edit mode it always has length 1.
  onSubmit: (assignments: Assignment[]) => void;
}

export function AssignSlotDialog({
  open,
  onOpenChange,
  songId,
  part,
  initial,
  onSubmit,
}: AssignSlotDialogProps) {
  const { state } = useApp();
  const isEdit = initial !== undefined;

  // Map of memberId -> { selected, isEmergency }. In edit mode this only ever
  // holds the one row being edited.
  const [picks, setPicks] = React.useState<Map<string, boolean>>(new Map());
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      const initMap = new Map<string, boolean>();
      if (initial) initMap.set(initial.memberId, initial.isEmergency);
      setPicks(initMap);
      setError(null);
    }
  }, [open, initial]);

  const existingForSlot = state.assignments.filter(
    (a) => a.songId === songId && a.part === part,
  );
  const takenIds = new Set(
    existingForSlot.filter((a) => a.id !== initial?.id).map((a) => a.memberId),
  );

  const eligible = state.members.filter((m) => m.instruments.includes(part));
  const meta = INSTRUMENT_META[part];

  const togglePick = (memberId: string) => {
    setPicks((cur) => {
      const next = new Map(cur);
      if (isEdit) {
        // Single-select: replace whatever is there.
        const wasEmergency = next.get(memberId);
        next.clear();
        next.set(memberId, wasEmergency ?? false);
      } else {
        if (next.has(memberId)) next.delete(memberId);
        else next.set(memberId, false);
      }
      return next;
    });
  };

  const toggleEmergency = (memberId: string) => {
    setPicks((cur) => {
      if (!cur.has(memberId)) return cur;
      const next = new Map(cur);
      next.set(memberId, !cur.get(memberId));
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (picks.size === 0) {
      setError('请选择至少一个成员');
      return;
    }

    const assignments: Assignment[] = [];
    if (isEdit && initial) {
      // Edit mode: exactly one entry expected.
      const first = picks.entries().next().value as [string, boolean] | undefined;
      if (!first) return;
      const [memberId, emergency] = first;
      assignments.push({ ...initial, memberId, isEmergency: emergency });
    } else {
      for (const [memberId, emergency] of picks) {
        assignments.push({
          id: crypto.randomUUID(),
          songId,
          memberId,
          part,
          isEmergency: emergency,
        });
      }
    }

    onSubmit(assignments);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? '编辑分配' : '分配'} · {meta.label} ({meta.abbrev})
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? '修改这条分配的成员或替补状态'
              : `选择能演奏${meta.label}的成员，可多选。⚡ = 替补`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-2 block">成员</Label>
            {eligible.length === 0 ? (
              <p className="rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-3 py-4 text-center text-xs text-zinc-500">
                还没有能演奏{meta.label}的成员。先去成员页添加。
              </p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-auto">
                {eligible.map((m) => {
                  const taken = takenIds.has(m.id);
                  const selected = picks.has(m.id);
                  const emergency = picks.get(m.id) ?? false;
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        'flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors',
                        selected && 'border-zinc-900 bg-zinc-50',
                        !selected && !taken && 'border-zinc-200',
                        taken && 'border-zinc-200 bg-zinc-50 text-zinc-400',
                      )}
                    >
                      <button
                        type="button"
                        disabled={taken}
                        onClick={() => togglePick(m.id)}
                        className={cn(
                          'flex flex-1 items-center gap-2 text-left',
                          taken && 'cursor-not-allowed',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-4 w-4 items-center justify-center rounded border',
                            selected
                              ? 'border-zinc-900 bg-zinc-900 text-white'
                              : 'border-zinc-300 bg-white',
                          )}
                        >
                          {selected && <Check className="h-3 w-3" />}
                        </span>
                        <span className="font-medium">{m.name}</span>
                        {taken && <span className="text-xs text-zinc-400">已分配</span>}
                      </button>

                      {selected && !taken && (
                        <button
                          type="button"
                          onClick={() => toggleEmergency(m.id)}
                          className={cn(
                            'ml-2 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors',
                            emergency
                              ? 'border-amber-300 bg-amber-50 text-amber-700'
                              : 'border-zinc-200 bg-white text-zinc-400 hover:text-zinc-700',
                          )}
                          title="替补 (emergency)"
                        >
                          <Zap className="h-3 w-3" />
                          {emergency ? '替补' : '正式'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={eligible.length === 0}>
              保存
              {!isEdit && picks.size > 0 && <span className="ml-1">({picks.size})</span>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
