import * as React from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Shield, Users } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useApp } from '@/store/AppContext';
import { useAuthContext } from '@/store/AuthContext';
import type { AppRole } from '@/hooks/useAuth';

interface RoleRow {
  uid: string;
  email: string;
  role: AppRole;
  memberId?: string;
}

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: 'admin', label: '管理员' },
  { value: 'director', label: '团长' },
  { value: 'member', label: '成员' },
];

const ROLE_BADGE: Record<AppRole, string> = {
  admin: 'bg-red-50 text-red-700 border-red-200',
  director: 'bg-purple-50 text-purple-700 border-purple-200',
  member: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

export default function AdminPage() {
  const { role: myRole, user } = useAuthContext();
  const { state } = useApp();
  const [rows, setRows] = React.useState<RoleRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, 'roles'), (snap) => {
      const list: RoleRow[] = [];
      snap.forEach((d) => {
        const data = d.data() as { email?: string; role?: AppRole; memberId?: string };
        list.push({
          uid: d.id,
          email: data.email ?? '',
          role: data.role ?? 'member',
          memberId: data.memberId,
        });
      });
      list.sort((a, b) => {
        const order: Record<AppRole, number> = { admin: 0, director: 1, member: 2 };
        return order[a.role] - order[b.role] || a.email.localeCompare(b.email);
      });
      setRows(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleRoleChange = async (uid: string, newRole: AppRole) => {
    try {
      const update: Record<string, unknown> = { role: newRole };
      if (newRole !== 'member') update.memberId = null;
      await updateDoc(doc(db, 'roles', uid), update);
    } catch (e) {
      console.error('Failed to update role:', e);
      alert('更新角色失败');
    }
  };

  const handleMemberLink = async (uid: string, memberId: string) => {
    try {
      await updateDoc(doc(db, 'roles', uid), { memberId: memberId || null });
    } catch (e) {
      console.error('Failed to link member:', e);
      alert('绑定成员失败');
    }
  };

  // memberId values already linked to some user (to prevent double-linking).
  const linkedMemberIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.memberId) set.add(r.memberId);
    }
    return set;
  }, [rows]);

  if (myRole !== 'admin') {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900">
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <Shield className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
          <p className="text-sm font-medium text-zinc-900">没有权限</p>
          <p className="text-xs text-zinc-500 mt-1">只有管理员可以访问此页面</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-2xl px-6 py-5">
        <h1 className="text-2xl font-semibold tracking-tight">用户管理</h1>
        <p className="text-sm text-zinc-500 mt-1">管理登录用户的角色和权限</p>

        {loading ? (
          <div className="mt-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-zinc-100" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center">
            <Users className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
            <p className="text-sm font-medium text-zinc-900">还没有用户</p>
            <p className="text-xs text-zinc-500 mt-1">用户登录后会自动出现在这里</p>
          </div>
        ) : (
          <div className="mt-5 space-y-2">
            {rows.map((row) => {
              const isSelf = row.uid === user?.uid;
              return (
                <div
                  key={row.uid}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {row.email}
                      {isSelf && (
                        <span className="ml-2 text-xs text-zinc-400">(你)</span>
                      )}
                    </p>
                    {row.role === 'member' && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-400">绑定成员:</span>
                        <select
                          value={row.memberId ?? ''}
                          onChange={(e) => handleMemberLink(row.uid, e.target.value)}
                          className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[11px] text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                        >
                          <option value="">未绑定</option>
                          {state.members.map((m) => (
                            <option
                              key={m.id}
                              value={m.id}
                              disabled={linkedMemberIds.has(m.id) && m.id !== row.memberId}
                            >
                              {m.name}{linkedMemberIds.has(m.id) && m.id !== row.memberId ? ' (已绑定)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {isSelf ? (
                      <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[row.role]}`}>
                        {ROLE_OPTIONS.find((o) => o.value === row.role)?.label ?? row.role}
                      </span>
                    ) : (
                      <select
                        value={row.role}
                        onChange={(e) => handleRoleChange(row.uid, e.target.value as AppRole)}
                        className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
