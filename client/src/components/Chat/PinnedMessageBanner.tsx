import React from 'react';
import { Pin, X } from 'lucide-react';
import { useStore, type Message } from '../../store/useStore';
import { emitTogglePin } from '../../services/socket';

export const PinnedMessageBanner: React.FC = () => {
  const { messages, activeChatId, theme } = useStore();

  const pinnedMessage = messages.find((m) => m.isPinned);
  if (!pinnedMessage || !activeChatId) return null;

  const scrollToMessage = () => {
    const el = document.getElementById(`msg-${pinnedMessage.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#5288c1]', 'transition-all');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#5288c1]');
      }, 2000);
    }
  };

  const handleUnpin = (e: React.MouseEvent) => {
    e.stopPropagation();
    emitTogglePin(activeChatId, pinnedMessage.id);
  };

  const getPinnedPreview = (m: Message) => {
    if (m.content) return m.content;
    if (m.attachments && m.attachments.length > 0) {
      const att = m.attachments[0];
      if (att.fileType.startsWith('image/')) return '📷 Photo';
      if (att.fileType.startsWith('audio/')) return '🎤 Voice message';
      return `📎 ${att.fileName || 'Document'}`;
    }
    return 'Pinned message';
  };

  return (
    <div
      onClick={scrollToMessage}
      className={`h-11 px-4 border-b flex items-center justify-between shrink-0 select-none cursor-pointer backdrop-blur-xs transition z-10 ${
        theme === 'light'
          ? 'bg-white/95 border-gray-200 hover:bg-gray-50 text-gray-900 shadow-xs'
          : 'bg-[#17212b]/95 border-white/5 hover:bg-[#1f2b38] text-white'
      }`}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="w-1 h-7 rounded-full bg-[#5288c1] shrink-0" />
        <Pin className="w-4 h-4 text-[#5288c1] shrink-0 transform -rotate-45" />
        <div className="truncate">
          <div className="text-[11px] font-bold text-[#5288c1] leading-tight">Pinned Message</div>
          <div className={`text-xs truncate ${theme === 'light' ? 'text-gray-700' : 'text-white/80'}`}>{getPinnedPreview(pinnedMessage)}</div>
        </div>
      </div>

      <button
        onClick={handleUnpin}
        title="Unpin Message"
        className={`p-1 rounded-lg transition cursor-pointer shrink-0 ml-2 ${
          theme === 'light'
            ? 'text-gray-400 hover:text-gray-800 hover:bg-gray-100'
            : 'text-[#7f91a4] hover:text-white hover:bg-white/10'
        }`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
