import * as React from 'react';
import { AppProvider } from '@/store/AppContext';
import { Sidebar, type TabKey } from '@/components/Sidebar';
import SongsPage from '@/pages/SongsPage';
import SongDetailPage from '@/pages/SongDetailPage';
import MembersPage from '@/pages/MembersPage';
import RehearsalPage from '@/pages/RehearsalPage';
import RehearsalHistoryPage from '@/pages/RehearsalHistoryPage';
import AvailabilityPage from '@/pages/AvailabilityPage';

export default function App() {
  const [tab, setTab] = React.useState<TabKey>('songs');
  const [selectedSongId, setSelectedSongId] = React.useState<string | null>(null);
  const [detailFromTab, setDetailFromTab] = React.useState<TabKey>('songs');
  const [attendingIds, setAttendingIds] = React.useState<Set<string>>(new Set());

  const handleTabChange = (key: TabKey) => {
    setSelectedSongId(null);
    setTab(key);
  };

  const openSongDetail = (from: TabKey) => (id: string) => {
    setDetailFromTab(from);
    setSelectedSongId(id);
  };

  const closeSongDetail = () => {
    setSelectedSongId(null);
    setTab(detailFromTab);
  };

  const showDetail = selectedSongId !== null;

  return (
    <AppProvider>
      <div className="flex min-h-screen bg-zinc-50">
        <Sidebar active={showDetail ? detailFromTab : tab} onChange={handleTabChange} />
        <main className="flex-1 overflow-auto">
          {showDetail ? (
            <SongDetailPage songId={selectedSongId!} onBack={closeSongDetail} />
          ) : (
            <>
              {tab === 'songs' && <SongsPage onSelect={openSongDetail('songs')} />}
              {tab === 'members' && <MembersPage />}
              {tab === 'availability' && <AvailabilityPage />}
              {tab === 'rehearsal' && (
                <RehearsalPage
                  attendingIds={attendingIds}
                  onAttendingChange={setAttendingIds}
                  onSelectSong={openSongDetail('rehearsal')}
                />
              )}
              {tab === 'history' && <RehearsalHistoryPage />}
            </>
          )}
        </main>
      </div>
    </AppProvider>
  );
}
