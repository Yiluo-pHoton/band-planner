import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toLocalDateString } from '@/lib/utils';
import type { Rehearsal } from '@/types';

interface SaveRehearsalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;         // YYYY-MM-DD; falls back to today
  attendingMemberIds: string[]; // snapshot from current attendance
  selectedSongIds: string[];    // A + B at save time
  attendeeCount: number;        // for the summary line
  onSubmit: (rehearsal: Rehearsal) => void;
}

export function SaveRehearsalDialog({
  open,
  onOpenChange,
  defaultDate,
  attendingMemberIds,
  selectedSongIds,
  attendeeCount,
  onSubmit,
}: SaveRehearsalDialogProps) {
  const [date, setDate] = React.useState(() => defaultDate ?? toLocalDateString(new Date()));
  const [notes, setNotes] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setDate(defaultDate ?? toLocalDateString(new Date()));
      setNotes('');
      setError(null);
    }
  }, [open, defaultDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError('请选择日期');
      return;
    }
    const rehearsal: Rehearsal = {
      id: crypto.randomUUID(),
      date,
      attendingMemberIds: [...attendingMemberIds],
      selectedSongIds: [...selectedSongIds],
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    onSubmit(rehearsal);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>保存今天的排练</DialogTitle>
          <DialogDescription>
            将当前出勤名单和 A / B 栏的曲目存为一条排练记录
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="rehearsal-date" className="mb-1 block">
              日期 <span className="text-red-600">*</span>
            </Label>
            <Input
              id="rehearsal-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              autoFocus
            />
          </div>

          <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            将记录 <span className="font-medium text-zinc-900">{attendeeCount}</span> 人到场，
            <span className="font-medium text-zinc-900">{selectedSongIds.length}</span> 首曲目（A + B）
          </div>

          <div>
            <Label htmlFor="rehearsal-notes" className="mb-1 block">
              备注
            </Label>
            <textarea
              id="rehearsal-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-1"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit">保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
