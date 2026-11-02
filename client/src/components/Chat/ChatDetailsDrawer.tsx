import React, { useState } from 'react';
import {
  X,
  Bell,
  BellOff,
  Copy,
  Check,
  FileText,
  Image as ImageIcon,
  Mic,
  Link2,
  Trash2,
  Download,
  Lock,
  UserPlus,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { emitClearChat } from '../../services/socket';

interface ChatDetailsDrawerProps {
  onClose: () => void;
}

export const ChatDetailsDrawer: React.FC<ChatDetailsDrawerProps> = ({ onClose }) => {
  const { chats, activeChatId, messages, user, showChatDetails, setActiveModal, theme } = useStore();
  const [activeTab, setActiveTab] = useState<'media' | 'files' | 'links' | 'voice' | 'members'>('media');
  const [isMuted, setIsMuted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);

  const chat = chats.find((c) => c.id === activeChatId);
  if (!showChatDetails || !chat) return null;

  const otherMember = chat.members.find((m) => m.userId !== user?.id)?.user;
  const isGroup = chat.type === 'GROUP';
  const isSaved = chat.type === 'SAVED';
  const isSecret = chat.type === 'SECRET';

  // Extract shared media items from chat messages
  const mediaItems: Array<{ url: string; fileName: string; messageId: string }> = [];
  const fileItems: Array<{ url: string; fileName: string; fileSize: number; fileType: string; messageId: string }> = [];
  const voiceItems: Array<{ url: string; fileName: string; messageId: string }> = [];
  const linkItems: Array<{ text: string; url: string; messageId: string }> = [];

  const urlRegex = /(https?:\/\/[^\s]+)/g;

  messages.forEach((m) => {
    // Attachments
    if (m.attachments && m.attachments.length > 0) {
      m.attachments.forEach((a) => {
        if (a.fileType.startsWith('image/')) {
          mediaItems.push({ url: a.fileUrl, fileName: a.fileName, messageId: m.id });
        } else if (a.fileType.startsWith('audio/')) {
          voiceItems.push({ url: a.fileUrl, fileName: a.fileName, messageId: m.id });
        } else {
          fileItems.push({
            url: a.fileUrl,
            fileName: a.fileName,
            fileSize: a.fileSize,
            fileType: a.fileType,
            messageId: m.id,
          });
        }
      });
    }

    // Extracted links
    if (m.content) {
      const matches = m.content.match(urlRegex);
      if (matches) {
        matches.forEach((url) => {
          linkItems.push({ text: url, url, messageId: m.id });
        });
      }
    }
  });

  const handleCopyInvite = () => {
    if (chat.inviteCode) {
      const link = `${window.location.origin}/join/${chat.inviteCode}`;
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyUsername = () => {
    if (otherMember?.username) {
      navigator.clipboard.writeText(`@${otherMember.username}`);
      setCopiedUsername(true);
      setTimeout(() => setCopiedUsername(false), 2000);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Clear all messages in this conversation?')) {
      emitClearChat(chat.id);
    }
  };

  return (
    <div
      className={`w-80 md:w-96 border-l h-full flex flex-col shrink-0 z-20 select-none animate-in slide-in-from-right duration-200 ${
        theme === 'light'
          ? 'bg-white border-gray-200 text-gray-900'
          : 'bg-[#17212b] border-white/5 text-white'
      }`}
    >
      {/* Header */}
      <div
        className={`h-14 px-4 border-b flex items-center justify-between ${
          theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#17212b] border-white/5'
        }`}
      >
        <h3 className="text-sm font-bold">{isGroup ? 'Group Info' : 'User Info'}</h3>
        <button
          onClick={onClose}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
            theme === 'light'
              ? 'text-gray-400 hover:bg-gray-100 hover:text-gray-800'
              : 'text-[#7f91a4] hover:bg-white/10 hover:text-white'
          }`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Top Profile Card */}
        <div
          className={`p-6 flex flex-col items-center border-b text-center ${
            theme === 'light'
              ? 'bg-gradient-to-b from-[#f0f4f8] to-white border-gray-200'
              : 'bg-gradient-to-b from-[#1b2734] to-[#17212b] border-white/5'
          }`}
        >
          <div className="relative mb-3">
            <img
              src={
                isGroup
                  ? chat.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.title}`
                  : otherMember?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${otherMember?.username}`
              }
              alt="Avatar"
              className={`w-24 h-24 object-cover border-2 shadow-xl ${
                theme === 'light' ? 'border-gray-200' : 'border-white/10'
              } ${isGroup ? 'rounded-2xl' : 'rounded-full'}`}
            />
            {!isGroup && otherMember?.isOnline && (
              <span
                className={`absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#4fae4e] ring-2 ${
                  theme === 'light' ? 'ring-white' : 'ring-[#17212b]'
                }`}
              />
            )}
          </div>

          <h4
            className={`text-base font-bold flex items-center gap-1.5 ${
              theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}
          >
            {isGroup ? chat.title : otherMember?.displayName}
          </h4>

          <p
            className={`text-xs mt-0.5 ${
              theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'
            }`}
          >
            {isSaved
              ? 'Personal Cloud Storage'
              : isGroup
              ? `${chat.members.length} members`
              : otherMember?.isOnline
              ? 'online'
              : 'last seen recently'}
          </p>

          {/* Quick Mute Toggle */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                theme === 'light'
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  : 'bg-white/5 hover:bg-white/10 text-white'
              }`}
            >
              {isMuted ? <BellOff className="w-4 h-4 text-red-500" /> : <Bell className="w-4 h-4 text-[#5288c1]" />}
              <span>{isMuted ? 'Muted' : 'Notifications'}</span>
            </button>

            {isGroup && (
              <button
                onClick={() => setActiveModal('group_info')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                  theme === 'light'
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                    : 'bg-white/5 hover:bg-white/10 text-white'
                }`}
              >
                <UserPlus className="w-4 h-4 text-emerald-500" />
                <span>Add Member</span>
              </button>
            )}
          </div>
        </div>

        {/* Bio & Details Section */}
        <div className={`p-4 border-b space-y-3 ${theme === 'light' ? 'border-gray-200' : 'border-white/5'}`}>
          {/* Bio / Description */}
          {((isGroup && chat.description) || (!isGroup && otherMember?.bio)) && (
            <div>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${
                  theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'
                }`}
              >
                About
              </span>
              <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                {isGroup ? chat.description : otherMember?.bio}
              </p>
            </div>
          )}

          {/* Username */}
          {!isGroup && otherMember?.username && (
            <div
              onClick={handleCopyUsername}
              className={`flex items-center justify-between p-2.5 rounded-xl transition cursor-pointer ${
                theme === 'light'
                  ? 'bg-gray-50 hover:bg-gray-100 border border-gray-100'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider block ${
                    theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'
                  }`}
                >
                  Username
                </span>
                <span className="text-xs text-[#5288c1] font-semibold">@{otherMember.username}</span>
              </div>
              <button className={theme === 'light' ? 'text-gray-400 hover:text-gray-700' : 'text-[#7f91a4] hover:text-white'}>
                {copiedUsername ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Email */}
          {!isGroup && otherMember?.email && (
            <div
              className={`p-2.5 rounded-xl ${
                theme === 'light' ? 'bg-gray-50 border border-gray-100' : 'bg-white/5'
              }`}
            >
              <span
                className={`text-[10px] uppercase font-bold tracking-wider block ${
                  theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'
                }`}
              >
                Corporate Email
              </span>
              <span className={`text-xs ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                {otherMember.email}
              </span>
            </div>
          )}

          {/* Invite Link (for Groups) */}
          {isGroup && chat.inviteCode && (
            <div
              onClick={handleCopyInvite}
              className={`flex items-center justify-between p-2.5 rounded-xl transition cursor-pointer ${
                theme === 'light'
                  ? 'bg-gray-50 hover:bg-gray-100 border border-gray-100'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="truncate mr-2">
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider block ${
                    theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'
                  }`}
                >
                  Private Invite Link
                </span>
                <span className="text-xs text-[#5288c1] font-semibold truncate block">
                  {window.location.origin}/join/{chat.inviteCode}
                </span>
              </div>
              <button className={`${theme === 'light' ? 'text-gray-400 hover:text-gray-700' : 'text-[#7f91a4] hover:text-white'} shrink-0`}>
                {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* E2EE Info */}
          {isSecret && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                theme === 'light'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              }`}
            >
              <Lock className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>Messages are end-to-end encrypted with zero server storage.</span>
            </div>
          )}
        </div>

        {/* Shared Media Tabs (Telegram Style) */}
        <div className="p-4">
          <div className={`flex items-center justify-around border-b pb-2 text-xs ${theme === 'light' ? 'border-gray-200' : 'border-white/5'}`}>
            <button
              onClick={() => setActiveTab('media')}
              className={`pb-1 font-semibold flex items-center gap-1 transition cursor-pointer border-b-2 ${
                activeTab === 'media'
                  ? 'border-[#5288c1] text-[#5288c1]'
                  : theme === 'light'
                  ? 'border-transparent text-gray-500 hover:text-gray-800'
                  : 'border-transparent text-[#7f91a4] hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Media ({mediaItems.length})
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`pb-1 font-semibold flex items-center gap-1 transition cursor-pointer border-b-2 ${
                activeTab === 'files'
                  ? 'border-[#5288c1] text-[#5288c1]'
                  : theme === 'light'
                  ? 'border-transparent text-gray-500 hover:text-gray-800'
                  : 'border-transparent text-[#7f91a4] hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Files ({fileItems.length})
            </button>
            <button
              onClick={() => setActiveTab('links')}
              className={`pb-1 font-semibold flex items-center gap-1 transition cursor-pointer border-b-2 ${
                activeTab === 'links'
                  ? 'border-[#5288c1] text-[#5288c1]'
                  : theme === 'light'
                  ? 'border-transparent text-gray-500 hover:text-gray-800'
                  : 'border-transparent text-[#7f91a4] hover:text-white'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" /> Links ({linkItems.length})
            </button>
            <button
              onClick={() => setActiveTab('voice')}
              className={`pb-1 font-semibold flex items-center gap-1 transition cursor-pointer border-b-2 ${
                activeTab === 'voice'
                  ? 'border-[#5288c1] text-[#5288c1]'
                  : theme === 'light'
                  ? 'border-transparent text-gray-500 hover:text-gray-800'
                  : 'border-transparent text-[#7f91a4] hover:text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5" /> Voice ({voiceItems.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="py-4">
            {/* Photos & Videos Grid */}
            {activeTab === 'media' && (
              mediaItems.length === 0 ? (
                <div className={`text-center py-8 text-xs ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`}>
                  No photos or videos shared yet
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {mediaItems.map((m, idx) => (
                    <a
                      key={idx}
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square rounded-xl overflow-hidden bg-black/10 hover:opacity-80 transition block"
                    >
                      <img src={m.url} alt={m.fileName} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )
            )}

            {/* Files Tab */}
            {activeTab === 'files' && (
              fileItems.length === 0 ? (
                <div className={`text-center py-8 text-xs ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`}>
                  No documents shared yet
                </div>
              ) : (
                <div className="space-y-2">
                  {fileItems.map((f, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl flex items-center justify-between text-xs transition ${
                        theme === 'light'
                          ? 'bg-gray-50 border border-gray-100 hover:bg-gray-100'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate mr-2">
                        <FileText className="w-4 h-4 text-[#5288c1] shrink-0" />
                        <div className="truncate">
                          <div className={`font-semibold truncate ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                            {f.fileName}
                          </div>
                          <div className={`text-[10px] ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`}>
                            {(f.fileSize / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                      <a
                        href={f.url}
                        download={f.fileName}
                        className={`p-1.5 rounded-lg ${
                          theme === 'light'
                            ? 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                            : 'bg-white/5 hover:bg-white/10 text-[#7f91a4] hover:text-white'
                        }`}
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Links Tab */}
            {activeTab === 'links' && (
              linkItems.length === 0 ? (
                <div className={`text-center py-8 text-xs ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`}>
                  No links shared in this chat
                </div>
              ) : (
                <div className="space-y-2">
                  {linkItems.map((l, idx) => (
                    <a
                      key={idx}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-2.5 rounded-xl flex items-center gap-2.5 text-xs text-[#5288c1] hover:underline block truncate ${
                        theme === 'light' ? 'bg-gray-50 border border-gray-100' : 'bg-white/5'
                      }`}
                    >
                      <Link2 className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`} />
                      <span className="truncate">{l.url}</span>
                    </a>
                  ))}
                </div>
              )
            )}

            {/* Voice Messages Tab */}
            {activeTab === 'voice' && (
              voiceItems.length === 0 ? (
                <div className={`text-center py-8 text-xs ${theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'}`}>
                  No voice messages recorded
                </div>
              ) : (
                <div className="space-y-2">
                  {voiceItems.map((v, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl flex items-center justify-between text-xs ${
                        theme === 'light' ? 'bg-gray-50 border border-gray-100 text-gray-800' : 'bg-white/5 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-[#5288c1]" />
                        <span>Voice message</span>
                      </div>
                      <audio controls src={v.url} className="h-7 max-w-[160px]" />
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`p-4 border-t space-y-2 ${theme === 'light' ? 'border-gray-200' : 'border-white/5'}`}>
          <button
            onClick={handleClearHistory}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Chat History</span>
          </button>
        </div>
      </div>
    </div>
  );
};
