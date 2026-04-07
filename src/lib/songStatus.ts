import type { SongStatus } from '@/types';

export const SONG_STATUS_META: Record<SongStatus, { label: string; badge: string }> = {
  ready: { label: '已就绪', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  polishing: { label: '打磨中', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  rehearsing: { label: '排练中', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  learning: { label: '学习中', badge: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
  shelved: { label: '暂搁置', badge: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
};

// Display order in selects (priority high to low, with shelved at the end)
export const SONG_STATUSES: SongStatus[] = [
  'learning',
  'rehearsing',
  'polishing',
  'ready',
  'shelved',
];
