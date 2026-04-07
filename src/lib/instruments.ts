import type { Instrument } from '@/types';

// Single source of truth for instrument display.
// See .claude/skills/band-planner-ui-conventions/SKILL.md
export interface InstrumentMeta {
  abbrev: string;
  label: string;
  badge: string;
}

export const INSTRUMENT_META: Record<Instrument, InstrumentMeta> = {
  vocal: {
    abbrev: 'V',
    label: '主唱',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  keys: {
    abbrev: 'K',
    label: '键盘',
    badge: 'bg-teal-100 text-teal-800 border-teal-200',
  },
  guitar_lead: {
    abbrev: 'G主',
    label: '主吉他',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  guitar_rhythm: {
    abbrev: 'G节',
    label: '节奏吉他',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  drums: {
    abbrev: 'D',
    label: '鼓',
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  bass: {
    abbrev: 'B',
    label: '贝斯',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
  },
};

export const INSTRUMENTS: Instrument[] = [
  'vocal',
  'keys',
  'guitar_lead',
  'guitar_rhythm',
  'drums',
  'bass',
];
