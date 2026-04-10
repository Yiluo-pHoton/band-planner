import type { SongStatus } from '@/types';

export const SONG_STATUS_META: Record<SongStatus, { label: string; badge: string }> = {
  writing: { label: '在写', badge: 'bg-violet-600 text-white border-violet-600' },
  ready: { label: '已就绪', badge: 'bg-emerald-600 text-white border-emerald-600' },
  polishing: { label: '在打磨', badge: 'bg-indigo-600 text-white border-indigo-600' },
  rehearsing: { label: '能合了', badge: 'bg-sky-600 text-white border-sky-600' },
  learning: { label: '还在练', badge: 'bg-zinc-700 text-white border-zinc-700' },
  shelved: { label: '搁置了', badge: 'bg-zinc-200 text-zinc-500 border-zinc-300 line-through' },
};

// Display order in selects (priority high to low, with shelved at the end)
export const SONG_STATUSES: SongStatus[] = [
  'writing',
  'learning',
  'rehearsing',
  'polishing',
  'ready',
  'shelved',
];
