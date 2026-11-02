import React from 'react';
import { MessageSquare, Users, Lock, Bookmark, Sun, Moon, LogOut, ShieldCheck } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const FoldersNav: React.FC = () => {
  const { activeFolder, setActiveFolder, logout, user, theme, toggleTheme, token, addChat, setActiveChatId, setAppView, setActiveModal } = useStore();

  const handleOpenSavedMessages = async () => {
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

  return (
    <div className="w-16 bg-[#0e1621] border-r border-white/5 flex flex-col items-center py-4 justify-between shrink-0 select-none">
      {/* Top Tabs */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        {/* App Logo */}
        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md border border-white/10 mb-1">
          <img src="/logo.png" alt="Klea Logo" className="w-full h-full object-cover" />
        </div>

        {/* User Avatar / Profile Icon (Click to Edit Profile) */}
        <div
          onClick={() => setActiveModal('profile_edit')}
          title="Edit My Profile"
          className="relative group cursor-pointer mb-1 hover:scale-105 transition"
        >
          <img
            src={user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username}`}
            alt={user?.displayName}
            className="w-10 h-10 rounded-full object-cover border-2 border-white/10 group-hover:border-[#5288c1] transition"
          />
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#4fae4e] ring-2 ring-[#0e1621]" />
        </div>

        {/* All Chats */}
        <button
          onClick={() => setActiveFolder('all')}
          title="All Chats"
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition cursor-pointer ${
            activeFolder === 'all'
              ? 'bg-[#2b5278] text-white shadow-md'
              : 'text-[#7f91a4] hover:bg-white/5 hover:text-white'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Groups Folder */}
        <button
          onClick={() => setActiveFolder('groups')}
          title="Company Groups"
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition cursor-pointer ${
            activeFolder === 'groups'
              ? 'bg-[#2b5278] text-white shadow-md'
              : 'text-[#7f91a4] hover:bg-white/5 hover:text-white'
          }`}
        >
          <Users className="w-5 h-5" />
        </button>

        {/* Secret Chats */}
        <button
          onClick={() => setActiveFolder('secret')}
          title="Secret Chats (E2EE)"
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition cursor-pointer ${
            activeFolder === 'secret'
              ? 'bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 shadow-md'
              : 'text-[#7f91a4] hover:bg-white/5 hover:text-emerald-400'
          }`}
        >
          <Lock className="w-5 h-5" />
        </button>

        {/* Saved Messages */}
        <button
          onClick={handleOpenSavedMessages}
          title="Saved Messages (Personal Cloud)"
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-[#7f91a4] hover:bg-white/5 hover:text-[#5288c1] transition cursor-pointer"
        >
          <Bookmark className="w-5 h-5" />
        </button>

        {/* Admin Dashboard (Visible to Administrators only) */}
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setAppView('admin')}
            title="Klea Dedicated Admin Dashboard"
            className="w-11 h-11 rounded-2xl flex items-center justify-center bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition shadow-sm shadow-amber-500/10 cursor-pointer mt-1"
          >
            <ShieldCheck className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bottom Actions: Theme Switcher & Logout */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Day Mode' : 'Night Mode'}`}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[#7f91a4] hover:bg-white/10 hover:text-amber-300 transition cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button
          onClick={logout}
          title="Log Out"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[#7f91a4] hover:bg-red-500/20 hover:text-red-400 transition cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
