import React, { useEffect } from 'react';
import { useStore } from './store/useStore';
import { initSocket } from './services/socket';
import { ChatList } from './components/Sidebar/ChatList';
import { ChatHeader } from './components/Chat/ChatHeader';
import { MessageList } from './components/Chat/MessageList';
import { MessageInput } from './components/Chat/MessageInput';
import { AuthModal } from './components/Auth/AuthModal';
import { NewChatModal } from './components/NewChatModal';
import { NewGroupModal } from './components/NewGroupModal';
import { GroupInfoModal } from './components/GroupInfoModal';
import { JoinGroupModal } from './components/JoinGroupModal';
import { ForwardModal } from './components/ForwardModal';
import { SecretKeysModal } from './components/SecretKeysModal';
import { AdminPortal } from './components/Admin/AdminPortal';
import { ChatDetailsDrawer } from './components/Chat/ChatDetailsDrawer';
import { ProfileEditModal } from './components/Profile/ProfileEditModal';
import { ContactsModal } from './components/Contacts/ContactsModal';
import { SettingsModal } from './components/Settings/SettingsModal';

export const App: React.FC = () => {
  const { user, setUser, token, setChats, activeChatId, theme, appView, setAppView, setShowChatDetails } = useStore();

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.startsWith('/admin')) {
        setAppView('admin');
      } else {
        setAppView('messenger');
      }
    };

    if (window.location.pathname.startsWith('/admin')) {
      setAppView('admin');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setAppView]);

  useEffect(() => {
    if (token) {
      // 1. Initialize Socket.io
      initSocket(token);

      // 2. Fetch User Profile
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) setUser(data.user);
        })
        .catch((err) => console.error('Fetch me error:', err));

      // 3. Fetch Chats
      fetch('/api/chats', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.chats) setChats(data.chats);
        })
        .catch((err) => console.error('Fetch chats error:', err));
    }
  }, [token]);

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${theme === 'light' ? 'theme-light bg-[#eef2f5] text-[#111827]' : 'bg-[#0e1621] text-[#f5f5f5]'}`}>
      {/* Auth Screen Modal if user not logged in */}
      <AuthModal />

      {/* Main View: Dedicated Admin Portal OR Klea Messenger */}
      {appView === 'admin' ? (
        <AdminPortal />
      ) : user ? (
        <div className="flex w-full h-full">
          {/* 1. Chat List Sidebar */}
          <ChatList />

          {/* 3. Main Chat View */}
          <div className={`flex-1 flex flex-col h-full relative min-w-0 ${theme === 'light' ? 'bg-[#dbe4ec]' : 'bg-[#0e1621]'}`}>
            {activeChatId ? (
              <>
                <ChatHeader />
                <MessageList />
                <MessageInput />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center select-none tg-wallpaper p-6 text-center">
                <div className={`w-20 h-20 rounded-2xl overflow-hidden border mb-4 shadow-xl ${theme === 'light' ? 'border-gray-300' : 'border-white/10'}`}>
                  <img src="/logo.png" alt="Klea Logo" className="w-full h-full object-cover" />
                </div>
                <h3 className={`text-base font-bold mb-1 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Select a chat to start messaging</h3>
                <p className={`text-xs max-w-xs leading-relaxed ${theme === 'light' ? 'text-gray-600' : 'text-white/50'}`}>
                  Experience Klea with private groups, secret chats, voice notes, live typing, and instant messaging.
                </p>
              </div>
            )}
          </div>

          {/* 4. Telegram Right Chat Details / Shared Media Drawer */}
          {activeChatId && <ChatDetailsDrawer onClose={() => setShowChatDetails(false)} />}
        </div>
      ) : null}

      {/* Global Modals */}
      <NewChatModal />
      <NewGroupModal />
      <GroupInfoModal />
      <JoinGroupModal />
      <ForwardModal />
      <SecretKeysModal />
      <ProfileEditModal />
      <ContactsModal />
      <SettingsModal />
    </div>
  );
};

export default App;
