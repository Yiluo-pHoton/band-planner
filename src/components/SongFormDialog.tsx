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
import { cn } from '@/lib/utils';
import { INSTRUMENTS, INSTRUMENT_META } from '@/lib/instruments';
import { SONG_STATUSES, SONG_STATUS_META } from '@/lib/songStatus';
import type { Instrument, Song, SongStatus } from '@/types';

interface SongFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // If editing, the existing song; otherwise undefined for create.
  initial?: Song;
  onSubmit: (song: Song) => void;
}

interface FormState {
  title: string;
  artist: string;
  status: SongStatus;
  requiredParts: Instrument[];
  notes: string;
}

function emptyForm(): FormState {
  return { title: '', artist: '', status: 'learning', requiredParts: [], notes: '' };
}

function fromSong(song: Song): FormState {
  return {
    title: song.title,
    artist: song.artist ?? '',
    status: song.status,
    requiredParts: [...song.requiredParts],
    notes: song.notes ?? '',
  };
}

export function SongFormDialog({ open, onOpenChange, initial, onSubmit }: SongFormDialogProps) {
  const [form, setForm] = React.useState<FormState>(() => (initial ? fromSong(initial) : emptyForm()));
  const [error, setError] = React.useState<string | null>(null);

  // Reset form whenever the dialog opens or the initial song changes.
  React.useEffect(() => {
    if (open) {
      setForm(initial ? fromSong(initial) : emptyForm());
      setError(null);
    }
  }, [open, initial]);

  const partCount = (part: Instrument) =>
    form.requiredParts.filter((p) => p === part).length;

  const setPartCount = (part: Instrument, next: number) => {
    const clamped = Math.max(0, Math.min(4, next));
    setForm((f) => {
      const others = f.requiredParts.filter((p) => p !== part);
      const repeated: Instrument[] = Array(clamped).fill(part);
      return { ...f, requiredParts: [...others, ...repeated] };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setError('请填写歌曲标题');
      return;
    }
    if (form.requiredParts.length === 0) {
      setError('至少选择一个乐器 part');
      return;
    }

    const song: Song = initial
      ? {
          ...initial,
          title,
          artist: form.artist.trim() || undefined,
          status: form.status,
          requiredParts: form.requiredParts,
          notes: form.notes.trim() || undefined,
        }
      : {
          id: crypto.randomUUID(),
          title,
          artist: form.artist.trim() || undefined,
          status: form.status,
          requiredParts: form.requiredParts,
          notes: form.notes.trim() || undefined,
          createdAt: new Date().toISOString(),
        };

    onSubmit(song);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? '编辑歌曲' : '添加歌曲'}</DialogTitle>
          <DialogDescription>
            {initial ? '修改歌曲信息后保存' : '填写歌曲基本信息和需要的乐器 part'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="title" className="mb-1 block">
              标题 <span className="text-red-600">*</span>
            </Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="artist" className="mb-1 block">
              艺人
            </Label>
            <Input
              id="artist"
              value={form.artist}
              onChange={(e) => setForm({ ...form, artist: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="status" className="mb-1 block">
              状态
            </Label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as SongStatus })}
              className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-1"
            >
              {SONG_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {SONG_STATUS_META[s].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="mb-1 block">
              需要的 part <span className="text-red-600">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {INSTRUMENTS.map((inst) => {
                const meta = INSTRUMENT_META[inst];
                const count = partCount(inst);
                const active = count > 0;
                return (
                  <div
                    key={inst}
                    className={cn(
                      'flex items-center justify-between rounded-md border px-2 py-1.5',
                      active ? meta.badge : 'border-zinc-200 bg-white',
                    )}
                  >
                    <span className={cn('text-xs font-medium', active ? '' : 'text-zinc-500')}>
                      {meta.abbrev} · {meta.label}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPartCount(inst, count - 1)}
                        disabled={count === 0}
                        className="flex h-6 w-6 items-center justify-center rounded border border-zinc-200 bg-white text-sm text-zinc-700 disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="w-4 text-center text-xs font-semibold tabular-nums">
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPartCount(inst, count + 1)}
                        disabled={count >= 4}
                        className="flex h-6 w-6 items-center justify-center rounded border border-zinc-200 bg-white text-sm text-zinc-700 disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-zinc-500 mt-1">同一 part 可以选多份（双主唱、双吉他等）。</p>
          </div>

          <div>
            <Label htmlFor="notes" className="mb-1 block">
              备注
            </Label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
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
