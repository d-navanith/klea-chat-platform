import React, { useState, useEffect } from 'react';
import { X, Search, Lock, MessageSquare } from 'lucide-react';
import { useStore, type User } from '../store/useStore';
import { generateECDHKeyPair } from '../services/crypto';
import { getSocket, storeLocalKeyPair } from '../services/socket';

export const NewChatModal: React.FC = () => {
  const { activeModal, setActiveModal, token, addChat, setActiveChatId, theme } = useStore();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeModal === 'new_chat' && token) {
      setLoading(true);
      fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.users) setUsers(data.users);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [activeModal, token]);

  // Real-time listener for live online/offline presence changes
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleUserStatus = ({ userId, isOnline, lastSeen }: { userId: string; isOnline: boolean; lastSeen?: string }) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isOnline, lastSeen: lastSeen || u.lastSeen } : u
        )
      );
    };

    socket.on('user_status', handleUserStatus);
    return () => {
      socket.off('user_status', handleUserStatus);
    };
  }, []);

  if (activeModal !== 'new_chat') return null;

  const handleStartDirectChat = async (targetUserId: string) => {
    try {
      const res = await fetch('/api/chats/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId, type: 'DIRECT' }),
      });
      const data = await res.json();
      if (data.chat) {
        addChat(data.chat);
        setActiveChatId(data.chat.id);
        setActiveModal(null);
      }
    } catch (err) {
      console.error('Error starting direct chat:', err);
    }
  };

  const handleStartSecretChat = async (targetUserId: string) => {
    try {
      // 1. Generate initiator ECDH keypair
      const { keyPair, publicKeyBase64 } = await generateECDHKeyPair();

      const res = await fetch('/api/chats/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId,
          type: 'SECRET',
          initiatorPubkey: publicKeyBase64,
        }),
      });

      const data = await res.json();
      if (data.chat) {
        // Cache our keypair locally
        storeLocalKeyPair(data.chat.id, keyPair);

        // Emit socket key offer to recipient
        getSocket()?.emit('e2ee_key_offer', {
          chatId: data.chat.id,
          targetUserId,
          initiatorPubkey: publicKeyBase64,
        });

        addChat(data.chat);
        setActiveChatId(data.chat.id);
        setActiveModal(null);
      }
    } catch (err) {
      console.error('Error starting secret chat:', err);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className={`relative w-full max-w-md rounded-2xl flex flex-col overflow-hidden shadow-2xl border animate-in fade-in zoom-in-95 duration-200 transition-colors ${
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
          <span className="font-bold text-sm">New Message</span>
          <button
            onClick={() => setActiveModal(null)}
            className={`p-1 rounded-lg transition cursor-pointer ${
              theme === 'light'
                ? 'hover:bg-gray-200 text-gray-500 hover:text-gray-900'
                : 'hover:bg-white/10 text-white/70 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className={`p-3 border-b ${theme === 'light' ? 'border-gray-200 bg-white' : 'border-white/5'}`}>
          <div
            className={`flex items-center gap-2 px-3 py-2 border rounded-xl ${
              theme === 'light'
                ? 'bg-gray-100 border-gray-200 text-gray-900'
                : 'bg-white/5 border-white/10 text-white'
            }`}
          >
            <Search className={`w-4 h-4 ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`} />
            <input
              type="text"
              placeholder="Search people by name or @username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`bg-transparent border-none text-xs w-full focus:outline-none ${
                theme === 'light' ? 'placeholder-gray-400 text-gray-900' : 'placeholder-white/40 text-white'
              }`}
            />
          </div>
        </div>

        {/* Users list */}
        <div className="flex-1 max-h-[380px] overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className={`text-center py-8 text-xs ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`}>
              Loading contacts...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className={`text-center py-8 text-xs ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`}>
              No contacts found
            </div>
          ) : (
            filteredUsers.map((u) => (
              <div
                key={u.id}
                className={`p-2.5 rounded-xl flex items-center justify-between transition group ${
                  theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                      alt={u.displayName}
                      className="w-10 h-10 rounded-full object-cover bg-gray-200"
                    />
                    {u.isOnline && (
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#4fae4e] ring-2 ${
                          theme === 'light' ? 'ring-white' : 'ring-[#17212b]'
                        }`}
                      />
                    )}
                  </div>
                  <div>
                    <div className={`text-xs font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                      {u.displayName}
                    </div>
                    <div className={`text-[11px] ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
                      @{u.username}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                  <button
                    onClick={() => handleStartDirectChat(u.id)}
                    title="Direct Chat"
                    className="p-2 rounded-lg bg-[#5288c1] hover:bg-[#5d9ad8] text-white cursor-pointer transition text-xs flex items-center gap-1 shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>

                  <button
                    onClick={() => handleStartSecretChat(u.id)}
                    title="New Secret Chat (E2EE)"
                    className={`p-2 rounded-lg cursor-pointer transition text-xs flex items-center gap-1 ${
                      theme === 'light'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Secret</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
