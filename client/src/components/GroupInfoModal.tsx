import React, { useState } from 'react';
import { X, Users, Copy, Check, Shield, UserPlus, Trash2, LogOut } from 'lucide-react';
import { useStore } from '../store/useStore';

export const GroupInfoModal: React.FC = () => {
  const { activeModal, setActiveModal, activeChatId, chats, user, token, updateChat, theme } = useStore();
  const [copied, setCopied] = useState(false);
  const [usernameToAdd, setUsernameToAdd] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (activeModal !== 'group_info' || !activeChatId) return null;

  const chat = chats.find((c) => c.id === activeChatId);
  if (!chat || chat.type !== 'GROUP') return null;

  const myMembership = chat.members.find((m) => m.userId === user?.id);
  const isAdminOrOwner = myMembership?.role === 'OWNER' || myMembership?.role === 'ADMIN';

  const inviteLink = `${window.location.origin}/join/${chat.inviteCode || chat.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddMember = async () => {
    if (!usernameToAdd.trim()) return;
    setLoading(true);
    setStatusMsg('');

    try {
      const res = await fetch(`/api/chats/${chat.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: usernameToAdd.trim().replace('@', '') }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add member');

      if (data.chat) {
        updateChat(chat.id, data.chat);
        setUsernameToAdd('');
        setStatusMsg('Colleague added successfully! 🎉');
        setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!confirm('Remove this member from the private group?')) return;

    try {
      const res = await fetch(`/api/chats/${chat.id}/members/${targetUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.chat) {
        updateChat(chat.id, data.chat);
      }
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

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
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#5288c1]" />
            <span className="font-bold text-sm">Group Info</span>
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

        {/* Group Hero */}
        <div
          className={`p-6 flex flex-col items-center text-center border-b ${
            theme === 'light'
              ? 'bg-gradient-to-b from-[#f0f4f8] to-white border-gray-200'
              : 'bg-gradient-to-b from-[#182533] to-[#121c27] border-white/5'
          }`}
        >
          <img
            src={chat.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.title}`}
            alt={chat.title || 'Group'}
            className={`w-16 h-16 rounded-2xl object-cover shadow-md border-2 mb-3 ${
              theme === 'light' ? 'border-gray-200' : 'border-white/10'
            }`}
          />
          <h3 className={`font-bold text-base ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
            {chat.title}
          </h3>
          <p className={`text-xs mt-0.5 ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
            {chat.members.length} {chat.members.length === 1 ? 'member' : 'members'} • Private Group
          </p>
          {chat.description && (
            <p className={`text-xs mt-2 max-w-xs ${theme === 'light' ? 'text-gray-600' : 'text-white/70'}`}>
              {chat.description}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-2.5 rounded-xl text-xs text-center font-medium ${
                statusMsg.startsWith('Error')
                  ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'
              }`}
            >
              {statusMsg}
            </div>
          )}

          {/* Private Invite Link (Admin only or all members depending on permission) */}
          <div
            className={`p-3.5 rounded-xl border space-y-2 ${
              theme === 'light' ? 'bg-[#f8fafc] border-gray-200' : 'bg-white/5 border-white/5'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold flex items-center gap-1.5 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                <Shield className="w-4 h-4 text-emerald-500" /> Private Invite Link
              </span>
              <span className={`text-[10px] ${theme === 'light' ? 'text-gray-400' : 'text-white/40'}`}>
                Admin permission
              </span>
            </div>
            <div
              className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono border ${
                theme === 'light' ? 'bg-white border-gray-200 text-gray-700' : 'bg-black/30 border-transparent text-white/70'
              }`}
            >
              <span className="truncate mr-2">{inviteLink}</span>
              <button
                onClick={handleCopyLink}
                className="px-2.5 py-1 rounded bg-[#5288c1] hover:bg-[#5d9ad8] text-white text-[11px] font-sans font-semibold flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Add Member Bar (Only Admins / Owner) */}
          {isAdminOrOwner && (
            <div
              className={`p-3.5 rounded-xl border space-y-2 ${
                theme === 'light' ? 'bg-[#f8fafc] border-gray-200' : 'bg-white/5 border-white/5'
              }`}
            >
              <span className={`font-semibold text-xs flex items-center gap-1.5 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                <UserPlus className="w-4 h-4 text-[#5288c1]" /> Add Colleague by Username
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="@username (e.g. durov, alice, bob)"
                  value={usernameToAdd}
                  onChange={(e) => setUsernameToAdd(e.target.value)}
                  className={`flex-1 px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-[#5288c1] ${
                    theme === 'light'
                      ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      : 'bg-black/20 border-white/10 text-white placeholder-white/40'
                  }`}
                />
                <button
                  onClick={handleAddMember}
                  disabled={loading || !usernameToAdd.trim()}
                  className="px-3.5 py-1.5 bg-[#5288c1] hover:bg-[#5d9ad8] text-white text-xs font-semibold rounded-lg cursor-pointer transition disabled:opacity-40 shadow-xs"
                >
                  {loading ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          )}

          {/* Members List */}
          <div>
            <div
              className={`text-xs font-semibold mb-2 uppercase tracking-wider ${
                theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'
              }`}
            >
              Group Members ({chat.members.length})
            </div>
            <div className="space-y-1.5">
              {chat.members.map((m) => {
                const isOwner = m.role === 'OWNER';
                const isAdmin = m.role === 'ADMIN';
                const isMe = m.userId === user?.id;

                return (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      theme === 'light'
                        ? 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                        : 'bg-white/5 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <img
                          src={
                            m.user.avatarUrl ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${m.user.username}`
                          }
                          alt={m.user.displayName}
                          className="w-8 h-8 rounded-full object-cover bg-gray-200"
                        />
                        {m.user.isOnline && (
                          <span
                            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#4fae4e] ring-2 ${
                              theme === 'light' ? 'ring-white' : 'ring-[#17212b]'
                            }`}
                          />
                        )}
                      </div>
                      <div>
                        <div className={`text-xs font-semibold flex items-center gap-1.5 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                          <span>{m.user.displayName}</span>
                          {isMe && (
                            <span className={`text-[10px] ${theme === 'light' ? 'text-gray-400' : 'text-white/50'}`}>
                              (You)
                            </span>
                          )}
                        </div>
                        <div className={`text-[10px] ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
                          @{m.user.username}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwner ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            theme === 'light'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          👑 Owner
                        </span>
                      ) : isAdmin ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            theme === 'light'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}
                        >
                          ⭐️ Admin
                        </span>
                      ) : (
                        <span className={`text-[10px] ${theme === 'light' ? 'text-gray-400' : 'text-white/40'}`}>
                          Member
                        </span>
                      )}

                      {/* Remove button for admins (cannot remove owner) */}
                      {isAdminOrOwner && !isOwner && !isMe && (
                        <button
                          onClick={() => handleRemoveMember(m.userId)}
                          title="Remove member"
                          className={`p-1 rounded transition cursor-pointer ${
                            theme === 'light'
                              ? 'text-gray-400 hover:text-red-500 hover:bg-gray-200'
                              : 'text-white/40 hover:text-red-400 hover:bg-white/10'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer: Leave Group */}
        <div
          className={`p-3 border-t flex justify-end ${
            theme === 'light' ? 'bg-[#f4f7fa] border-gray-200' : 'bg-[#0e1621] border-white/10'
          }`}
        >
          <button
            onClick={() => {
              if (confirm('Leave this group?')) {
                handleRemoveMember(user!.id);
                setActiveModal(null);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-500/10 cursor-pointer transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Leave Group
          </button>
        </div>
      </div>
    </div>
  );
};
