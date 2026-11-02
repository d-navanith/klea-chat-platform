import React, { useState } from 'react';
import { Lock, Phone, Video, ShieldCheck, Users, Bookmark, MoreVertical, Trash2, Info, Moon, Sun } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { emitClearChat } from '../../services/socket';

export const ChatHeader: React.FC = () => {
  const { chats, activeChatId, user, typingUsers, setActiveModal, theme, toggleTheme, toggleChatDetails, showChatDetails } = useStore();
  const [showMenu, setShowMenu] = useState(false);

  const chat = chats.find((c) => c.id === activeChatId);
  if (!chat) return null;

  const otherMember = chat.members.find((m) => m.userId !== user?.id)?.user;
  const isGroup = chat.type === 'GROUP';
  const isSaved = chat.type === 'SAVED';
  const isSecret = chat.type === 'SECRET';
  const typingList = typingUsers[chat.id] || [];
  const isTyping = typingList.length > 0;

  const handleClearHistory = () => {
    setShowMenu(false);
    if (confirm('Clear entire chat history? This will delete all messages in this conversation.')) {
      emitClearChat(chat.id);
    }
  };

  return (
    <div className={`h-14 px-4 border-b flex items-center justify-between shrink-0 select-none relative ${theme === 'light' ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#17212b] border-white/5 text-white'}`}>
      {/* Contact Info (Clickable to open Chat Details / Shared Media) */}
      <div
        onClick={toggleChatDetails}
        className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition"
      >
        <div className="relative">
          {isSaved ? (
            <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center border border-blue-500/30">
              <Bookmark className="w-5 h-5" />
            </div>
          ) : (
            <>
              <img
                src={
                  isGroup
                    ? chat.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.title}`
                    : otherMember?.avatarUrl ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${otherMember?.username || 'user'}`
                }
                alt={chat.title || otherMember?.displayName || 'Chat'}
                className={`w-10 h-10 object-cover bg-white/10 ${
                  isGroup ? 'rounded-xl' : 'rounded-full'
                }`}
              />
              {!isGroup && otherMember?.isOnline && (
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#4fae4e] ring-2 ${theme === 'light' ? 'ring-white' : 'ring-[#17212b]'}`} />
              )}
            </>
          )}
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            {isSecret && <Lock className="w-3.5 h-3.5 text-emerald-500" />}
            {isGroup && <Users className="w-3.5 h-3.5 text-[#5288c1]" />}
            {isSaved && <Bookmark className="w-3.5 h-3.5 text-blue-500" />}
            <span
              className={`text-sm font-bold truncate ${
                isSecret
                  ? 'text-emerald-600 dark:text-emerald-300'
                  : isSaved
                  ? 'text-blue-600 dark:text-blue-300'
                  : theme === 'light'
                  ? 'text-gray-900'
                  : 'text-white'
              }`}
            >
              {isSaved
                ? 'Saved Messages'
                : isGroup
                ? chat.title
                : otherMember?.displayName || 'Direct Chat'}
            </span>
          </div>

          <div className={`text-[11px] ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
            {isTyping ? (
              <span className="text-[#5288c1] animate-pulse">typing...</span>
            ) : isSaved ? (
              <span className={theme === 'light' ? 'text-gray-400' : 'text-white/40'}>Personal Cloud Storage</span>
            ) : isGroup ? (
              <span>{chat.members.length} members • click for group info</span>
            ) : otherMember?.isOnline ? (
              <span className="text-[#4fae4e]">online</span>
            ) : otherMember?.lastSeen ? (
              `last seen ${new Date(otherMember.lastSeen).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}`
            ) : (
              'offline'
            )}
          </div>
        </div>
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-1">
        {/* If Secret chat, show Encryption Key / Fingerprint button */}
        {isSecret && (
          <button
            onClick={() => setActiveModal('secret_keys')}
            title="View E2EE Encryption Key & Fingerprint"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/30 text-xs font-medium cursor-pointer transition mr-1"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">E2EE Key</span>
          </button>
        )}

        {/* If Group, button to open group info */}
        {isGroup && (
          <button
            onClick={() => setActiveModal('group_info')}
            title="Group Info & Members"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#5288c1]/20 text-[#5288c1] hover:bg-[#5288c1]/30 text-xs font-medium cursor-pointer transition mr-1"
          >
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">Group Info</span>
          </button>
        )}

        <button
          title="Voice Call"
          onClick={() => alert('Starting secure Klea Voice Call...')}
          className={`p-2 rounded-xl transition cursor-pointer ${theme === 'light' ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-100' : 'text-[#7f91a4] hover:text-white hover:bg-white/5'}`}
        >
          <Phone className="w-5 h-5" />
        </button>

        <button
          title="Video Call"
          onClick={() => alert('Starting secure Klea Video Call...')}
          className={`p-2 rounded-xl transition cursor-pointer ${theme === 'light' ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-100' : 'text-[#7f91a4] hover:text-white hover:bg-white/5'}`}
        >
          <Video className="w-5 h-5" />
        </button>

        {/* Chat Details Toggle Button */}
        <button
          onClick={toggleChatDetails}
          title={showChatDetails ? 'Close Chat Info' : 'Chat Info & Shared Media'}
          className={`p-2 rounded-xl transition cursor-pointer ${
            showChatDetails
              ? 'bg-[#5288c1] text-white shadow-md'
              : theme === 'light'
              ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              : 'text-[#7f91a4] hover:text-white hover:bg-white/5'
          }`}
        >
          <Info className="w-5 h-5" />
        </button>

        {/* 3-dots more menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            title="More Options"
            className={`p-2 rounded-xl transition cursor-pointer ${theme === 'light' ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-100' : 'text-[#7f91a4] hover:text-white hover:bg-white/5'}`}
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <div className={`absolute right-0 top-10 w-48 rounded-2xl shadow-2xl p-1.5 z-40 space-y-1 animate-in fade-in zoom-in-95 border ${theme === 'light' ? 'bg-white border-gray-200 text-gray-800' : 'bg-[#182533] border-white/10 text-white'}`}>
              {isGroup && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setActiveModal('group_info');
                  }}
                  className={`w-full px-3 py-2 text-left rounded-xl text-xs flex items-center gap-2 cursor-pointer ${theme === 'light' ? 'hover:bg-gray-100 text-gray-800' : 'hover:bg-white/5 text-white'}`}
                >
                  <Info className="w-4 h-4 text-[#5288c1]" />
                  <span>Group Details</span>
                </button>
              )}
              <button
                onClick={() => {
                  setShowMenu(false);
                  toggleTheme();
                }}
                className={`w-full px-3 py-2 text-left rounded-xl text-xs flex items-center gap-2 cursor-pointer ${theme === 'light' ? 'hover:bg-gray-100 text-gray-800' : 'hover:bg-white/5 text-white'}`}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>Day Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-blue-500" />
                    <span>Night Mode</span>
                  </>
                )}
              </button>
              <button
                onClick={handleClearHistory}
                className="w-full px-3 py-2 text-left rounded-xl hover:bg-red-500/10 text-xs text-red-500 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear History</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
