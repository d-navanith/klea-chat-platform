import React, { useState, useEffect } from 'react';
import { X, Search, MessageSquare } from 'lucide-react';
import { useStore, type User } from '../../store/useStore';
import { getSocket } from '../../services/socket';

export const ContactsModal: React.FC = () => {
  const { activeModal, setActiveModal, token, addChat, setActiveChatId, chats, theme } = useStore();
  const [contacts, setContacts] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeModal === 'contacts' && token) {
      setLoading(true);
      fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.users) setContacts(data.users);
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
      setContacts((prev) =>
        prev.map((c) =>
          c.id === userId ? { ...c, isOnline, lastSeen: lastSeen || c.lastSeen } : c
        )
      );
    };

    socket.on('user_status', handleUserStatus);
    return () => {
      socket.off('user_status', handleUserStatus);
    };
  }, []);

  if (activeModal !== 'contacts') return null;

  const filtered = contacts.filter(
    (c) =>
      c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.username.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleStartChat = async (targetUser: User) => {
    // Check if direct chat already exists
    const existing = chats.find(
      (c) => c.type === 'DIRECT' && c.members.some((m) => m.userId === targetUser.id)
    );

    if (existing) {
      setActiveChatId(existing.id);
      setActiveModal(null);
      return;
    }

    // Otherwise create direct chat
    try {
      const res = await fetch('/api/chats/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: targetUser.id }),
      });
      const data = await res.json();
      if (data.chat) {
        addChat(data.chat);
        setActiveChatId(data.chat.id);
      }
      setActiveModal(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div
        className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col border max-h-[85vh] transition-colors ${
          theme === 'light'
            ? 'bg-white border-gray-200 text-gray-900'
            : 'bg-[#17212b] border-white/10 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            theme === 'light' ? 'bg-[#f4f7fa] border-gray-200' : 'bg-[#111923] border-white/5'
          }`}
        >
          <div>
            <h3 className="text-sm font-bold">Contacts</h3>
            <p className={`text-[11px] ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
              Company Colleagues & Directory
            </p>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
              theme === 'light'
                ? 'text-gray-400 hover:bg-gray-200 hover:text-gray-800'
                : 'text-[#7f91a4] hover:bg-white/10 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className={`p-4 border-b ${theme === 'light' ? 'border-gray-200 bg-white' : 'border-white/5'}`}>
          <div className="relative">
            <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`} />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs focus:outline-none focus:border-[#5288c1] border ${
                theme === 'light'
                  ? 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'
                  : 'bg-white/5 border-white/10 text-white placeholder-[#7f91a4]'
              }`}
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className={`flex-1 overflow-y-auto p-2 divide-y ${theme === 'light' ? 'divide-gray-100' : 'divide-white/5'}`}>
          {loading ? (
            <div className={`py-12 text-center text-xs ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`}>
              Loading colleagues...
            </div>
          ) : filtered.length === 0 ? (
            <div className={`py-12 text-center text-xs ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`}>
              No contacts found matching your search.
            </div>
          ) : (
            filtered.map((contact) => (
              <div
                key={contact.id}
                onClick={() => handleStartChat(contact)}
                className={`p-3 rounded-2xl transition flex items-center justify-between cursor-pointer group ${
                  theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={contact.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${contact.username}`}
                      alt={contact.displayName}
                      className={`w-10 h-10 rounded-full object-cover border ${
                        theme === 'light' ? 'border-gray-200' : 'border-white/10'
                      }`}
                    />
                    {contact.isOnline && (
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#4fae4e] ring-2 ${
                          theme === 'light' ? 'ring-white' : 'ring-[#17212b]'
                        }`}
                      />
                    )}
                  </div>

                  <div>
                    <div className={`text-xs font-bold flex items-center gap-2 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                      {contact.displayName}
                      {contact.role === 'ADMIN' && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                            theme === 'light'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          Admin
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
                      @{contact.username}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] group-hover:hidden ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`}>
                    {contact.isOnline ? '🟢 Online' : 'Offline'}
                  </span>
                  <div className="hidden group-hover:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5288c1] text-white text-xs font-semibold shadow-xs">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
