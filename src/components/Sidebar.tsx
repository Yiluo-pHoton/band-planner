import { CalendarCheck, CalendarRange, ClipboardList, Download, History, ListMusic, Music, Ticket, Upload, Users, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportAllData, importAllData } from '@/lib/dataTransfer';

export type TabKey = 'songs' | 'members' | 'memberSongs' | 'availability' | 'rehearsal' | 'history' | 'shows' | 'whoNeeds';

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
  { key: 'whoNeeds', label: '谁需要到场', icon: ClipboardList },
  { key: 'rehearsal', label: '排练规划', icon: CalendarCheck },
  { key: 'history', label: '排练历史', icon: History },
  { key: 'shows', label: '演出', icon: Ticket },
];

interface SidebarProps {
  active: TabKey;
  onChange: (key: TabKey) => void;
  onDataImported?: () => void;
}

export function Sidebar({ active, onChange, onDataImported }: SidebarProps) {
  function handleExport() {
    exportAllData();
  }

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result;
        if (typeof text !== 'string') return;
        const ok = importAllData(text);
        if (ok) {
          onDataImported?.();
        } else {
          alert('导入失败：文件格式不正确');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

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
      <div className="border-t border-zinc-200 px-1.5 py-3 lg:px-2">
        <div className="flex items-center justify-center gap-1 lg:justify-start lg:gap-2">
          <button
            type="button"
            onClick={handleExport}
            title="导出数据"
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 lg:px-3"
          >
            <Download className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">导出数据</span>
          </button>
          <button
            type="button"
            onClick={handleImport}
            title="导入数据"
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 lg:px-3"
          >
            <Upload className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">导入数据</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
