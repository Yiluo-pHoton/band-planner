import * as React from 'react';
import { Check, CircleHelp, Eye, Pencil, Plus, Trash2, Undo2 } from 'lucide-react';
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

// ─── Gacha machine visual ──────────────────────────────────────

const CARD_FILLS = [
  '#fb7185', '#fbbf24', '#34d399', '#38bdf8',
  '#a78bfa', '#f472b6', '#2dd4bf', '#fb923c',
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function GachaMachine({ slipCount, shaking, onDraw, disabled }: {
  slipCount: number; shaking: boolean; onDraw: () => void; disabled: boolean;
}) {
  const cards = React.useMemo(() => {
    const rand = seededRandom(42);
    const result: {
      fill: string; x: number; y: number; rotate: number;
      delay: number; animIdx: number;
    }[] = [];
    const count = Math.min(slipCount, 15);
    for (let i = 0; i < count; i++) {
      const r1 = rand(), r2 = rand(), r3 = rand(), r4 = rand();
      result.push({
        fill: CARD_FILLS[i % CARD_FILLS.length]!,
        x: 64 + r1 * 124,
        y: 22 + r2 * 58,
        rotate: -25 + r3 * 50,
        delay: r4 * 5,
        animIdx: i % 4,
      });
    }
    return result;
  }, [slipCount]);

  const face = slipCount === 0 ? 'empty' : slipCount < 5 ? 'happy' : 'full';

  return (
    <div className={`relative mx-auto w-full max-w-lg transition-transform ${shaking ? 'animate-machine-shake' : ''}`}>
      <svg viewBox="0 0 260 280" className="w-full h-auto" aria-label="Punishment gacha machine">
        <defs>
          <clipPath id="domeClip">
            <path d="M55,100 L55,52 Q55,14 130,14 Q205,14 205,52 L205,100 Z" />
          </clipPath>
        </defs>

        {/* ── Dome ── */}
        <path
          d="M55,100 L55,52 Q55,14 130,14 Q205,14 205,52 L205,100 Z"
          fill="#18181b" stroke="#fbbf24" strokeWidth="2"
        />
        {/* Dome glass */}
        <path
          d="M60,98 L60,54 Q60,20 130,20 Q200,20 200,54 L200,98 Z"
          fill="#312e81" opacity="0.2"
        />

        {/* Cards inside dome */}
        <g clipPath="url(#domeClip)">
          {cards.map((card, i) => {
            const cx = card.x + 10;
            const cy = card.y + 13;
            return (
              <g
                key={i}
                transform={`rotate(${card.rotate}, ${cx}, ${cy})`}
                className={`animate-card-float-${card.animIdx}`}
                style={{ animationDelay: `${card.delay}s` }}
              >
                <rect
                  x={card.x} y={card.y}
                  width="20" height="26"
                  rx="3" fill={card.fill} opacity="0.88"
                />
                <text
                  x={cx} y={cy + 4}
                  textAnchor="middle" fontSize="12"
                  fill="#fff" opacity="0.5" fontWeight="bold"
                >?</text>
              </g>
            );
          })}
        </g>

        {/* Gold trim band */}
        <rect x="46" y="97" width="168" height="6" rx="1" fill="#fbbf24" />

        {/* ── Machine body ── */}
        <rect x="46" y="103" width="168" height="140" rx="6" fill="#18181b" />

        {/* Red warning stripe */}
        <rect x="46" y="103" width="168" height="4" rx="1" fill="#dc2626" opacity="0.7" />

        {/* Face panel */}
        <rect x="66" y="120" width="128" height="58" rx="10" fill="#27272a" />

        {/* Face — mischievous machine personality */}
        {face === 'empty' && (
          <>
            <path d="M100,144 Q107,139 114,144" fill="none" stroke="#52525b" strokeWidth="2" strokeLinecap="round" />
            <path d="M146,144 Q153,139 160,144" fill="none" stroke="#52525b" strokeWidth="2" strokeLinecap="round" />
            <path d="M120,160 Q130,164 140,160" fill="none" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" />
          </>
        )}
        {face === 'happy' && (
          <>
            <circle cx="108" cy="142" r="3.5" fill="#fbbf24" />
            <circle cx="152" cy="142" r="3.5" fill="#fbbf24" />
            <circle cx="109.2" cy="141" r="1.2" fill="#fff" opacity="0.7" />
            <circle cx="153.2" cy="141" r="1.2" fill="#fff" opacity="0.7" />
            {/* Raised brow */}
            <path d="M98,133 Q108,128 118,133" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
            {/* Smirk */}
            <path d="M116,160 Q130,170 144,160" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {face === 'full' && (
          <>
            <path d="M98,143 Q108,136 118,143" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M142,143 Q152,136 162,143" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
            {/* Evil grin */}
            <path d="M112,158 Q130,174 148,158" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          </>
        )}

        {/* PUNISHMENT label */}
        <text x="130" y="198" textAnchor="middle" fontSize="8" fill="#ef4444" fontWeight="bold" letterSpacing="3" opacity="0.75">PUNISHMENT</text>

        {/* Small decorative skulls */}
        <text x="72" y="198.5" fontSize="9" fill="#52525b" opacity="0.45">&#9760;</text>
        <text x="178" y="198.5" fontSize="9" fill="#52525b" opacity="0.45">&#9760;</text>

        {/* Knob — interactive draw trigger */}
        <g
          onClick={disabled ? undefined : onDraw}
          style={{ cursor: disabled ? 'default' : 'pointer' }}
          opacity={disabled ? 0.4 : 1}
          className={shaking ? 'animate-knob-spin' : ''}
        >
          <circle cx="166" cy="222" r="16" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
          <circle cx="166" cy="222" r="5.5" fill="#18181b" />
          <path d="M166,210.5 L170,215 L162,215 Z" fill="#18181b" />
        </g>
        {/* Coin slot */}
        <rect x="76" y="220" width="22" height="4" rx="2" fill="#3f3f46" />

        {/* Lightning bolt accents */}
        <polygon points="52,111 55,118 52,118 55,125" fill="#fbbf24" opacity="0.35" />
        <polygon points="205,111 208,118 205,118 208,125" fill="#fbbf24" opacity="0.35" />

        {/* ── Dispenser chute ── */}
        <path
          d="M105,243 L105,252 Q105,258 112,258 L148,258 Q155,258 155,252 L155,243"
          fill="#27272a" stroke="#3f3f46" strokeWidth="1"
        />
        <rect x="110" y="241" width="40" height="5" rx="2" fill="#09090b" />
      </svg>

      <p className="mt-1 text-center text-sm text-zinc-500">
        {slipCount > 0 ? `${slipCount} 张罚单` : '空空如也'}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="animate-card-reveal mx-4 max-w-sm w-full rounded-xl bg-zinc-900 border border-zinc-700 p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-medium uppercase tracking-widest text-red-500">
            &#9760; 抽中了！
          </p>
          {punishment.isHiddenTask && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-300">
              <Eye className="h-3 w-3" />
              隐藏任务
            </span>
          )}
        </div>
        <p className="text-lg font-semibold text-zinc-100 mb-4 leading-relaxed">
          {punishment.text}
        </p>
        <p className="text-sm text-zinc-400 mb-5">
          提交者：{punishment.submitterName}
        </p>
        <Button onClick={onDismiss} className="w-full">
          认罚
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
        /* Knob spin while drawing */
        @keyframes knob-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-knob-spin {
          transform-origin: 166px 222px;
          animation: knob-spin 0.4s linear infinite;
        }

        /* Machine shake — rumble effect */
        @keyframes machine-shake {
          0%, 100% { transform: translateX(0); }
          10% { transform: translateX(-3px) rotate(-0.5deg); }
          20% { transform: translateX(3px) rotate(0.5deg); }
          30% { transform: translateX(-3px) rotate(-0.5deg); }
          40% { transform: translateX(3px) rotate(0.5deg); }
          50% { transform: translateX(-2px); }
          60% { transform: translateX(2px); }
          70% { transform: translateX(-1px); }
          80% { transform: translateX(1px); }
          90% { transform: translateX(-0.5px); }
        }
        .animate-machine-shake { animation: machine-shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite; }

        /* Card floating in dome — gentle drift */
        @keyframes card-float-0 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(2px, -3px) rotate(2deg); }
        }
        @keyframes card-float-1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-2px, -2px) rotate(-2deg); }
        }
        @keyframes card-float-2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(1px, -4px) rotate(1.5deg); }
        }
        @keyframes card-float-3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-1.5px, -2.5px) rotate(-1.5deg); }
        }
        .animate-card-float-0 { animation: card-float-0 4.5s cubic-bezier(0.45, 0, 0.55, 1) infinite; }
        .animate-card-float-1 { animation: card-float-1 5s cubic-bezier(0.45, 0, 0.55, 1) infinite; }
        .animate-card-float-2 { animation: card-float-2 5.5s cubic-bezier(0.45, 0, 0.55, 1) infinite; }
        .animate-card-float-3 { animation: card-float-3 6s cubic-bezier(0.45, 0, 0.55, 1) infinite; }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }

        /* Card reveal — flip/pop effect */
        @keyframes card-reveal {
          0% { opacity: 0; transform: translateY(60px) scale(0.6) rotateY(90deg); }
          50% { transform: translateY(-8px) scale(1.04) rotateY(0deg); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotateY(0deg); }
        }
        .animate-card-reveal { animation: card-reveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }

        @keyframes slip-in {
          0% { opacity: 0; transform: translateY(-16px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slip-in { animation: slip-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
      `}</style>

      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-8">Punishment Jar</h1>

        {/* ── Machine + Draw ── */}
        <div className="flex flex-col items-center mb-8">
          <GachaMachine
            slipCount={undrawn.length}
            shaking={isDrawing}
            onDraw={handleDraw}
            disabled={undrawn.length === 0 || isDrawing || !canEdit}
          />

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
                投入
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
