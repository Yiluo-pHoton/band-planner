import * as React from 'react';
import { Calendar, Plus, Trash2, Pencil, Ticket } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { Show } from '@/types';
import { cn } from '@/lib/utils';

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function countSaturdaysBetween(from: string, to: string): number {
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  let count = 0;
  const cur = new Date(start);
  // Move to next Saturday
  while (cur.getDay() !== 6) {
    cur.setDate(cur.getDate() + 1);
  }
  while (cur <= end) {
    count++;
    cur.setDate(cur.getDate() + 7);
  }
  return count;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

interface ShowsPageProps {
  onSelectShow: (id: string) => void;
}

export default function ShowsPage({ onSelectShow }: ShowsPageProps) {
  const { state, addShow, updateShow, deleteShow } = useApp();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Show | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  const sorted = React.useMemo(
    () => [...state.shows].sort((a, b) => a.date.localeCompare(b.date)),
    [state.shows],
  );

  const todayStr = toLocalDateString(new Date());

  return (
    <div className="p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">演出</h1>
          <button
            type="button"
            onClick={() => { setEditing(null); setDialogOpen(true); }}
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" />
            新建演出
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Ticket className="h-10 w-10 text-zinc-300 mb-3" />
            <p className="text-sm font-medium text-zinc-900">还没有演出</p>
            <p className="text-xs text-zinc-500 mt-1 mb-4">创建一场演出来规划你的 setlist</p>
            <button
              type="button"
              onClick={() => { setEditing(null); setDialogOpen(true); }}
              className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" />
              添加第一场演出
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((show) => {
              const days = daysUntil(show.date);
              const rehearsals = countSaturdaysBetween(todayStr, show.date);
              const isPast = days < 0;
              const setlistCount = show.setlistSongIds.length;
              const capacityLabel = show.minSongs != null && show.maxSongs != null
                ? `${setlistCount} / ${show.minSongs}~${show.maxSongs}`
                : show.maxSongs != null
                  ? `${setlistCount} / ${show.maxSongs}`
                  : show.durationMinutes != null
                    ? `${setlistCount} 首 / ${show.durationMinutes}min`
                    : `${setlistCount} 首`;

              return (
                <div
                  key={show.id}
                  className={cn(
                    'group relative flex cursor-pointer items-center gap-4 rounded-lg border bg-white p-4 transition-colors hover:bg-zinc-50',
                    isPast ? 'border-zinc-200 opacity-60' : 'border-zinc-200',
                  )}
                  onClick={() => onSelectShow(show.id)}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                    <Calendar className="h-5 w-5 text-zinc-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium text-zinc-900 truncate">{show.title}</p>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
                      <span>{show.date}</span>
                      {!isPast && (
                        <>
                          <span>{days === 0 ? '今天' : `${days}天后`}</span>
                          <span>{rehearsals} 次排练</span>
                        </>
                      )}
                      {isPast && <span>已结束</span>}
                      <span>{capacityLabel}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditing(show); setDialogOpen(true); }}
                      className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(show.id); }}
                      className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      {dialogOpen && (
        <ShowFormDialog
          show={editing}
          onSave={(data) => {
            if (editing) {
              updateShow({ ...editing, ...data });
            } else {
              addShow({
                ...data,
                id: crypto.randomUUID(),
                performerIds: [],
                setlistSongIds: [],
                createdAt: new Date().toISOString(),
              });
            }
            setDialogOpen(false);
            setEditing(null);
          }}
          onCancel={() => { setDialogOpen(false); setEditing(null); }}
        />
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <p className="text-sm font-medium text-zinc-900">确认删除这场演出？</p>
            <p className="mt-1 text-xs text-zinc-500">歌单数据会一并删除，歌曲本身不受影响。</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => { deleteShow(confirmDeleteId); setConfirmDeleteId(null); }}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Form dialog ---------- */

interface FormData {
  title: string;
  date: string;
  minSongs?: number;
  maxSongs?: number;
  durationMinutes?: number;
  notes?: string;
}

function ShowFormDialog({
  show,
  onSave,
  onCancel,
}: {
  show: Show | null;
  onSave: (data: FormData) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = React.useState(show?.title ?? '');
  const [date, setDate] = React.useState(show?.date ?? '');
  const [capacityMode, setCapacityMode] = React.useState<'songs' | 'duration'>(
    show?.durationMinutes != null ? 'duration' : 'songs',
  );
  const [minSongs, setMinSongs] = React.useState(show?.minSongs?.toString() ?? '');
  const [maxSongs, setMaxSongs] = React.useState(show?.maxSongs?.toString() ?? '');
  const [duration, setDuration] = React.useState(show?.durationMinutes?.toString() ?? '');
  const [notes, setNotes] = React.useState(show?.notes ?? '');

  const valid = title.trim() !== '' && date !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const data: FormData = { title: title.trim(), date, notes: notes.trim() || undefined };
    if (capacityMode === 'songs') {
      if (minSongs) data.minSongs = parseInt(minSongs, 10);
      if (maxSongs) data.maxSongs = parseInt(maxSongs, 10);
    } else {
      if (duration) data.durationMinutes = parseInt(duration, 10);
    }
    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          {show ? '编辑演出' : '新建演出'}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-zinc-700 mb-1 block">
              名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="春季 livehouse"
              className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 mb-1 block">
              日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 mb-1 block">容量</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setCapacityMode('songs')}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium',
                  capacityMode === 'songs'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
                )}
              >
                按首数
              </button>
              <button
                type="button"
                onClick={() => setCapacityMode('duration')}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium',
                  capacityMode === 'duration'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
                )}
              >
                按时长
              </button>
            </div>
            {capacityMode === 'songs' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={minSongs}
                  onChange={(e) => setMinSongs(e.target.value)}
                  placeholder="最少"
                  className="w-20 rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
                />
                <span className="text-xs text-zinc-400">~</span>
                <input
                  type="number"
                  min="0"
                  value={maxSongs}
                  onChange={(e) => setMaxSongs(e.target.value)}
                  placeholder="最多"
                  className="w-20 rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
                />
                <span className="text-xs text-zinc-500">首</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="时长"
                  className="w-24 rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
                />
                <span className="text-xs text-zinc-500">分钟</span>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 mb-1 block">备注</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!valid}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
          >
            {show ? '保存' : '创建'}
          </button>
        </div>
      </form>
    </div>
  );
}
