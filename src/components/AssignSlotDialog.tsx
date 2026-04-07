import * as React from 'react';
import { Check } from 'lucide-react';
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
  onSubmit: (assignment: Assignment) => void;
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
  const [memberId, setMemberId] = React.useState<string | null>(initial?.memberId ?? null);
  const [isEmergency, setIsEmergency] = React.useState<boolean>(initial?.isEmergency ?? false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setMemberId(initial?.memberId ?? null);
      setIsEmergency(initial?.isEmergency ?? false);
      setError(null);
    }
  }, [open, initial]);

  // Eligible members: can play this part, and (when creating) not already assigned to (song, part).
  // When editing, the current member must remain selectable.
  const existingForSlot = state.assignments.filter(
    (a) => a.songId === songId && a.part === part,
  );
  const takenIds = new Set(
    existingForSlot.filter((a) => a.id !== initial?.id).map((a) => a.memberId),
  );

  const eligible = state.members.filter((m) => m.instruments.includes(part));
  const meta = INSTRUMENT_META[part];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) {
      setError('请选择一个成员');
      return;
    }

    const assignment: Assignment = initial
      ? { ...initial, memberId, isEmergency }
      : {
          id: crypto.randomUUID(),
          songId,
          memberId,
          part,
          isEmergency,
        };

    onSubmit(assignment);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? '编辑分配' : '分配'} · {meta.label} ({meta.abbrev})
          </DialogTitle>
          <DialogDescription>
            {initial ? '修改这条分配的成员或替补状态' : `选择一个能演奏${meta.label}的成员`}
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
              <div className="space-y-1 max-h-64 overflow-auto">
                {eligible.map((m) => {
                  const taken = takenIds.has(m.id);
                  const selected = m.id === memberId;
                  return (
                    <button
                      type="button"
                      key={m.id}
                      disabled={taken}
                      onClick={() => setMemberId(m.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors',
                        selected && 'border-zinc-900 bg-zinc-50',
                        !selected && !taken && 'border-zinc-200 hover:bg-zinc-50',
                        taken && 'border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed',
                      )}
                    >
                      <span className="font-medium">{m.name}</span>
                      <span className="flex items-center gap-2 text-xs text-zinc-500">
                        {taken && <span>已分配</span>}
                        {selected && <Check className="h-4 w-4 text-zinc-900" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-zinc-900">替补 (emergency)</p>
              <p className="text-xs text-zinc-500 mt-0.5">只在正式分配的人不在场时才上</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isEmergency}
              onClick={() => setIsEmergency((v) => !v)}
              className={cn(
                'relative h-5 w-9 rounded-full transition-colors',
                isEmergency ? 'bg-amber-500' : 'bg-zinc-300',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                  isEmergency ? 'translate-x-4' : 'translate-x-0.5',
                )}
              />
            </button>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={eligible.length === 0}>
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
