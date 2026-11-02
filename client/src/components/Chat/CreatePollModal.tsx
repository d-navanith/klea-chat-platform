import React, { useState } from 'react';
import { X, Plus, Trash2, BarChart2, CheckSquare, ShieldCheck } from 'lucide-react';
import { getSocket } from '../../services/socket';
import { useStore } from '../../store/useStore';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({ isOpen, onClose, chatId }) => {
  const { token, user, theme } = useStore();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [allowsMultiple, setAllowsMultiple] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (text: string, index: number) => {
    const updated = [...options];
    updated[index] = text;
    setOptions(updated);
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanQuestion = question.trim();
    if (!cleanQuestion) {
      setError('Please enter a poll question.');
      return;
    }

    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setError('Please provide at least two valid options.');
      return;
    }

    const pollPayload = {
      type: 'POLL',
      pollId: `poll-${Date.now()}`,
      question: cleanQuestion,
      options: cleanOptions.map((opt, idx) => ({
        id: `opt-${idx}`,
        text: opt,
        votes: [] as string[],
      })),
      isAnonymous,
      allowsMultiple,
      creatorId: user?.id,
      creatorName: user?.displayName,
      createdAt: new Date().toISOString(),
    };

    const content = JSON.stringify(pollPayload);

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
        console.error('Failed to send poll via fallback HTTP:', err);
      }
    }

    onClose();
    setQuestion('');
    setOptions(['', '']);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div
        className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border animate-in zoom-in-95 duration-150 transition-colors ${
          theme === 'light'
            ? 'bg-white border-gray-200 text-gray-900'
            : 'bg-[#17212b] border-white/10 text-white'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b mb-4 ${theme === 'light' ? 'border-gray-200' : 'border-white/10'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#5288c1]/20 flex items-center justify-center text-[#5288c1]">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">New Poll</h3>
              <p className={`text-[11px] ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
                Ask a question to group or chat
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

        <form onSubmit={handleCreatePoll} className="space-y-4">
          {/* Question */}
          <div>
            <label
              className={`text-[11px] font-semibold uppercase tracking-wider block mb-1 ${
                theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'
              }`}
            >
              Poll Question
            </label>
            <input
              type="text"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#5288c1] transition border ${
                theme === 'light'
                  ? 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'
                  : 'bg-white/5 border-white/10 text-white placeholder-white/30'
              }`}
            />
          </div>

          {/* Options */}
          <div>
            <label
              className={`text-[11px] font-semibold uppercase tracking-wider block mb-2 ${
                theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'
              }`}
            >
              Poll Options
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={opt}
                    onChange={(e) => handleOptionChange(e.target.value, idx)}
                    placeholder={`Option ${idx + 1}`}
                    className={`flex-1 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-[#5288c1] transition border ${
                      theme === 'light'
                        ? 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'
                        : 'bg-white/5 border-white/10 text-white placeholder-white/30'
                    }`}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className={`p-2 rounded-lg transition cursor-pointer ${
                        theme === 'light'
                          ? 'text-gray-400 hover:text-red-500 hover:bg-gray-200'
                          : 'text-white/30 hover:text-red-400 hover:bg-red-500/10'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-2 text-xs text-[#5288c1] hover:text-[#649edb] flex items-center gap-1.5 transition cursor-pointer font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add an Option</span>
              </button>
            )}
          </div>

          {/* Settings Toggles */}
          <div className={`pt-2 border-t space-y-2.5 ${theme === 'light' ? 'border-gray-200' : 'border-white/5'}`}>
            <label className={`flex items-center justify-between text-xs cursor-pointer transition ${
              theme === 'light' ? 'text-gray-600 hover:text-gray-900' : 'text-[#7f91a4] hover:text-white'
            }`}>
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Anonymous Voting</span>
              </span>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 accent-[#5288c1] rounded cursor-pointer"
              />
            </label>

            <label className={`flex items-center justify-between text-xs cursor-pointer transition ${
              theme === 'light' ? 'text-gray-600 hover:text-gray-900' : 'text-[#7f91a4] hover:text-white'
            }`}>
              <span className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-500" />
                <span>Multiple Answers</span>
              </span>
              <input
                type="checkbox"
                checked={allowsMultiple}
                onChange={(e) => setAllowsMultiple(e.target.checked)}
                className="w-4 h-4 accent-[#5288c1] rounded cursor-pointer"
              />
            </label>
          </div>

          {/* Submit button */}
          <div className="pt-3 flex gap-2">
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
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Send Poll</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
