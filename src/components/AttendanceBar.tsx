import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/store/AppContext';
import { cn } from '@/lib/utils';

interface AttendanceBarProps {
  attendingIds: Set<string>;
  onChange: (next: Set<string>) => void;
}

export function AttendanceBar({ attendingIds, onChange }: AttendanceBarProps) {
  const { state } = useApp();
  const members = state.members;

  const toggle = (id: string) => {
    const next = new Set(attendingIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const allOn = members.length > 0 && members.every((m) => attendingIds.has(m.id));

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-900">今天到场的成员</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            点击切换。{attendingIds.size} / {members.length} 人到场
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
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
      </div>

      {members.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500">还没有成员。先去成员页添加。</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {members.map((m) => {
            const on = attendingIds.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
                  on
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50',
                )}
              >
                {on && <Check className="h-3 w-3" />}
                {m.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
