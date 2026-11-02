import React, { useState } from 'react';
import { X, FileEdit, Send } from 'lucide-react';
import { getSocket } from '../../services/socket';
import { useStore } from '../../store/useStore';

interface CreateArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
}

export const CreateArticleModal: React.FC<CreateArticleModalProps> = ({ isOpen, onClose, chatId }) => {
  const { token, user, theme } = useStore();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState(user?.displayName || '');
  const [articleContent, setArticleContent] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Article title is required.');
      return;
    }

    if (!articleContent.trim()) {
      setError('Article content cannot be empty.');
      return;
    }

    const snippet = articleContent.trim().slice(0, 140) + (articleContent.trim().length > 140 ? '...' : '');

    const articlePayload = {
      type: 'ARTICLE',
      articleId: `art-${Date.now()}`,
      title: title.trim(),
      author: author.trim() || user?.displayName || 'Anonymous',
      snippet,
      body: articleContent.trim(),
      publishedAt: new Date().toISOString(),
    };

    const content = JSON.stringify(articlePayload);

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('send_message', {
        chatId,
        content,
      });
    } else {
      try {
        await fetch(`/api/chats/${chatId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ chatId, content }),
        });
      } catch (err) {
        console.error('Failed to send article via fallback HTTP:', err);
      }
    }

    onClose();
    setTitle('');
    setArticleContent('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div
        className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border animate-in zoom-in-95 duration-150 transition-colors ${
          theme === 'light'
            ? 'bg-white border-gray-200 text-gray-900'
            : 'bg-[#17212b] border-white/10 text-white'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b mb-4 ${theme === 'light' ? 'border-gray-200' : 'border-white/10'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Publish Article</h3>
              <p className={`text-[11px] ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
                Create an Instant View article for your colleagues
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
              theme === 'light'
                ? 'text-gray-400 hover:bg-gray-200 hover:text-gray-800'
                : 'text-[#7f91a4] hover:bg-white/10 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handlePublish} className="space-y-4">
          <div>
            <label
              className={`text-[11px] font-semibold uppercase tracking-wider block mb-1 ${
                theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'
              }`}
            >
              Article Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 Strategic Planning & Roadmap"
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#5288c1] transition border ${
                theme === 'light'
                  ? 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'
                  : 'bg-white/5 border-white/10 text-white placeholder-white/30'
              }`}
            />
          </div>

          <div>
            <label
              className={`text-[11px] font-semibold uppercase tracking-wider block mb-1 ${
                theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'
              }`}
            >
              Author
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author name"
              className={`w-full px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-[#5288c1] transition border ${
                theme === 'light'
                  ? 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'
                  : 'bg-white/5 border-white/10 text-white placeholder-white/30'
              }`}
            />
          </div>

          <div>
            <label
              className={`text-[11px] font-semibold uppercase tracking-wider block mb-1 ${
                theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'
              }`}
            >
              Article Content
            </label>
            <textarea
              required
              rows={6}
              value={articleContent}
              onChange={(e) => setArticleContent(e.target.value)}
              placeholder="Write your article story, announcement, or memo here..."
              className={`w-full p-3.5 rounded-xl text-xs focus:outline-none focus:border-[#5288c1] transition resize-none leading-relaxed border ${
                theme === 'light'
                  ? 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'
                  : 'bg-white/5 border-white/10 text-white placeholder-white/30'
              }`}
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                theme === 'light'
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-white/5 hover:bg-white/10 text-white'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#5288c1] hover:bg-[#5d9ad8] text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Share Article</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
