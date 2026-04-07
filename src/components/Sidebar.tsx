import { Music, Users, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TabKey = 'songs' | 'members';

interface NavItem {
  key: TabKey;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { key: 'songs', label: '歌曲', icon: Music },
  { key: 'members', label: '成员', icon: Users },
];

interface SidebarProps {
  active: TabKey;
  onChange: (key: TabKey) => void;
}

export function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-zinc-200 bg-white">
      <div className="px-5 py-5">
        <p className="text-base font-semibold text-zinc-900">Band Planner</p>
        <p className="text-xs text-zinc-500 mt-0.5">乐队排练规划</p>
      </div>
      <nav className="flex-1 px-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
