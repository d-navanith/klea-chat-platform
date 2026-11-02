import React, { useState, useRef, useEffect } from 'react';
import {
  Paperclip,
  Smile,
  Send,
  Mic,
  Square,
  Clock,
  Pencil,
  X,
  Reply,
  Image as ImageIcon,
  FileText,
  BarChart2,
  FileEdit,
  MapPin,
  Music,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getSocket, emitTyping, emitEditMessage } from '../../services/socket';
import { encryptSecretMessage } from '../../services/crypto';
import { CreatePollModal } from './CreatePollModal';
import { CreateArticleModal } from './CreateArticleModal';
import { ShareLocationModal } from './ShareLocationModal';

export const MessageInput: React.FC = () => {
  const { activeChatId, chats, secretKeys, token, editingMessage, setEditingMessage, replyingToMessage, setReplyingToMessage, theme } = useStore();
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [ttlSeconds, setTtlSeconds] = useState<number | undefined>(undefined);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const attachMenuRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  // Close attachment menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    if (showAttachMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAttachMenu]);

  const activeChat = chats.find((c) => c.id === activeChatId);
  const isSecret = activeChat?.type === 'SECRET';

  if (!activeChatId) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);
    emitTyping(activeChatId, e.target.value.length > 0);
  };

  const handleSendMessage = async () => {
    if (!content.trim()) return;

    emitTyping(activeChatId, false);

    // If Editing Message, update existing message
    if (editingMessage) {
      emitEditMessage(activeChatId, editingMessage.id, content.trim());
      setContent('');
      setEditingMessage(null);
      return;
    }

    // If Secret Chat, encrypt message payload on client
    let payload: any = {
      chatId: activeChatId,
      ttlSeconds,
      replyToId: replyingToMessage ? replyingToMessage.id : undefined,
    };

    if (isSecret) {
      const key = secretKeys[activeChatId];
      if (key) {
        const { ciphertext, iv } = await encryptSecretMessage(content.trim(), key);
        payload.ciphertext = ciphertext;
        payload.iv = iv;
      } else {
        payload.content = content.trim(); // fallback if key agreement still pending
      }
    } else {
      payload.content = content.trim();
    }

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('send_message', payload);
    } else {
      // Fallback to HTTP endpoint if socket is not connected
      try {
        await fetch(`/api/chats/${activeChatId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error('Failed to send message via fallback HTTP:', err);
      }
    }

    setContent('');
    setReplyingToMessage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // File & Media Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.fileUrl) {
        getSocket()?.emit('send_message', {
          chatId: activeChatId,
          content: content.trim() || undefined,
          attachments: [
            {
              fileUrl: data.fileUrl,
              fileName: data.fileName,
              fileType: data.fileType,
              fileSize: data.fileSize,
            },
          ],
        });
        setContent('');
        if (photoInputRef.current) photoInputRef.current.value = '';
        if (docInputRef.current) docInputRef.current.value = '';
        if (musicInputRef.current) musicInputRef.current.value = '';
      }
    } catch (err) {
      console.error('File upload failed:', err);
    }
  };

  // Voice Note Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice-message.webm');

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        if (data.fileUrl) {
          getSocket()?.emit('send_message', {
            chatId: activeChatId,
            attachments: [
              {
                fileUrl: data.fileUrl,
                fileName: 'Voice Memo.webm',
                fileType: 'audio/webm',
                fileSize: audioBlob.size,
              },
            ],
          });
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Microphone permission required for voice messages.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      clearInterval(recordTimerRef.current);
      setIsRecording(false);
    }
  };

  return (
    <div className={`p-3 border-t flex flex-col gap-2 shrink-0 ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#17212b] border-white/5'}`}>
      {/* Replying to Message Indicator Banner */}
      {replyingToMessage && (
        <div className={`flex items-center justify-between px-3 py-1.5 border-l-2 border-[#5288c1] rounded-r-lg text-xs ${theme === 'light' ? 'bg-[#5288c1]/10 text-gray-800' : 'bg-[#5288c1]/15 text-white'}`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <Reply className="w-3.5 h-3.5 text-[#5288c1] shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-[#5288c1] mr-1.5">
                Reply to {replyingToMessage.sender.displayName}:
              </span>
              <span className={`italic ${theme === 'light' ? 'text-gray-600' : 'text-white/70'}`}>
                {replyingToMessage.content || 'Photo/Media attachment'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setReplyingToMessage(null)}
            className={`p-1 cursor-pointer ${theme === 'light' ? 'text-gray-400 hover:text-gray-800' : 'text-white/50 hover:text-white'}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editing Message Indicator Banner */}
      {editingMessage && (
        <div className={`flex items-center justify-between px-3 py-1.5 border-l-2 border-[#5288c1] rounded-r-lg text-xs ${theme === 'light' ? 'bg-[#5288c1]/10 text-gray-800' : 'bg-[#5288c1]/15 text-white'}`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <Pencil className="w-3.5 h-3.5 text-[#5288c1] shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-[#5288c1] mr-1.5">Edit Message:</span>
              <span className={`italic ${theme === 'light' ? 'text-gray-600' : 'text-white/70'}`}>{editingMessage.content}</span>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              setContent('');
            }}
            className={`p-1 cursor-pointer ${theme === 'light' ? 'text-gray-400 hover:text-gray-800' : 'text-white/50 hover:text-white'}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Secret Chat TTL Bar */}
      {isSecret && (
        <div className={`flex items-center justify-between px-3 py-1 rounded-lg text-xs ${theme === 'light' ? 'bg-emerald-500/10 text-emerald-800' : 'bg-emerald-500/10 text-emerald-300'}`}>
          <div className="flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Self-Destruct Timer (TTL):</span>
          </div>
          <div className="flex gap-1.5">
            {[undefined, 5, 10, 30, 60].map((sec) => (
              <button
                key={String(sec)}
                onClick={() => setTtlSeconds(sec)}
                className={`px-2 py-0.5 rounded text-[11px] cursor-pointer transition ${
                  ttlSeconds === sec
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-emerald-500 hover:bg-emerald-500/20'
                }`}
              >
                {sec ? `${sec}s` : 'Off'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-2">
        {/* Hidden File Inputs for Photo, Document, Music */}
        <input
          type="file"
          ref={photoInputRef}
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <input
          type="file"
          ref={docInputRef}
          accept="*/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <input
          type="file"
          ref={musicInputRef}
          accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Attachment menu trigger & popover */}
        <div className="relative" ref={attachMenuRef}>
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            title="Attach"
            className={`p-2 rounded-xl transition cursor-pointer ${
              showAttachMenu
                ? theme === 'light' ? 'bg-gray-200 text-gray-900' : 'bg-white/10 text-white'
                : theme === 'light' ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-100' : 'text-[#7f91a4] hover:text-white hover:bg-white/5'
            }`}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Telegram Web Attachment Popover Menu */}
          {showAttachMenu && (
            <div className={`absolute bottom-12 left-0 w-44 rounded-2xl shadow-2xl p-1.5 z-40 animate-in fade-in slide-in-from-bottom-2 duration-150 space-y-0.5 border ${
              theme === 'light' ? 'bg-white border-gray-200 text-gray-800' : 'bg-[#182533] border-white/10 text-white'
            }`}>
              {/* 1. Photo (without video) */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  photoInputRef.current?.click();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${
                  theme === 'light' ? 'text-gray-800 hover:bg-gray-100' : 'text-white/90 hover:text-white hover:bg-white/10'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-[#5288c1] shrink-0" />
                <span className="font-medium">Photo</span>
              </button>

              {/* 2. Document */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  docInputRef.current?.click();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${
                  theme === 'light' ? 'text-gray-800 hover:bg-gray-100' : 'text-white/90 hover:text-white hover:bg-white/10'
                }`}
              >
                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="font-medium">Document</span>
              </button>

              {/* 3. Poll */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  setShowPollModal(true);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${
                  theme === 'light' ? 'text-gray-800 hover:bg-gray-100' : 'text-white/90 hover:text-white hover:bg-white/10'
                }`}
              >
                <BarChart2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-medium">Poll</span>
              </button>

              {/* 4. Article */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  setShowArticleModal(true);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${
                  theme === 'light' ? 'text-gray-800 hover:bg-gray-100' : 'text-white/90 hover:text-white hover:bg-white/10'
                }`}
              >
                <FileEdit className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="font-medium">Article</span>
              </button>

              {/* 5. Location */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  setShowLocationModal(true);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${
                  theme === 'light' ? 'text-gray-800 hover:bg-gray-100' : 'text-white/90 hover:text-white hover:bg-white/10'
                }`}
              >
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-medium">Location</span>
              </button>

              {/* 6. Music */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  musicInputRef.current?.click();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${
                  theme === 'light' ? 'text-gray-800 hover:bg-gray-100' : 'text-white/90 hover:text-white hover:bg-white/10'
                }`}
              >
                <Music className="w-4 h-4 text-purple-500 shrink-0" />
                <span className="font-medium">Music</span>
              </button>
            </div>
          )}
        </div>

        {/* Text Input or Voice Recording Bar */}
        <div className={`flex-1 flex items-center rounded-2xl px-3 py-1.5 border ${
          theme === 'light' ? 'bg-gray-100 border-gray-200' : 'bg-white/5 border-white/5'
        }`}>
          {isRecording ? (
            <div className="flex-1 flex items-center justify-between text-xs text-red-500 animate-pulse px-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>Recording voice message... {recordSeconds}s</span>
              </div>
              <button
                onClick={stopRecording}
                className="p-1 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/40 text-xs font-semibold cursor-pointer"
              >
                <Square className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder={isSecret ? 'Send encrypted message...' : 'Write a message...'}
                value={content}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className={`w-full bg-transparent border-none text-xs sm:text-sm focus:outline-none ${
                  theme === 'light' ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-white/40'
                }`}
              />
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-1.5 transition cursor-pointer ${
                  theme === 'light' ? 'text-gray-500 hover:text-gray-900' : 'text-[#7f91a4] hover:text-white'
                }`}
              >
                <Smile className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Emoji Selector Popup */}
        {showEmojiPicker && (
          <div className={`absolute bottom-16 right-16 p-3 rounded-2xl shadow-2xl grid grid-cols-6 gap-2 text-xl z-30 border ${
            theme === 'light' ? 'bg-white border-gray-200 text-gray-800' : 'bg-[#182533] border-white/10 text-white'
          }`}>
            {['😀', '😂', '😍', '🔥', '👍', '🎉', '❤️', '💎', '🚀', '⚡', '💯', '👏', '🥳', '😎', '🙏', '✨', '🌟', '👀'].map((e) => (
              <button
                key={e}
                onClick={() => {
                  setContent((prev) => prev + e);
                  setShowEmojiPicker(false);
                }}
                className="hover:scale-125 transition cursor-pointer p-1"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {/* Send or Voice Record Action Button */}
        {content.trim() ? (
          <button
            onClick={handleSendMessage}
            className="w-10 h-10 rounded-full bg-[#5288c1] hover:bg-[#5d9ad8] text-white flex items-center justify-center transition shadow-md cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        ) : (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition shadow-md cursor-pointer shrink-0 ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : theme === 'light'
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                : 'bg-white/10 hover:bg-white/15 text-[#7f91a4] hover:text-white'
            }`}
          >
            {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Attachment Modals */}
      <CreatePollModal
        isOpen={showPollModal}
        onClose={() => setShowPollModal(false)}
        chatId={activeChatId}
      />
      <CreateArticleModal
        isOpen={showArticleModal}
        onClose={() => setShowArticleModal(false)}
        chatId={activeChatId}
      />
      <ShareLocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        chatId={activeChatId}
      />
    </div>
  );
};
