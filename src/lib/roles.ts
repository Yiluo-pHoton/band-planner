import type { Role } from '@/types';

export const ROLES: Role[] = ['composer', 'lyricist', 'ops', 'recording'];

export const ROLE_META: Record<Role, { abbrev: string; label: string; badge: string }> = {
  composer: {
    abbrev: '曲',
    label: '作曲',
    badge: 'border-violet-200 bg-violet-50 text-violet-700',
  },
  lyricist: {
    abbrev: '词',
    label: '作词',
    badge: 'border-pink-200 bg-pink-50 text-pink-700',
  },
  ops: {
    abbrev: '运',
    label: '运营',
    badge: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  recording: {
    abbrev: '录',
    label: '录音',
    badge: 'border-lime-200 bg-lime-50 text-lime-700',
  },
};
