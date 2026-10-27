import * as React from 'react';
import { Check, CircleHelp, Dices, Eye, Pencil, Plus, Trash2, Undo2 } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { useAuthContext } from '@/store/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import type { Punishment } from '@/types';

// ─── Jar visual ────────────────────────────────────────────────

const SLIP_FILLS = [
  '#fb7185', '#fbbf24', '#34d399', '#38bdf8',
  '#a78bfa', '#f472b6', '#2dd4bf', '#fb923c',
];

function JarVisual({ slipCount, shaking }: { slipCount: number; shaking: boolean }) {
  const slips = React.useMemo(() => {
    const result: { fill: string; x: number; y: number; rotate: number; delay: number; width: number }[] = [];
    const count = Math.min(slipCount, 18);
    for (let i = 0; i < count; i++) {
      const seed = (i * 7 + 3) % 100;
      const row = Math.floor(i / 3);
      const col = i % 3;
      result.push({
        fill: SLIP_FILLS[i % SLIP_FILLS.length]!,
        x: 58 + col * 26 + (seed % 14) - 6,
        y: 185 - row * 16 - (seed % 6),
        rotate: -30 + (seed % 60),
        delay: (i * 0.4) % 2.5,
        width: 30 + (seed % 10),
      });
    }
    return result;
  }, [slipCount]);

  return (
    <div className={`relative mx-auto transition-transform ${shaking ? 'animate-jar-shake' : ''}`}>
      <svg viewBox="0 0 200 230" width="160" height="184" className="mx-auto" aria-label="Punishment jar">
        <defs>
          <clipPath id="jarClip">
            <path d="M54,72 L48,200 Q48,212 100,212 Q152,212 152,200 L146,72 Z" />
          </clipPath>
        </defs>

        {/* Lid knob */}
        <rect x="88" y="28" width="24" height="10" rx="5" fill="#d4d4d8" stroke="#a1a1aa" strokeWidth="1.5" />

        {/* Lid body */}
        <rect x="68" y="36" width="64" height="14" rx="3" fill="#d4d4d8" stroke="#a1a1aa" strokeWidth="1.5" />

        {/* Jar neck */}
        <path
          d="M64,50 L64,72 L136,72 L136,50 Z"
          fill="#fafafa"
          stroke="#d4d4d8"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Rim ring */}
        <rect x="58" y="66" width="84" height="8" rx="3" fill="none" stroke="#d4d4d8" strokeWidth="1.5" />

        {/* Jar body */}
        <path
          d="M54,72 L48,200 Q48,212 100,212 Q152,212 152,200 L146,72 Z"
          fill="#fafafa"
          stroke="#d4d4d8"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Paper slips (clipped inside jar) */}
        <g clipPath="url(#jarClip)">
          {slips.map((slip, i) => (
            <rect
              key={i}
              x={slip.x}
              y={slip.y}
              width={slip.width}
              height={7}
              rx={1.5}
              fill={slip.fill}
              opacity={0.8}
              transform={`rotate(${slip.rotate}, ${slip.x + slip.width / 2}, ${slip.y + 3.5})`}
              style={{
                animation: `slip-float 3s ease-in-out ${slip.delay}s infinite alternate`,
              }}
            />
          ))}
        </g>
      </svg>

      {/* Count label */}
      <p className="mt-1 text-center text-sm text-zinc-500">
        {slipCount > 0 ? `${slipCount} 张纸条` : '空空如也'}
      </p>
    </div>
  );
}

// ─── Drawn result overlay ──────────────────────────────────────

