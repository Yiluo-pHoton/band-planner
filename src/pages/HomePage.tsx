import { loadState } from '@/store/persist';

export default function HomePage() {
  const state = loadState();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Band Planner</h1>
        <p className="text-sm text-zinc-500 mt-1">乐队排练规划工具</p>

        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
          <p className="text-base font-medium">脚手架已就绪</p>
          <p className="text-sm text-zinc-500 mt-1">
            schemaVersion: <code className="text-zinc-900">{state.schemaVersion}</code> · songs:{' '}
            <code className="text-zinc-900">{state.songs.length}</code> · members:{' '}
            <code className="text-zinc-900">{state.members.length}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
