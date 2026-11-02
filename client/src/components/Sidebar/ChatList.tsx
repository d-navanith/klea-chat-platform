import React, { useState } from 'react';
import { Search, Plus, Lock, CheckCheck, MessageSquare, Users, Bookmark, Link2, UserPlus, Menu } from 'lucide-react';
import { useStore, type Message } from '../../store/useStore';
import { emitMarkAsRead } from '../../services/socket';
import { MainMenuDrawer } from './MainMenuDrawer';

export const ChatList: React.FC = () => {
  const { chats, activeChatId, setActiveChatId, user, activeFolder, setActiveFolder, setActiveModal, markChatAsRead, theme } = useStore();
  const [search, setSearch] = useState('');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showMainMenu, setShowMainMenu] = useState(false);

  const getMessagePreview = (msg?: Message, isSecret?: boolean) => {
    if (!msg) return 'No messages yet';
    if (isSecret) return '🔒 Encrypted Secret Message';
    if (msg.attachments && msg.attachments.length > 0) {
      const att = msg.attachments[0];
      if (att.fileType.startsWith('image/')) {
        return msg.content ? `📷 ${msg.content}` : '📷 Photo';
      }
      if (att.fileType.startsWith('audio/')) {
        return '🎵 Music / Voice';
      }
      return `📎 ${att.fileName || 'Document'}`;
    }
    if (msg.content?.startsWith('{')) {
      try {
        const parsed = JSON.parse(msg.content);
        if (parsed.type === 'POLL') return `📊 Poll: ${parsed.question}`;
        if (parsed.type === 'ARTICLE') return `📰 Article: ${parsed.title}`;
        if (parsed.type === 'LOCATION') return `📍 Location: ${parsed.title}`;
      } catch {}
    }
    if (msg.content?.startsWith('💎 Sent')) {
      return msg.content;
    }
    return msg.content || '📷 Photo';
  };

  // Filter chats by search and active folder
  const filteredChats = chats.filter((c) => {
    if (activeFolder === 'groups' && c.type !== 'GROUP') return false;
    if (activeFolder === 'secret' && c.type !== 'SECRET') return false;
    if (activeFolder === 'direct' && c.type !== 'DIRECT') return false;

    if (!search.trim()) return true;

    const q = search.toLowerCase().trim();
    if (c.title?.toLowerCase().includes(q)) return true;
    if (c.type === 'SAVED' && 'saved messages'.includes(q)) return true;

    const otherMember = c.members?.find((m) => m.userId !== user?.id)?.user;
    if (otherMember?.displayName?.toLowerCase().includes(q)) return true;
    if (otherMember?.username?.toLowerCase().includes(q)) return true;

    return false;
  });

  return (
    <div className={`w-80 md:w-96 border-r flex flex-col h-full shrink-0 select-none ${theme === 'light' ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#17212b] border-white/5 text-white'}`}>
      {/* Top Header / Search Bar */}
      <div className={`p-3 border-b flex items-center gap-2 relative ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#17212b] border-white/5'}`}>
        {/* Telegram Hamburger Menu Button */}
        <button
          onClick={() => setShowMainMenu(true)}
          title="Klea Menu"
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer shrink-0 ${theme === 'light' ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-900' : 'text-[#7f91a4] hover:bg-white/10 hover:text-white'}`}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className={`flex-1 flex items-center gap-2 px-3 py-2 border rounded-xl ${theme === 'light' ? 'bg-gray-100 border-gray-200' : 'bg-white/5 border-white/5'}`}>
          <Search className={`w-4 h-4 ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`} />
          <input
            type="text"
            placeholder="Search employees & chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full bg-transparent border-none text-xs focus:outline-none ${theme === 'light' ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-white/40'}`}
          />
        </div>

        {/* Plus Action Menu Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowPlusMenu(!showPlusMenu)}
            title="Create or Join"
            className="w-9 h-9 rounded-xl bg-[#5288c1] hover:bg-[#5d9ad8] text-white flex items-center justify-center transition cursor-pointer shadow-md shrink-0"
          >
            <Plus className="w-5 h-5" />
          </button>

          {showPlusMenu && (
            <div className={`absolute right-0 top-11 w-52 rounded-2xl shadow-2xl p-1.5 z-40 space-y-1 animate-in fade-in zoom-in-95 border ${theme === 'light' ? 'bg-white border-gray-200 text-gray-800' : 'bg-[#182533] border-white/10 text-white'}`}>
              <button
                onClick={() => {
                  setShowPlusMenu(false);
                  setActiveModal('new_chat');
                }}
                className={`w-full px-3 py-2 text-left rounded-xl text-xs flex items-center gap-2.5 cursor-pointer ${theme === 'light' ? 'hover:bg-gray-100 text-gray-800' : 'hover:bg-white/5 text-white'}`}
              >
                <UserPlus className="w-4 h-4 text-[#5288c1]" />
                <span>New Direct Message</span>
              </button>
              <button
                onClick={() => {
                  setShowPlusMenu(false);
                  setActiveModal('new_group');
                }}
                className={`w-full px-3 py-2 text-left rounded-xl text-xs flex items-center gap-2.5 cursor-pointer ${theme === 'light' ? 'hover:bg-gray-100 text-gray-800' : 'hover:bg-white/5 text-white'}`}
              >
                <Users className="w-4 h-4 text-emerald-500" />
                <span>New Private Group</span>
              </button>
              <button
                onClick={() => {
                  setShowPlusMenu(false);
                  setActiveModal('join_group');
                }}
                className={`w-full px-3 py-2 text-left rounded-xl text-xs flex items-center gap-2.5 cursor-pointer ${theme === 'light' ? 'hover:bg-gray-100 text-gray-800' : 'hover:bg-white/5 text-white'}`}
              >
                <Link2 className="w-4 h-4 text-blue-500" />
                <span>Join Group via Link</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Telegram Web A Folder Tabs */}
      <div className={`flex items-center px-2 py-1.5 gap-1 border-b overflow-x-auto no-scrollbar shrink-0 ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#17212b] border-white/5'}`}>
        {[
          { id: 'all', label: 'All' },
          { id: 'direct', label: 'Direct' },
          { id: 'groups', label: 'Groups' },
          { id: 'secret', label: 'Secret' },
        ].map((tab) => {
          const isActive = activeFolder === tab.id;
          const count = chats
            .filter((c) => {
              if (tab.id === 'groups') return c.type === 'GROUP';
              if (tab.id === 'secret') return c.type === 'SECRET';
              if (tab.id === 'direct') return c.type === 'DIRECT';
              return true;
            })
            .reduce((acc, c) => acc + (c.unreadCount || 0), 0);

          return (
            <button
              key={tab.id}
              onClick={() => setActiveFolder(tab.id as 'all' | 'direct' | 'groups' | 'secret')}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? 'bg-[#5288c1] text-white shadow-sm'
                  : theme === 'light'
                  ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  : 'text-[#7f91a4] hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white text-[#5288c1]' : 'bg-[#4fae4e] text-white'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Chats Scrollable Stream */}
      <div className={`flex-1 overflow-y-auto divide-y ${theme === 'light' ? 'divide-gray-100' : 'divide-white/5'}`}>
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#7f91a4] flex flex-col items-center gap-3">
            <MessageSquare className="w-8 h-8 opacity-40" />
            <span>No conversations yet</span>
            <div className="flex flex-col gap-1.5 mt-2">
              <button
                onClick={() => setActiveModal('new_chat')}
                className="text-[#5288c1] hover:underline cursor-pointer"
              >
                Start a direct chat
              </button>
              <button
                onClick={() => setActiveModal('new_group')}
                className="text-emerald-500 hover:underline cursor-pointer"
              >
                Create a private group
              </button>
            </div>
          </div>
        ) : (
          filteredChats.map((c) => {
            const isGroup = c.type === 'GROUP';
            const isSaved = c.type === 'SAVED';
            const isSecret = c.type === 'SECRET';
            const isActive = c.id === activeChatId;
            const otherMember = c.members.find((m) => m.userId !== user?.id)?.user;
            const lastMsg = c.messages[0];

            return (
              <div
                key={c.id}
                onClick={() => {
                  setActiveChatId(c.id);
                  if (c.unreadCount && c.unreadCount > 0) {
                    markChatAsRead(c.id);
                    emitMarkAsRead(c.id);
                  }
                }}
                className={`px-3.5 py-3 flex items-center gap-3 cursor-pointer transition ${
                  isActive
                    ? 'bg-[#5288c1] text-white'
                    : theme === 'light'
                    ? 'hover:bg-gray-100 text-gray-900'
                    : 'hover:bg-white/5 text-white'
                }`}
              >
                {/* Avatar with Online / Group Badge */}
                <div className="relative shrink-0">
                  {isSaved ? (
                    <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center border border-blue-500/30">
                      <Bookmark className="w-6 h-6" />
                    </div>
                  ) : (
                    <>
                      <img
                        src={
                          isGroup
                            ? c.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.title}`
                            : otherMember?.avatarUrl ||
                              `https://api.dicebear.com/7.x/bottts/svg?seed=${otherMember?.username || 'user'}`
                        }
                        alt={c.title || otherMember?.displayName || 'Chat'}
                        className={`w-12 h-12 object-cover bg-black/5 ${
                          isGroup ? 'rounded-2xl' : 'rounded-full'
                        }`}
                      />
                      {!isGroup && otherMember?.isOnline && (
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#4fae4e] ring-2 ${theme === 'light' ? 'ring-white' : 'ring-[#17212b]'}`} />
                      )}
                    </>
                  )}
                </div>

                {/* Chat details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      {isSecret && <Lock className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-emerald-500'}`} />}
                      {isGroup && <Users className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-[#5288c1]'}`} />}
                      {isSaved && <Bookmark className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-blue-500'}`} />}
                      <span
                        className={`text-sm font-semibold truncate ${
                          isActive
                            ? 'text-white'
                            : isSecret
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
                          ? c.title
                          : otherMember?.displayName || 'Direct Chat'}
                      </span>
                    </div>
                    {lastMsg && (
                      <span className={`text-[11px] ml-2 shrink-0 ${isActive ? 'text-white/80' : theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`}>
                        {new Date(lastMsg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  {/* Message preview snippet & Unread Green Badge */}
                  <div className={`flex items-center justify-between mt-1 text-xs ${isActive ? 'text-white/80' : theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
                    <span className="truncate pr-2">
                      {isGroup && lastMsg?.sender
                        ? `${lastMsg.sender.displayName}: `
                        : ''}
                      {getMessagePreview(lastMsg, isSecret)}
                    </span>

                    {/* Unread badge in iconic Telegram Green */}
                    {c.unreadCount && c.unreadCount > 0 && !isActive ? (
                      <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#4fae4e] text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-sm animate-in zoom-in-75">
                        {c.unreadCount}
                      </span>
                    ) : (
                      lastMsg?.senderId === user?.id && (
                        <CheckCheck
                          className={`w-3.5 h-3.5 shrink-0 ${
                            lastMsg.status === 'READ'
                              ? 'text-[#4fae4e]'
                              : isActive
                              ? 'text-white'
                              : 'text-[#5288c1]'
                          }`}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Main Hamburger Drawer */}
      <MainMenuDrawer isOpen={showMainMenu} onClose={() => setShowMainMenu(false)} />
    </div>
  );
};
