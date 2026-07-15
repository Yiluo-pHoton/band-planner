const MAIN_KEY = 'band_planner_data_v1';

const PREF_KEYS = [
  'band-planner:songs-view',
  'band-planner:songs-kanban-order',
  'band-planner:member-songs-hidden',
  'band-planner:who-needs-songs',
] as const;

interface ExportBundle {
  _format: 'band-planner-export';
  _version: 1;
  _exportedAt: string;
  main: unknown;
  prefs: Partial<Record<string, string>>;
}

export function exportAllData(): void {
  const mainRaw = localStorage.getItem(MAIN_KEY);
  const main = mainRaw ? JSON.parse(mainRaw) as unknown : null;

  const prefs: Partial<Record<string, string>> = {};
  for (const key of PREF_KEYS) {
    const val = localStorage.getItem(key);
    if (val !== null) {
      prefs[key] = val;
    }
  }

  const bundle: ExportBundle = {
    _format: 'band-planner-export',
    _version: 1,
    _exportedAt: new Date().toISOString(),
    main,
    prefs,
  };

  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `band-planner-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importAllData(jsonText: string): boolean {
  try {
    const bundle = JSON.parse(jsonText) as ExportBundle;
    if (bundle._format !== 'band-planner-export' || bundle._version !== 1) {
      return false;
    }

    if (bundle.main != null) {
      localStorage.setItem(MAIN_KEY, JSON.stringify(bundle.main));
    }

    for (const [key, val] of Object.entries(bundle.prefs)) {
      if (typeof val === 'string') {
        localStorage.setItem(key, val);
      }
    }

    return true;
  } catch {
    return false;
  }
}
