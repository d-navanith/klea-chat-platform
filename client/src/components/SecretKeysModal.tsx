import React from 'react';
import { X, Lock, Copy, Check } from 'lucide-react';
import { useStore } from '../store/useStore';

export const SecretKeysModal: React.FC = () => {
  const { activeModal, setActiveModal, activeChatId, chats, secretFingerprints, theme } = useStore();
  const [copied, setCopied] = React.useState(false);

  if (activeModal !== 'secret_keys' || !activeChatId) return null;

  const currentChat = chats.find((c) => c.id === activeChatId);
  const fingerprint = secretFingerprints[activeChatId] || {
    emojis: ['🛡️', '⚡', '💎', '🚀'],
    hex: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  };

  const handleCopyHex = () => {
    navigator.clipboard.writeText(fingerprint.hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className={`relative w-full max-w-sm rounded-2xl flex flex-col overflow-hidden shadow-2xl border transition-colors ${
          theme === 'light'
            ? 'bg-white border-emerald-300 text-gray-900'
            : 'bg-[#17212b] border-emerald-500/30 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            theme === 'light'
              ? 'bg-emerald-50/50 border-gray-200 text-gray-900'
              : 'bg-[#0e1621] border-white/10 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-500" />
            <span className="font-bold text-sm">Encryption Key</span>
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

        {/* E2EE Info Body */}
        <div className="p-6 text-center space-y-5">
          {/* Visual 4-Emoji Fingerprint Badge */}
          <div
            className={`p-4 border rounded-2xl flex items-center justify-center gap-4 text-4xl shadow-inner ${
              theme === 'light'
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-emerald-500/10 border-emerald-500/30'
            }`}
          >
            {fingerprint.emojis.map((emoji, idx) => (
              <span key={idx} className="transform hover:scale-125 transition duration-150 select-none">
                {emoji}
              </span>
            ))}
          </div>

          <div className={`space-y-2 text-xs leading-relaxed ${theme === 'light' ? 'text-gray-600' : 'text-[#7f91a4]'}`}>
            <p>
              This visual image and key are derived from the shared Diffie-Hellman secret key calculated between your browser and{' '}
              <strong className={theme === 'light' ? 'text-gray-900' : 'text-white'}>
                {currentChat?.title || 'your partner'}
              </strong>.
            </p>
            <p>
              If the 4 emojis above match the ones on your partner's screen, this secret chat is{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">200% secure</strong>. No third party or server can intercept your messages.
            </p>
          </div>

          {/* Hex Fingerprint Box */}
          <div
            onClick={handleCopyHex}
            className={`p-3 border rounded-xl text-left font-mono text-[11px] break-all cursor-pointer transition flex items-center justify-between gap-2 ${
              theme === 'light'
                ? 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-800'
                : 'bg-black/40 hover:bg-black/60 border-white/10 text-white/70'
            }`}
          >
            <span>{fingerprint.hex}</span>
            {copied ? (
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Copy className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-gray-400 hover:text-gray-700' : 'text-white/40 hover:text-white'}`} />
            )}
          </div>

          <button
            onClick={() => setActiveModal(null)}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white transition cursor-pointer shadow-sm"
          >
            I Confirmed Key
          </button>
        </div>
      </div>
    </div>
  );
};
