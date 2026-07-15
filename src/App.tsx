import * as React from 'react';
import { AppProvider } from '@/store/AppContext';
import { Sidebar, type TabKey } from '@/components/Sidebar';
import SongsPage from '@/pages/SongsPage';
import SongDetailPage from '@/pages/SongDetailPage';
import MembersPage from '@/pages/MembersPage';
import MemberDetailPage from '@/pages/MemberDetailPage';
import MemberSongsPage from '@/pages/MemberSongsPage';
import RehearsalPage from '@/pages/RehearsalPage';
import RehearsalHistoryPage from '@/pages/RehearsalHistoryPage';
import AvailabilityPage from '@/pages/AvailabilityPage';
import ShowsPage from '@/pages/ShowsPage';
import ShowDetailPage from '@/pages/ShowDetailPage';
import WhoNeedsToComePage from '@/pages/WhoNeedsToComePage';

export default function App() {
  const [tab, setTab] = React.useState<TabKey>('songs');
  const [selectedSongId, setSelectedSongId] = React.useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);
  const [selectedShowId, setSelectedShowId] = React.useState<string | null>(null);
  const [detailFromTab, setDetailFromTab] = React.useState<TabKey>('songs');
  const [attendingIds, setAttendingIds] = React.useState<Set<string>>(new Set());

  const handleTabChange = (key: TabKey) => {
    setSelectedSongId(null);
    setSelectedMemberId(null);
    setSelectedShowId(null);
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

  const openMemberDetail = (from: TabKey) => (id: string) => {
    setDetailFromTab(from);
    setSelectedMemberId(id);
  };

  const closeMemberDetail = () => {
    setSelectedMemberId(null);
    setTab(detailFromTab);
  };

  const openShowDetail = (id: string) => {
    setDetailFromTab('shows');
    setSelectedShowId(id);
  };

  const closeShowDetail = () => {
    setSelectedShowId(null);
    setTab('shows');
  };

  const showSongDetail = selectedSongId !== null;
  const showMemberDetail = selectedMemberId !== null;
  const showShowDetail = selectedShowId !== null;
  const showDetail = showSongDetail || showMemberDetail || showShowDetail;

  return (
    <AppProvider>
      <div className="flex min-h-screen bg-zinc-50">
        <Sidebar
          active={showDetail ? detailFromTab : tab}
          onChange={handleTabChange}
          onDataImported={() => window.location.reload()}
        />
        <main className="flex-1 overflow-auto">
          {showSongDetail ? (
            <SongDetailPage songId={selectedSongId!} onBack={closeSongDetail} />
          ) : showMemberDetail ? (
            <MemberDetailPage memberId={selectedMemberId!} onBack={closeMemberDetail} />
          ) : showShowDetail ? (
            <ShowDetailPage
              showId={selectedShowId!}
              onBack={closeShowDetail}
              onSelectSong={openSongDetail('shows')}
            />
          ) : (
            <>
              {tab === 'songs' && <SongsPage onSelect={openSongDetail('songs')} />}
              {tab === 'members' && <MembersPage onSelect={openMemberDetail('members')} />}
              {tab === 'memberSongs' && <MemberSongsPage onSelectMember={openMemberDetail('memberSongs')} />}
              {tab === 'availability' && <AvailabilityPage />}
              {tab === 'rehearsal' && (
                <RehearsalPage
                  attendingIds={attendingIds}
                  onAttendingChange={setAttendingIds}
                  onSelectSong={openSongDetail('rehearsal')}
                />
              )}
              {tab === 'history' && <RehearsalHistoryPage />}
              {tab === 'whoNeeds' && <WhoNeedsToComePage />}
              {tab === 'shows' && <ShowsPage onSelectShow={openShowDetail} />}
            </>
          )}
        </main>
      </div>
    </AppProvider>
  );
}
