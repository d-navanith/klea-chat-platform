import React, { useState } from 'react';
import { X, Link2, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';

export const JoinGroupModal: React.FC = () => {
  const { activeModal, setActiveModal, token, addChat, setActiveChatId, theme } = useStore();
  const [inviteInput, setInviteInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (activeModal !== 'join_group') return null;

  const handleJoin = async () => {
    if (!inviteInput.trim()) return;

    // Extract code from link if full URL pasted
    let code = inviteInput.trim();
    if (code.includes('/join/')) {
      code = code.split('/join/')[1].split('/')[0];
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/chats/join/${code}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join group');

      if (data.chat) {
        addChat(data.chat);
        setActiveChatId(data.chat.id);
        setActiveModal(null);
        setInviteInput('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
            <Link2 className="w-5 h-5 text-[#5288c1]" />
            <span className="font-bold text-sm">Join Private Group</span>
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

        <div className="p-5 space-y-4">
          <p className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
            Paste the private invite link or invite code shared by your group administrator.
          </p>

          <div>
            <label
              className={`text-[11px] font-semibold uppercase tracking-wider block mb-1 ${
                theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'
              }`}
            >
              Invite Link or Code
            </label>
            <input
              type="text"
              placeholder="e.g. join_abc123 or https://..."
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#5288c1] border ${
                theme === 'light'
                  ? 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'
                  : 'bg-white/5 border-white/10 text-white placeholder-white/30'
              }`}
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={loading || !inviteInput.trim()}
            className="w-full py-2.5 rounded-xl bg-[#5288c1] hover:bg-[#5d9ad8] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-xs"
          >
            <span>{loading ? 'Joining...' : 'Join Group'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
