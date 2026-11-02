import React, { useState, useEffect } from 'react';
import { X, CornerUpRight, Search, Check, Send, Bookmark, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { emitForwardMessage, getSocket } from '../services/socket';

export const ForwardModal: React.FC = () => {
  const { activeModal, setActiveModal, chats, addChat, token, user, forwardingMessage, setForwardingMessage, theme } = useStore();
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Proactively ensure Saved Messages chat is fetched/created
  useEffect(() => {
    if (activeModal === 'forward' && token) {
      const hasSaved = chats.some((c) => c.type === 'SAVED');
      if (!hasSaved) {
        fetch('/api/chats/saved', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.chat) {
              addChat(data.chat);
              getSocket()?.emit('join_chat', data.chat.id);
            }
          })
          .catch((err) => console.error('Failed to ensure saved chat:', err));
      }
    }
  }, [activeModal, token]);

  if (activeModal !== 'forward' || !forwardingMessage) return null;

  const savedChat = chats.find((c) => c.type === 'SAVED');

  const getOrCreateSavedChatId = async (): Promise<string | null> => {
    if (savedChat) return savedChat.id;
    if (!token) return null;
    try {
      const res = await fetch('/api/chats/saved', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.chat) {
        addChat(data.chat);
        getSocket()?.emit('join_chat', data.chat.id);
        return data.chat.id;
      }
    } catch (e) {
      console.error('Failed to create/get saved messages chat:', e);
    }
    return null;
  };

  const isSavedSelected = savedChat
    ? selectedChatIds.includes(savedChat.id)
    : selectedChatIds.includes('__saved_messages__');

  const toggleSelectSaved = () => {
    const targetKey = savedChat ? savedChat.id : '__saved_messages__';
    setSelectedChatIds((prev) =>
      prev.includes(targetKey) ? prev.filter((id) => id !== targetKey) : [...prev, targetKey]
    );
  };

  const toggleSelectChat = (id: string) => {
    setSelectedChatIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  // Instant 1-click forward directly to Saved Messages
  const handleQuickForwardToSaved = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!forwardingMessage) return;
    setSending(true);

    let targetId = savedChat?.id;
    if (!targetId) {
      targetId = await getOrCreateSavedChatId() || undefined;
    }

    if (targetId) {
      emitForwardMessage(forwardingMessage.id, [targetId]);
      setSuccessMsg('Forwarded to Saved Messages! 🔖');
      setTimeout(() => {
        setSending(false);
        setSuccessMsg('');
        setForwardingMessage(null);
        setActiveModal(null);
        setSelectedChatIds([]);
      }, 700);
    } else {
      setSending(false);
    }
  };

  const handleForward = async () => {
    if (selectedChatIds.length === 0 || !forwardingMessage) return;
    setSending(true);

    let finalChatIds = [...selectedChatIds];
    if (finalChatIds.includes('__saved_messages__')) {
      const savedId = await getOrCreateSavedChatId();
      finalChatIds = finalChatIds.filter((id) => id !== '__saved_messages__');
      if (savedId) finalChatIds.push(savedId);
    }

    if (finalChatIds.length > 0) {
      emitForwardMessage(forwardingMessage.id, finalChatIds);
    }

    setSuccessMsg('Message forwarded successfully!');
    setTimeout(() => {
      setSending(false);
      setSuccessMsg('');
      setForwardingMessage(null);
      setActiveModal(null);
      setSelectedChatIds([]);
    }, 700);
  };

  // Filter other chats (non-saved)
  const otherChats = chats.filter((c) => {
    if (c.type === 'SAVED') return false;
    const otherMember = c.members.find((m) => m.userId !== user?.id)?.user;
    return (
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      otherMember?.displayName.toLowerCase().includes(search.toLowerCase()) ||
      otherMember?.username.toLowerCase().includes(search.toLowerCase())
    );
  });

  const matchesSavedSearch =
    !search.trim() ||
    'saved messages'.includes(search.toLowerCase()) ||
    'saved'.includes(search.toLowerCase()) ||
    'notes'.includes(search.toLowerCase()) ||
    'cloud'.includes(search.toLowerCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className={`relative w-full max-w-sm rounded-2xl flex flex-col overflow-hidden shadow-2xl border animate-in fade-in zoom-in-95 duration-200 transition-colors ${
          theme === 'light'
            ? 'bg-white border-gray-200 text-gray-900'
            : 'bg-[#17212b] border-white/10 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            theme === 'light' ? 'bg-[#f4f7fa] border-gray-200 text-gray-900' : 'bg-[#0e1621] border-white/10 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <CornerUpRight className="w-5 h-5 text-[#5288c1]" />
            <span className="font-bold text-sm">Forward Message</span>
          </div>
          <button
            onClick={() => {
              setActiveModal(null);
              setForwardingMessage(null);
            }}
            className={`p-1 rounded-lg transition cursor-pointer ${
              theme === 'light'
                ? 'hover:bg-gray-200 text-gray-500 hover:text-gray-900'
                : 'hover:bg-white/10 text-white/70 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success notification banner */}
        {successMsg && (
          <div className="p-3 bg-emerald-500/20 text-emerald-400 border-b border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Message preview snippet */}
        <div
          className={`p-3 border-b flex items-center gap-2 ${
            theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/5'
          }`}
        >
          <div className="w-1 h-8 rounded-full bg-[#5288c1] shrink-0" />
          <div className="text-xs truncate">
            <div className="font-semibold text-[#5288c1] text-[11px]">
              {forwardingMessage.sender.displayName}
            </div>
            <div className={`truncate text-[11px] ${theme === 'light' ? 'text-gray-700' : 'text-white/80'}`}>
              {forwardingMessage.content || 'Photo/Media attachment'}
            </div>
          </div>
        </div>

        {/* Pinned "Saved Messages" Top Option */}
        {matchesSavedSearch && (
          <div className={`p-2.5 border-b ${theme === 'light' ? 'bg-blue-50/40 border-gray-200' : 'bg-[#5288c1]/10 border-white/5'}`}>
            <div
              onClick={toggleSelectSaved}
              className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                isSavedSelected
                  ? theme === 'light'
                    ? 'bg-[#5288c1]/15 border-[#5288c1]'
                    : 'bg-[#5288c1]/30 border-[#5288c1]'
                  : theme === 'light'
                  ? 'bg-white border-blue-200/80 hover:border-[#5288c1]'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#5288c1] to-[#6ba4df] text-white flex items-center justify-center shadow-sm shrink-0">
                  <Bookmark className="w-5 h-5 fill-white/20" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-bold flex items-center gap-1.5 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    <span>Saved Messages</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#5288c1]/20 text-[#5288c1] font-semibold">
                      My Cloud
                    </span>
                  </div>
                  <div className={`text-[11px] truncate ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
                    Forward to your personal storage
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleQuickForwardToSaved}
                  disabled={sending}
                  className="px-2.5 py-1 rounded-lg bg-[#5288c1] hover:bg-[#5d9ad8] text-white text-[11px] font-bold cursor-pointer transition shadow-xs flex items-center gap-1"
                  title="Forward directly to Saved Messages in 1 click"
                >
                  <Bookmark className="w-3 h-3" />
                  <span>Forward</span>
                </button>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                    isSavedSelected
                      ? 'bg-[#5288c1] border-[#5288c1] text-white'
                      : theme === 'light'
                      ? 'border-gray-300'
                      : 'border-white/20'
                  }`}
                >
                  {isSavedSelected && <Check className="w-3.5 h-3.5 stroke-3" />}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div
          className={`p-3 border-b flex items-center gap-2 ${
            theme === 'light' ? 'border-gray-200 bg-white' : 'border-white/5 bg-[#17212b]'
          }`}
        >
          <Search className={`w-4 h-4 ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`} />
          <input
            type="text"
            placeholder="Search chats to forward..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full bg-transparent border-none text-xs focus:outline-none ${
              theme === 'light' ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-white/40'
            }`}
          />
        </div>

        {/* Other Chats List */}
        <div className="flex-1 max-h-[240px] overflow-y-auto p-2 space-y-1">
          {otherChats.length === 0 && !matchesSavedSearch ? (
            <div className={`text-center py-8 text-xs ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`}>
              No conversations match your search
            </div>
          ) : (
            otherChats.map((c) => {
              const isGroup = c.type === 'GROUP';
              const otherMember = c.members.find((m) => m.userId !== user?.id)?.user;
              const isSelected = selectedChatIds.includes(c.id);

              return (
                <div
                  key={c.id}
                  onClick={() => toggleSelectChat(c.id)}
                  className={`p-2 rounded-xl flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? theme === 'light'
                        ? 'bg-[#5288c1]/10 border border-[#5288c1]/40'
                        : 'bg-[#2b5278]/40 border border-[#5288c1]/40'
                      : theme === 'light'
                      ? 'hover:bg-gray-100'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={
                        isGroup
                          ? c.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.title}`
                          : otherMember?.avatarUrl ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${otherMember?.username || 'user'}`
                      }
                      alt={c.title || 'Chat'}
                      className={`w-8 h-8 object-cover bg-gray-200 shrink-0 ${
                        isGroup ? 'rounded-lg' : 'rounded-full'
                      }`}
                    />
                    <div className="truncate min-w-0">
                      <div className={`truncate text-xs font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                        {isGroup ? c.title : otherMember?.displayName}
                      </div>
                      <div className={`truncate text-[10px] ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
                        {isGroup ? `${c.members.length} members` : `@${otherMember?.username}`}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${
                      isSelected
                        ? 'bg-[#5288c1] border-[#5288c1] text-white'
                        : theme === 'light'
                        ? 'border-gray-300'
                        : 'border-white/20'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-3" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-3 border-t flex justify-between items-center ${
            theme === 'light' ? 'bg-[#f4f7fa] border-gray-200' : 'bg-[#0e1621] border-white/10'
          }`}
        >
          <span className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
            {selectedChatIds.length} {selectedChatIds.length === 1 ? 'chat' : 'chats'} selected
          </span>
          <button
            onClick={handleForward}
            disabled={sending || selectedChatIds.length === 0}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
              selectedChatIds.length === 0
                ? theme === 'light'
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-[#5288c1] hover:bg-[#5d9ad8]'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sending ? 'Forwarding...' : 'Forward'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
