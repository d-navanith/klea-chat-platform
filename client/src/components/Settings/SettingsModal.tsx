import React, { useState } from 'react';
import {
  X,
  Bell,
  Moon,
  Sun,
  Shield,
  Lock,
  LogOut,
  Edit2,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

export const SettingsModal: React.FC = () => {
  const { user, activeModal, setActiveModal, theme, toggleTheme, logout } = useStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);

  if (activeModal !== 'settings' || !user) return null;

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
          <h3 className="text-sm font-bold">Settings</h3>
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

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* User Profile Summary Card */}
          <div
            className={`p-4 rounded-2xl flex items-center justify-between border ${
              theme === 'light'
                ? 'bg-gradient-to-r from-[#eef3f8] to-[#f7f9fb] border-gray-200'
                : 'bg-gradient-to-r from-[#242f3d] to-[#17212b] border-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <img
                src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                alt={user.displayName}
                className={`w-12 h-12 rounded-full object-cover border-2 ${
                  theme === 'light' ? 'border-gray-300' : 'border-white/10'
                }`}
              />
              <div>
                <h4 className={`text-sm font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  {user.displayName}
                </h4>
                <p className="text-xs text-[#5288c1]">@{user.username}</p>
                <p className={`text-[10px] ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
                  {user.email}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveModal('profile_edit')}
              className={`p-2 rounded-xl transition cursor-pointer ${
                theme === 'light'
                  ? 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 shadow-xs'
                  : 'bg-white/10 hover:bg-white/15 text-white'
              }`}
              title="Edit Profile"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          {/* Section: Notifications and Sounds */}
          <div className="space-y-1">
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 block mb-1 ${
                theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'
              }`}
            >
              Notifications and Sounds
            </span>
            <div
              className={`p-2.5 rounded-2xl space-y-2 ${
                theme === 'light' ? 'bg-[#f4f7fa] border border-gray-100' : 'bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between p-1">
                <div className="flex items-center gap-3">
                  <Bell className={`w-4 h-4 ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`} />
                  <span className="text-xs font-medium">Desktop Notifications</span>
                </div>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="rounded text-[#5288c1] w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-1">
                <div className="flex items-center gap-3">
                  <span className="text-sm">🔔</span>
                  <span className="text-xs font-medium">Message Audio Chimes</span>
                </div>
                <input
                  type="checkbox"
                  checked={soundsEnabled}
                  onChange={(e) => setSoundsEnabled(e.target.checked)}
                  className="rounded text-[#5288c1] w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section: Appearance */}
          <div className="space-y-1">
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 block mb-1 ${
                theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'
              }`}
            >
              General & Appearance
            </span>
            <div
              className={`p-2.5 rounded-2xl space-y-2 ${
                theme === 'light' ? 'bg-[#f4f7fa] border border-gray-100' : 'bg-white/5'
              }`}
            >
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-1 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="w-4 h-4 text-[#7f91a4]" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-500" />
                  )}
                  <span className="text-xs font-medium">Day / Night Theme</span>
                </div>
                <span className="text-xs text-[#5288c1] font-semibold capitalize">{theme} Mode</span>
              </button>
            </div>
          </div>

          {/* Section: Privacy and Security */}
          <div className="space-y-1">
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 block mb-1 ${
                theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'
              }`}
            >
              Privacy and Security
            </span>
            <div
              className={`p-3 rounded-2xl space-y-2 text-xs ${
                theme === 'light'
                  ? 'bg-[#f4f7fa] border border-gray-100 text-gray-600'
                  : 'bg-white/5 text-[#7f91a4]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-500" />
                  <span>End-to-End Encryption</span>
                </div>
                <span className="text-emerald-500 font-semibold text-[11px]">Enabled (ECDH)</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-[#5288c1]" />
                  <span>Account Clearance</span>
                </div>
                <span className={`font-medium text-[11px] ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  Verified
                </span>
              </div>
            </div>
          </div>

          {/* Logout */}
          <div className="pt-2">
            <button
              onClick={() => {
                setActiveModal(null);
                logout();
              }}
              className="w-full py-2.5 px-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
