import React from 'react';
import {
  X,
  User,
  Users,
  Bookmark,
  Settings,
  Moon,
  Sun,
  LogOut,
  ShieldCheck,
  Contact,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

interface MainMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MainMenuDrawer: React.FC<MainMenuDrawerProps> = ({ isOpen, onClose }) => {
  const {
    user,
    logout,
    theme,
    toggleTheme,
    setActiveModal,
    setAppView,
    token,
    addChat,
    setActiveChatId,
    activeFolder,
    setActiveFolder,
  } = useStore();

  if (!isOpen || !user) return null;

  const handleOpenSavedMessages = async () => {
    onClose();
    try {
      const res = await fetch('/api/chats/saved', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.chat) {
        addChat(data.chat);
        setActiveChatId(data.chat.id);
      }
    } catch (e) {
      console.error('Error opening saved messages:', e);
    }
  };

  const handleSelectFolder = (folder: 'all' | 'direct' | 'groups' | 'secret') => {
    setActiveFolder(folder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer */}
      <div
        className={`relative w-76 max-w-[85vw] h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200 border-r select-none ${
          theme === 'light'
            ? 'bg-white border-gray-200 text-gray-900'
            : 'bg-[#17212b] border-white/10 text-white'
        }`}
      >
        <div className="overflow-y-auto flex-1">
          {/* User Profile Banner Header with App Logo */}
          <div
            className={`p-5 border-b relative ${
              theme === 'light'
                ? 'bg-gradient-to-b from-[#f0f4f8] to-white border-gray-200'
                : 'bg-gradient-to-b from-[#242f3d] to-[#17212b] border-white/5'
            }`}
          >
            <button
              onClick={onClose}
              className={`absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                theme === 'light'
                  ? 'text-gray-400 hover:bg-gray-100 hover:text-gray-800'
                  : 'text-[#7f91a4] hover:bg-white/10 hover:text-white'
              }`}
            >
              <X className="w-4 h-4" />
            </button>

            {/* App Logo & Title */}
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className={`w-8 h-8 rounded-xl overflow-hidden shadow-sm shrink-0 border ${
                  theme === 'light' ? 'border-gray-200' : 'border-white/10'
                }`}
              >
                <img src="/logo.png" alt="Klea Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className={`text-sm font-extrabold tracking-tight ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  Klea
                </h2>
                <p className={`text-[10px] ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
                  Enterprise Messenger
                </p>
              </div>
            </div>

            {/* User Avatar & Info (Clickable to Edit Profile) */}
            <div
              onClick={() => {
                onClose();
                setActiveModal('profile_edit');
              }}
              className={`flex items-center gap-3.5 p-2 rounded-2xl transition cursor-pointer ${
                theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/5'
              }`}
              title="Click to edit profile"
            >
              <div
                className={`relative w-12 h-12 rounded-full overflow-hidden border-2 shadow-sm shrink-0 ${
                  theme === 'light' ? 'border-gray-200' : 'border-white/15'
                }`}
              >
                <img
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                  alt={user.displayName}
                  className="w-full h-full object-cover"
                />
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#4fae4e] ring-2 ${
                    theme === 'light' ? 'ring-white' : 'ring-[#17212b]'
                  }`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className={`text-sm font-bold truncate ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  {user.displayName}
                </h3>
                <p className="text-xs text-[#5288c1] font-medium truncate">@{user.username}</p>
                {user.role === 'ADMIN' && (
                  <span
                    className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      theme === 'light'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    Administrator
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Chat Folders */}
          <div className={`p-3 border-b ${theme === 'light' ? 'border-gray-100' : 'border-white/5'}`}>
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 block mb-1.5 ${
                theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'
              }`}
            >
              Chat Views
            </span>

            <div className="space-y-0.5">
              <button
                onClick={() => handleSelectFolder('all')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                  activeFolder === 'all'
                    ? theme === 'light'
                      ? 'bg-[#5288c1] text-white shadow-xs'
                      : 'bg-[#2b5278] text-white shadow-sm'
                    : theme === 'light'
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-white/80 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare
                    className={`w-4 h-4 ${
                      activeFolder === 'all'
                        ? 'text-white'
                        : theme === 'light'
                        ? 'text-gray-400'
                        : 'text-[#7f91a4]'
                    }`}
                  />
                  <span>All Chats</span>
                </div>
              </button>

              <button
                onClick={() => handleSelectFolder('direct')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                  activeFolder === 'direct'
                    ? theme === 'light'
                      ? 'bg-[#5288c1] text-white shadow-xs'
                      : 'bg-[#2b5278] text-white shadow-sm'
                    : theme === 'light'
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-white/80 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <User
                    className={`w-4 h-4 ${
                      activeFolder === 'direct'
                        ? 'text-white'
                        : theme === 'light'
                        ? 'text-gray-400'
                        : 'text-[#7f91a4]'
                    }`}
                  />
                  <span>Direct Messages</span>
                </div>
              </button>

              <button
                onClick={() => handleSelectFolder('groups')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                  activeFolder === 'groups'
                    ? theme === 'light'
                      ? 'bg-[#5288c1] text-white shadow-xs'
                      : 'bg-[#2b5278] text-white shadow-sm'
                    : theme === 'light'
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-white/80 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users
                    className={`w-4 h-4 ${
                      activeFolder === 'groups'
                        ? 'text-white'
                        : theme === 'light'
                        ? 'text-gray-400'
                        : 'text-[#7f91a4]'
                    }`}
                  />
                  <span>Company Groups</span>
                </div>
              </button>

              <button
                onClick={() => handleSelectFolder('secret')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                  activeFolder === 'secret'
                    ? theme === 'light'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : theme === 'light'
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-white/80 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Lock
                    className={`w-4 h-4 ${
                      activeFolder === 'secret'
                        ? 'text-white'
                        : 'text-emerald-500'
                    }`}
                  />
                  <span>Secret Chats (E2EE)</span>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Core Telegram Actions */}
          <div className={`p-3 border-b space-y-0.5 ${theme === 'light' ? 'border-gray-100' : 'border-white/5'}`}>
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 block mb-1.5 ${
                theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'
              }`}
            >
              Features
            </span>

            {/* My Profile */}
            <button
              onClick={() => {
                onClose();
                setActiveModal('profile_edit');
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
                theme === 'light'
                  ? 'text-gray-700 hover:bg-gray-100'
                  : 'text-white/90 hover:bg-white/5'
              }`}
            >
              <User className={`w-4 h-4 ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`} />
              <span>Edit My Profile</span>
            </button>

            {/* New Group */}
            <button
              onClick={() => {
                onClose();
                setActiveModal('new_group');
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
                theme === 'light'
                  ? 'text-gray-700 hover:bg-gray-100'
                  : 'text-white/90 hover:bg-white/5'
              }`}
            >
              <Users className={`w-4 h-4 ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`} />
              <span>New Group</span>
            </button>

            {/* Contacts Directory */}
            <button
              onClick={() => {
                onClose();
                setActiveModal('contacts');
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
                theme === 'light'
                  ? 'text-gray-700 hover:bg-gray-100'
                  : 'text-white/90 hover:bg-white/5'
              }`}
            >
              <Contact className={`w-4 h-4 ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`} />
              <span>Contacts Directory</span>
            </button>

            {/* Saved Messages */}
            <button
              onClick={handleOpenSavedMessages}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
                theme === 'light'
                  ? 'text-gray-700 hover:bg-gray-100'
                  : 'text-white/90 hover:bg-white/5'
              }`}
            >
              <Bookmark className="w-4 h-4 text-[#5288c1]" />
              <span>Saved Messages</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => {
                onClose();
                setActiveModal('settings');
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
                theme === 'light'
                  ? 'text-gray-700 hover:bg-gray-100'
                  : 'text-white/90 hover:bg-white/5'
              }`}
            >
              <Settings className={`w-4 h-4 ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`} />
              <span>Settings</span>
            </button>

            {/* Night / Day Mode Toggle */}
            <button
              onClick={toggleTheme}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
                theme === 'light'
                  ? 'text-gray-700 hover:bg-gray-100'
                  : 'text-white/90 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3.5">
                {theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-[#7f91a4]" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                <span>{theme === 'dark' ? 'Night Mode' : 'Day Mode'}</span>
              </div>
              <div
                className={`w-8 h-4 rounded-full transition p-0.5 ${
                  theme === 'dark' ? 'bg-[#5288c1]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white transition transform ${
                    theme === 'dark' ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>

            {/* Admin Dashboard (Admins Only - Separate Portal) */}
            {user.role === 'ADMIN' && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    onClose();
                    setAppView('admin');
                    window.history.pushState({}, '', '/admin');
                  }}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                    theme === 'light'
                      ? 'text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200'
                      : 'text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>Admin Console (Secure Portal)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-3 border-t space-y-2 ${theme === 'light' ? 'border-gray-200' : 'border-white/5'}`}>
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-red-500 hover:bg-red-500/10 transition cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>

          <div className={`px-3 text-[10px] ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`}>
            Klea Web v2.4 Enterprise
          </div>
        </div>
      </div>
    </div>
  );
};
