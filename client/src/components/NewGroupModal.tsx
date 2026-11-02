import React, { useState, useEffect } from 'react';
import { X, Users, Search, Check, Shield } from 'lucide-react';
import { useStore, type User } from '../store/useStore';

export const NewGroupModal: React.FC = () => {
  const { activeModal, setActiveModal, token, addChat, setActiveChatId, theme } = useStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeModal === 'new_group' && token) {
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

  if (activeModal !== 'new_group') return null;

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async () => {
    if (!title.trim()) {
      alert('Please enter a group name');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/chats/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          memberUserIds: selectedUserIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create group');
      }

      if (data.chat) {
        addChat(data.chat);
        setActiveChatId(data.chat.id);
        setActiveModal(null);
        setTitle('');
        setDescription('');
        setSelectedUserIds([]);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
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
            theme === 'light'
              ? 'bg-[#f4f7fa] border-gray-200 text-gray-900'
              : 'bg-[#0e1621] border-white/10 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#5288c1]" />
            <span className="font-bold text-sm">Create Private Group</span>
          </div>
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

        {/* Group Info Form */}
        <div
          className={`p-4 space-y-3 border-b ${
            theme === 'light' ? 'border-gray-200 bg-[#fbfcfd]' : 'border-white/5 bg-[#121c27]'
          }`}
        >
          <div>
            <label
              className={`text-[11px] font-semibold uppercase tracking-wider block mb-1 ${
                theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'
              }`}
            >
              Group Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Engineering Team, Marketing, Project Alpha"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#5288c1] border ${
                theme === 'light'
                  ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  : 'bg-white/5 border-white/10 text-white placeholder-white/40'
              }`}
            />
          </div>

          <div>
            <label
              className={`text-[11px] font-semibold uppercase tracking-wider block mb-1 ${
                theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'
              }`}
            >
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="Group topic or guidelines..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-[#5288c1] border ${
                theme === 'light'
                  ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  : 'bg-white/5 border-white/10 text-white placeholder-white/40'
              }`}
            />
          </div>

          <div
            className={`flex items-center gap-2 text-[11px] p-2 rounded-lg ${
              theme === 'light'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'text-[#7f91a4] bg-white/5'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Private group: Only group admins can invite and add colleagues.</span>
          </div>
        </div>

        {/* Member Search */}
        <div
          className={`p-3 border-b flex items-center gap-2 ${
            theme === 'light' ? 'border-gray-200 bg-white' : 'border-white/5 bg-[#17212b]'
          }`}
        >
          <Search className={`w-4 h-4 ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`} />
          <input
            type="text"
            placeholder="Add colleagues by name or @username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full bg-transparent border-none text-xs focus:outline-none ${
              theme === 'light' ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-white/40'
            }`}
          />
          {selectedUserIds.length > 0 && (
            <span className="text-xs bg-[#5288c1] text-white px-2 py-0.5 rounded-full font-bold">
              {selectedUserIds.length}
            </span>
          )}
        </div>

        {/* User Selection List */}
        <div className="flex-1 max-h-[260px] overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className={`text-center py-6 text-xs ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`}>
              Loading colleagues...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className={`text-center py-6 text-xs ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`}>
              No employees found
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isSelected = selectedUserIds.includes(u.id);
              return (
                <div
                  key={u.id}
                  onClick={() => toggleSelectUser(u.id)}
                  className={`p-2.5 rounded-xl flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? theme === 'light'
                        ? 'bg-[#5288c1]/10 border border-[#5288c1]/40'
                        : 'bg-[#2b5278]/40 border border-[#5288c1]/40'
                      : theme === 'light'
                      ? 'hover:bg-gray-100'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                      alt={u.displayName}
                      className="w-9 h-9 rounded-full object-cover bg-gray-200"
                    />
                    <div>
                      <div className={`text-xs font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                        {u.displayName}
                      </div>
                      <div className={`text-[11px] ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
                        @{u.username}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
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

        {/* Footer / Create Button */}
        <div
          className={`p-4 border-t flex justify-between items-center ${
            theme === 'light' ? 'bg-[#f4f7fa] border-gray-200' : 'bg-[#0e1621] border-white/10'
          }`}
        >
          <span className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
            {selectedUserIds.length} members selected
          </span>
          <button
            onClick={handleCreateGroup}
            disabled={submitting || !title.trim()}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-sm cursor-pointer ${
              !title.trim()
                ? theme === 'light'
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-[#5288c1] hover:bg-[#5d9ad8]'
            }`}
          >
            {submitting ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};
