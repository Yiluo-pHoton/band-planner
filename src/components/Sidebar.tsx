import * as React from 'react';
import { CalendarCheck, CalendarRange, ClipboardList, Download, History, ListMusic, LogIn, LogOut, Mail, Music, Shield, Table2, Ticket, Upload, Users, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportAllData, importAllData } from '@/lib/dataTransfer';
import { useAuthContext } from '@/store/AuthContext';

export type TabKey = 'songs' | 'members' | 'memberSongs' | 'availability' | 'rehearsal' | 'history' | 'shows' | 'whoNeeds' | 'matrix' | 'admin';

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

const ROLE_LABEL: Record<string, string> = {
  admin: '管理员',
  director: '团长',
  member: '成员',
};

export function Sidebar({ active, onChange, onDataImported }: SidebarProps) {
  const { user, role, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, canEdit } = useAuthContext();
  const [showEmailForm, setShowEmailForm] = React.useState(false);
  const [emailInput, setEmailInput] = React.useState('');
  const [passwordInput, setPasswordInput] = React.useState('');
  const [emailError, setEmailError] = React.useState('');
  const [emailLoading, setEmailLoading] = React.useState(false);

  const handleEmailSubmit = async (isSignUp: boolean) => {
    if (!emailInput.trim() || !passwordInput) return;
    setEmailError('');
    setEmailLoading(true);
    const result = isSignUp
      ? await signUpWithEmail(emailInput.trim(), passwordInput)
      : await signInWithEmail(emailInput.trim(), passwordInput);
    setEmailLoading(false);
    if (result.error) {
      setEmailError(result.error);
    } else {
      setShowEmailForm(false);
      setEmailInput('');
      setPasswordInput('');
    }
  };

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
      <nav className="flex-1 overflow-y-auto px-1.5 lg:px-2">
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

        <div className="my-2 border-t border-zinc-100" />

        <button
          type="button"
          onClick={handleExport}
          title="导出数据"
          className="flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 lg:justify-start lg:px-3"
        >
          <Download className="h-4 w-4 shrink-0" />
          <span className="hidden lg:inline">导出数据</span>
        </button>
        {canEdit && (
          <button
            type="button"
            onClick={handleImport}
            title="导入数据"
            className="flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 lg:justify-start lg:px-3"
          >
            <Upload className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">导入数据</span>
          </button>
        )}

        {(role === 'admin' || role === 'director') && (
          <>
            <div className="my-2 border-t border-zinc-100" />
            <button
              type="button"
              onClick={() => onChange('matrix')}
              title="曲目矩阵"
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors lg:justify-start lg:px-3',
                active === 'matrix'
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900',
              )}
            >
              <Table2 className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">曲目矩阵</span>
            </button>
          </>
        )}
        {role === 'admin' && (
          <button
            type="button"
            onClick={() => onChange('admin')}
            title="用户管理"
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors lg:justify-start lg:px-3',
              active === 'admin'
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900',
            )}
          >
            <Shield className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">用户管理</span>
          </button>
        )}
      </nav>

      {/* Auth section */}
      <div className="border-t border-zinc-100 px-1.5 py-3 lg:px-2">
        {loading ? (
          <p className="text-center text-[10px] text-zinc-400">...</p>
        ) : user ? (
          <div className="space-y-1">
            <div className="hidden lg:block px-3">
              <p className="truncate text-xs font-medium text-zinc-900">{user.displayName ?? user.email}</p>
              {role && (
                <p className="text-[10px] text-zinc-500">
                  <Shield className="inline h-3 w-3 mr-0.5 -mt-px" />
                  {ROLE_LABEL[role] ?? role}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={signOut}
              title="登出"
              className="flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 lg:justify-start lg:px-3"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">登出</span>
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <button
              type="button"
              onClick={signInWithGoogle}
              title="Google 登录"
              className="flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 lg:justify-start lg:px-3"
            >
              <LogIn className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">Google 登录</span>
            </button>
            <button
              type="button"
              onClick={() => setShowEmailForm((v) => !v)}
              title="邮箱登录"
              className="flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 lg:justify-start lg:px-3"
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">邮箱登录</span>
            </button>
            {showEmailForm && (
              <div className="hidden lg:block px-2 pt-1 space-y-2">
                <input
                  type="email"
                  placeholder="邮箱"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                />
                <input
                  type="password"
                  placeholder="密码"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEmailSubmit(false); }}
                  className="w-full rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                />
                {emailError && (
                  <p className="text-[10px] text-red-600">{emailError}</p>
                )}
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={emailLoading}
                    onClick={() => handleEmailSubmit(false)}
                    className="flex-1 rounded bg-zinc-900 px-2 py-1 text-[10px] font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    登录
                  </button>
                  <button
                    type="button"
                    disabled={emailLoading}
                    onClick={() => handleEmailSubmit(true)}
                    className="flex-1 rounded bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
                  >
                    注册
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
