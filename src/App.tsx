import * as React from 'react';
import { AppProvider } from '@/store/AppContext';
import { Sidebar, type TabKey } from '@/components/Sidebar';
import SongsPage from '@/pages/SongsPage';
import MembersPage from '@/pages/MembersPage';

export default function App() {
  const [tab, setTab] = React.useState<TabKey>('songs');

  return (
    <AppProvider>
      <div className="flex min-h-screen bg-zinc-50">
        <Sidebar active={tab} onChange={setTab} />
        <main className="flex-1 overflow-auto">
          {tab === 'songs' && <SongsPage />}
          {tab === 'members' && <MembersPage />}
        </main>
      </div>
    </AppProvider>
  );
}
