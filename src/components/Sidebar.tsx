import { CalendarCheck, CalendarRange, History, ListMusic, Music, Users, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TabKey = 'songs' | 'members' | 'memberSongs' | 'availability' | 'rehearsal' | 'history';

interface NavItem {
  key: TabKey;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { key: 'songs', label: '歌曲', icon: Music },
  { key: 'members', label: '成员', icon: Users },
  { key: 'memberSongs', label: '成员曲目', icon: ListMusic },
  { key: 'availability', label: 'Availability', icon: CalendarRange },
  { key: 'rehearsal', label: '排练规划', icon: CalendarCheck },
  { key: 'history', label: '排练历史', icon: History },
];

interface SidebarProps {
  active: TabKey;
  onChange: (key: TabKey) => void;
}

export function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <aside className="flex h-screen w-14 flex-col border-r border-zinc-200 bg-white transition-all lg:w-56">
      {/* Logo area */}
      <div className="px-3 py-5 lg:px-5">
        <p className="hidden text-base font-semibold text-zinc-900 lg:block">Band Planner</p>
        <p className="hidden text-xs text-zinc-500 mt-0.5 lg:block">乐队排练规划</p>
        {/* Collapsed: just a music icon */}
        <p className="text-center text-base font-bold text-zinc-900 lg:hidden">♪</p>
      </div>
      <nav className="flex-1 px-1.5 lg:px-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              title={item.label}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors lg:justify-start lg:px-3',
                isActive
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
