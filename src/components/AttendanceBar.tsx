import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/store/AppContext';
import { cn } from '@/lib/utils';
import type { AvailabilityStatus } from '@/types';

interface AttendanceBarProps {
  attendingIds: Set<string>;
  onChange: (next: Set<string>) => void;
  /** Current date (YYYY-MM-DD) for showing availability hints. */
  date?: string;
}

const AV_DOT: Record<AvailabilityStatus, string> = {
  available: 'bg-emerald-400',
  tentative: 'bg-amber-400',
  unavailable: 'bg-red-400',
};

const AV_LABEL: Record<AvailabilityStatus, string> = {
  available: '可以来',
  tentative: '不确定',
  unavailable: '来不了',
};

export function AttendanceBar({ attendingIds, onChange, date }: AttendanceBarProps) {
  const { state } = useApp();
  const members = state.members;

  const toggle = (id: string) => {
    const next = new Set(attendingIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const avFor = (memberId: string): AvailabilityStatus | undefined => {
    if (!date) return undefined;
    return state.availability.find(
      (a) => a.memberId === memberId && a.date === date,
    )?.status;
  };

  const allOn = members.length > 0 && members.every((m) => attendingIds.has(m.id));

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(new Set(members.map((m) => m.id)))}
          disabled={members.length === 0 || allOn}
        >
          全选
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(new Set())}
          disabled={attendingIds.size === 0}
        >
          清空
        </Button>
      </div>

      {members.length === 0 ? (
        <p className="text-xs text-zinc-500">还没有成员。先去成员页添加。</p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {members.map((m) => {
            const on = attendingIds.has(m.id);
            const av = avFor(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.id)}
                title={av ? AV_LABEL[av] : undefined}
                className={cn(
                  'relative flex h-8 items-center gap-1.5 rounded-full border pl-2.5 pr-3 text-sm transition-colors',
                  on
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50',
                )}
              >
                <span className="flex h-3 w-3 shrink-0 items-center justify-center">
                  {on && <Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1 truncate text-left">{m.name}</span>
                {av && (
                  <span
                    className={cn(
                      'absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2',
                      AV_DOT[av],
                      on ? 'ring-zinc-900' : 'ring-white',
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
