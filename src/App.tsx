import * as React from 'react';
import { AppProvider } from '@/store/AppContext';
import { Sidebar, type TabKey } from '@/components/Sidebar';
import SongsPage from '@/pages/SongsPage';
import SongDetailPage from '@/pages/SongDetailPage';
import MembersPage from '@/pages/MembersPage';

export default function App() {
  const [tab, setTab] = React.useState<TabKey>('songs');
  const [selectedSongId, setSelectedSongId] = React.useState<string | null>(null);

  const handleTabChange = (key: TabKey) => {
    setSelectedSongId(null);
    setTab(key);
  };

  return (
    <AppProvider>
      <div className="flex min-h-screen bg-zinc-50">
        <Sidebar active={tab} onChange={handleTabChange} />
        <main className="flex-1 overflow-auto">
          {tab === 'songs' &&
            (selectedSongId ? (
              <SongDetailPage
                songId={selectedSongId}
                onBack={() => setSelectedSongId(null)}
              />
            ) : (
              <SongsPage onSelect={setSelectedSongId} />
            ))}
          {tab === 'members' && <MembersPage />}
        </main>
      </div>
    </AppProvider>
  );
}
