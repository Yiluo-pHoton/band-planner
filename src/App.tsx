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

export default function App() {
  const [tab, setTab] = React.useState<TabKey>('songs');
  const [selectedSongId, setSelectedSongId] = React.useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);
  const [detailFromTab, setDetailFromTab] = React.useState<TabKey>('songs');
  const [attendingIds, setAttendingIds] = React.useState<Set<string>>(new Set());

  const handleTabChange = (key: TabKey) => {
    setSelectedSongId(null);
    setSelectedMemberId(null);
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

  const showSongDetail = selectedSongId !== null;
  const showMemberDetail = selectedMemberId !== null;
  const showDetail = showSongDetail || showMemberDetail;

  return (
    <AppProvider>
      <div className="flex min-h-screen bg-zinc-50">
        <Sidebar active={showDetail ? detailFromTab : tab} onChange={handleTabChange} />
        <main className="flex-1 overflow-auto">
          {showSongDetail ? (
            <SongDetailPage songId={selectedSongId!} onBack={closeSongDetail} />
          ) : showMemberDetail ? (
            <MemberDetailPage memberId={selectedMemberId!} onBack={closeMemberDetail} />
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
            </>
          )}
        </main>
      </div>
    </AppProvider>
  );
}