function DrawnResultCard({
  punishment,
  onDismiss,
}: {
  punishment: Punishment;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
      <div className="animate-slip-reveal mx-4 max-w-sm w-full rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
            抽中了！
          </p>
          {punishment.isHiddenTask && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
              <Eye className="h-3 w-3" />
              隐藏任务
            </span>
          )}
        </div>
        <p className="text-lg font-semibold text-zinc-900 mb-4 leading-relaxed">
          {punishment.text}
        </p>
        <p className="text-sm text-zinc-500 mb-5">
          提交者：{punishment.submitterName}
        </p>
        <Button onClick={onDismiss} className="w-full">
          好的
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────

export default function PunishmentJarPage() {
  const { state, addPunishment, updatePunishment, deletePunishment, drawPunishment } = useApp();
  const { user, canEdit } = useAuthContext();

  const [newText, setNewText] = React.useState('');
  const [newIsHidden, setNewIsHidden] = React.useState(false);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [drawnResult, setDrawnResult] = React.useState<Punishment | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState('');

  const punishments = state.punishments ?? [];
  const undrawn = punishments.filter((p) => !p.drawnAt);
  const drawn = punishments
    .filter((p) => p.drawnAt)
    .sort((a, b) => (b.drawnAt ?? '').localeCompare(a.drawnAt ?? ''));

  // ── Submit ──

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !user) return;
    addPunishment({
      id: crypto.randomUUID(),
      text: newText.trim(),
      submittedBy: user.uid,
      submitterName: user.displayName ?? user.email ?? '匿名',
      isHiddenTask: newIsHidden || undefined,
      createdAt: new Date().toISOString(),
    });
    setNewText('');
    setNewIsHidden(false);
  };

  // ── Draw ──

  const handleDraw = () => {
    if (undrawn.length === 0 || isDrawing) return;
    setIsDrawing(true);
    setDrawnResult(null);

    // Shake for ~1.5s, then reveal
    setTimeout(() => {
      const idx = Math.floor(Math.random() * undrawn.length);
      const picked = undrawn[idx];
      if (!picked) { setIsDrawing(false); return; }
      drawPunishment(picked.id);
      setDrawnResult(picked);
      setIsDrawing(false);
    }, 1500);
  };

  // ── Put back ──

  const handlePutBack = (p: Punishment) => {
    const { drawnAt: _, ...rest } = p;
    updatePunishment({ ...rest } as Punishment);
  };

  // ── Edit ──

  const startEdit = (p: Punishment) => {
    setEditingId(p.id);
    setEditText(p.text);
  };

  const saveEdit = (p: Punishment) => {
    if (!editText.trim()) return;
    updatePunishment({ ...p, text: editText.trim() });
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const [deleteTarget, setDeleteTarget] = React.useState<Punishment | null>(null);

  const isOwner = (p: Punishment) => user?.uid === p.submittedBy;

  return (
    <>
      {/* Inline keyframes */}
      <style>{`
        @keyframes jar-shake {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(-4deg); }
          20% { transform: rotate(4deg); }
          30% { transform: rotate(-4deg); }
          40% { transform: rotate(4deg); }
          50% { transform: rotate(-2deg); }
          60% { transform: rotate(2deg); }
          70% { transform: rotate(-2deg); }
          80% { transform: rotate(1deg); }
          90% { transform: rotate(-1deg); }
        }
        .animate-jar-shake { animation: jar-shake 0.6s ease-in-out infinite; }

        @keyframes slip-float {
          0% { transform: translateY(0) rotate(var(--rotate, 0deg)); }
          100% { transform: translateY(-6px) rotate(calc(var(--rotate, 0deg) + 3deg)); }
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }

        @keyframes slip-reveal {
          0% { opacity: 0; transform: translateY(40px) scale(0.8) rotate(-5deg); }
          60% { transform: translateY(-8px) scale(1.02) rotate(1deg); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
        }
        .animate-slip-reveal { animation: slip-reveal 0.5s ease-out; }

        @keyframes slip-in {
          0% { opacity: 0; transform: translateY(-20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-slip-in { animation: slip-in 0.3s ease-out; }
      `}</style>

      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-8">Punishment Jar</h1>

        {/* ── Jar + Draw ── */}
        <div className="flex flex-col items-center mb-8">
          <JarVisual slipCount={undrawn.length} shaking={isDrawing} />

          <Button
            onClick={handleDraw}
            disabled={undrawn.length === 0 || isDrawing || !canEdit}
            className="mt-5 gap-2"
          >
            <Dices className="h-4 w-4" />
            {isDrawing ? '抽签中...' : '抽签'}
          </Button>

          {!canEdit && (
            <p className="mt-2 text-xs text-zinc-400">
              {user ? '只有管理员和团长可以抽签' : '登录后才能使用'}
            </p>
          )}
        </div>

        {/* ── Submit form ── */}
        {user && (
          <form onSubmit={handleSubmit} className="mb-8 space-y-2">
            <div className="flex gap-2">
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="写一个好玩的惩罚..."
                className="flex-1"
                maxLength={200}
              />
              <Button type="submit" disabled={!newText.trim()} className="gap-1.5">
                <Plus className="h-4 w-4" />
                投入罐子
              </Button>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={newIsHidden}
                onChange={(e) => setNewIsHidden(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                隐藏任务
                <span className="relative">
                  <CircleHelp className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 rounded-md bg-zinc-800 px-2.5 py-1.5 text-[11px] leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    隐藏任务需要在下次排练前完成，否则下次还要被惩罚
                  </span>
                </span>
              </span>
            </label>
          </form>
        )}

        {/* ── My undrawn submissions ── */}
        <section className="mb-8">
          {user && (() => {
            const myUndrawn = undrawn.filter((p) => isOwner(p));
            if (myUndrawn.length === 0) return null;
            return (
              <div className="mt-4">
                <p className="text-xs font-medium text-zinc-400 mb-2">我提交的</p>
                <div className="space-y-2">
                  {myUndrawn.map((p) => (
                    <div
                      key={p.id}
                      className="group flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 animate-slip-in"
                    >
                      {editingId === p.id ? (
                        <div className="flex flex-1 gap-2">
                          <Input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="flex-1"
                            maxLength={200}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(p);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                          />
                          <Button size="sm" onClick={() => saveEdit(p)}>保存</Button>
                          <Button size="sm" variant="secondary" onClick={cancelEdit}>取消</Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-900">{p.text}</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => startEdit(p)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600"
                              onClick={() => setDeleteTarget(p)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </section>

        {/* ── Drawn list ── */}
        {drawn.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">
              已抽出
              <span className="ml-2 text-sm font-normal text-zinc-400">{drawn.length}</span>
            </h2>

            <div className="space-y-2">
              {drawn.map((p) => {
                const isIncompleteHidden = p.isHiddenTask && !p.completedAt;
                return (
                  <div
                    key={p.id}
                    className={`group flex items-center gap-3 rounded-lg border px-4 py-3 ${
                      isIncompleteHidden
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-zinc-200 bg-white'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-zinc-900">{p.text}</p>
                        {p.isHiddenTask && (
                          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            p.completedAt
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-violet-100 text-violet-700'
                          }`}>
                            <Eye className="h-2.5 w-2.5" />
                            {p.completedAt ? '已完成' : '隐藏任务'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        提交者：{p.submitterName}
                        <span className="mx-1.5 text-zinc-300">·</span>
                        {p.drawnAt ? new Date(p.drawnAt).toLocaleDateString('zh-CN') : ''}
                        {isIncompleteHidden && (
                          <span className="ml-1.5 text-amber-600">· 下次排练前需完成</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isIncompleteHidden && canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                          onClick={() => updatePunishment({ ...p, completedAt: new Date().toISOString() })}
                        >
                          <Check className="h-3.5 w-3.5" />
                          完成
                        </Button>
                      )}
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => handlePutBack(p)}
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                          放回
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* ── Delete confirmation dialog ── */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除这条惩罚？</DialogTitle>
            <DialogDescription>
              "{deleteTarget?.text}" 将从罐子中移除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">取消</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) deletePunishment(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Drawn result overlay ── */}
      {drawnResult && (
        <DrawnResultCard
          punishment={drawnResult}
          onDismiss={() => setDrawnResult(null)}
        />
      )}
    </>
  );
}
