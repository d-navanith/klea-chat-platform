import React, { useState, useEffect } from 'react';
import { X, Camera, Check, ShieldAlert, Sparkles, User, AtSign, FileText } from 'lucide-react';
import { useStore } from '../../store/useStore';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=face',
];

export const ProfileEditModal: React.FC = () => {
  const { user, setUser, token, activeModal, setActiveModal, theme } = useStore();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user, activeModal]);

  if (activeModal !== 'profile_edit' || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError('');
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName,
          username,
          bio,
          avatarUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setUser(data.user);
      setSuccess(true);
      setTimeout(() => {
        setActiveModal(null);
      }, 700);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div
        className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col border transition-colors ${
          theme === 'light'
            ? 'bg-white border-gray-200 text-gray-900'
            : 'bg-[#17212b] border-white/10 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`p-5 border-b flex items-center justify-between ${
            theme === 'light' ? 'bg-[#f4f7fa] border-gray-200 text-gray-900' : 'bg-[#111923] border-white/5 text-white'
          }`}
        >
          <h3 className="text-base font-bold">Edit Profile</h3>
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

        {/* Error / Success alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-500 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-600 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>Profile saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer mb-3">
              <img
                src={avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                alt={displayName}
                className="w-24 h-24 rounded-full object-cover border-2 border-[#5288c1] shadow-md"
              />
              <button
                type="button"
                onClick={generateRandomAvatar}
                title="Generate Random Avatar"
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white text-xs font-semibold gap-1"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 mt-1">
              {PRESET_AVATARS.map((url, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setAvatarUrl(url)}
                  className={`w-7 h-7 rounded-full overflow-hidden border-2 transition cursor-pointer ${
                    avatarUrl === url ? 'border-[#5288c1] scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt="preset" className="w-full h-full object-cover" />
                </button>
              ))}
              <button
                type="button"
                onClick={generateRandomAvatar}
                className={`px-2 py-1 rounded-full text-[10px] text-[#5288c1] font-semibold flex items-center gap-1 cursor-pointer transition ${
                  theme === 'light' ? 'bg-gray-100 hover:bg-gray-200' : 'bg-white/5 hover:bg-white/10'
                }`}
                title="New Dicebear Bot"
              >
                <Sparkles className="w-3 h-3" /> Dicebear
              </button>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label
              className={`text-[11px] font-semibold uppercase tracking-wider block mb-1 flex items-center gap-1.5 ${
                theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Display Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Pavel Durov"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-2xl text-xs focus:outline-none focus:border-[#5288c1] border ${
                theme === 'light'
                  ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  : 'bg-white/5 border-white/10 text-white placeholder-white/30'
              }`}
            />
            <p className={`text-[10px] mt-1 ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`}>
              Your colleagues will see this name across all chats.
            </p>
          </div>

          {/* Username */}
          <div>
            <label
              className={`text-[11px] font-semibold uppercase tracking-wider block mb-1 flex items-center gap-1.5 ${
                theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'
              }`}
            >
              <AtSign className="w-3.5 h-3.5" /> Username
            </label>
            <div className="relative">
              <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-xs ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`}>
                @
              </span>
              <input
                type="text"
                required
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className={`w-full pl-8 pr-3.5 py-2.5 rounded-2xl text-xs focus:outline-none focus:border-[#5288c1] border ${
                  theme === 'light'
                    ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    : 'bg-white/5 border-white/10 text-white placeholder-white/30'
                }`}
              />
            </div>
            <p className={`text-[10px] mt-1 ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`}>
              You can choose a username on Klea. People can find you by this username.
            </p>
          </div>

          {/* Bio / About */}
          <div>
            <label
              className={`text-[11px] font-semibold uppercase tracking-wider block mb-1 flex items-center gap-1.5 ${
                theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Bio / About
            </label>
            <textarea
              rows={3}
              placeholder="Write a few words about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-2xl text-xs focus:outline-none focus:border-[#5288c1] resize-none border ${
                theme === 'light'
                  ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  : 'bg-white/5 border-white/10 text-white placeholder-white/30'
              }`}
            />
          </div>

          {/* Read-Only Info */}
          <div
            className={`p-3 rounded-2xl space-y-1.5 text-xs ${
              theme === 'light' ? 'bg-[#f4f7fa] border border-gray-100 text-gray-500' : 'bg-white/5 text-[#7f91a4]'
            }`}
          >
            <div className="flex justify-between">
              <span>Email:</span>
              <span className={`font-medium ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span>Account Role:</span>
              <span className="text-amber-500 font-semibold">{user.role || 'EMPLOYEE'}</span>
            </div>
            <div className="flex justify-between">
              <span>Clearance:</span>
              <span className="text-emerald-500 font-semibold">Active & Approved</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className={`px-4 py-2.5 rounded-xl text-xs transition cursor-pointer ${
                theme === 'light'
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-white/5 hover:bg-white/10 text-[#7f91a4] hover:text-white'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#5288c1] hover:bg-[#5d9ad8] text-white text-xs font-bold transition shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
