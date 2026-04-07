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
import type { Instrument, Member } from '@/types';

interface MemberFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Member;
  onSubmit: (member: Member) => void;
}

interface FormState {
  name: string;
  instruments: Instrument[];
}

function emptyForm(): FormState {
  return { name: '', instruments: [] };
}

function fromMember(m: Member): FormState {
  return { name: m.name, instruments: [...m.instruments] };
}

export function MemberFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: MemberFormDialogProps) {
  const [form, setForm] = React.useState<FormState>(() =>
    initial ? fromMember(initial) : emptyForm(),
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setForm(initial ? fromMember(initial) : emptyForm());
      setError(null);
    }
  }, [open, initial]);

  const toggleInstrument = (inst: Instrument) => {
    setForm((f) => {
      const has = f.instruments.includes(inst);
      return {
        ...f,
        instruments: has ? f.instruments.filter((i) => i !== inst) : [...f.instruments, inst],
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError('请填写成员姓名');
      return;
    }
    if (form.instruments.length === 0) {
      setError('至少选择一项乐器');
      return;
    }

    const member: Member = initial
      ? { ...initial, name, instruments: form.instruments }
      : {
          id: crypto.randomUUID(),
          name,
          instruments: form.instruments,
          createdAt: new Date().toISOString(),
        };

    onSubmit(member);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? '编辑成员' : '添加成员'}</DialogTitle>
          <DialogDescription>
            {initial ? '修改成员信息后保存' : '填写成员姓名和能演奏的乐器'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="name" className="mb-1 block">
              姓名 <span className="text-red-600">*</span>
            </Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </div>

          <div>
            <Label className="mb-1 block">
              能演奏的乐器 <span className="text-red-600">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {INSTRUMENTS.map((inst) => {
                const meta = INSTRUMENT_META[inst];
                const selected = form.instruments.includes(inst);
                return (
                  <button
                    type="button"
                    key={inst}
                    onClick={() => toggleInstrument(inst)}
                    className={cn(
                      'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                      selected
                        ? meta.badge
                        : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50',
                    )}
                  >
                    {meta.abbrev} · {meta.label}
                  </button>
                );
              })}
            </div>
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
