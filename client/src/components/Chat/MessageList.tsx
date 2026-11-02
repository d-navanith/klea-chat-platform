import React, { useEffect, useRef, useState } from 'react';
import { Lock, CheckCheck, Clock, Play, Pause, Download, Trash2, Pencil, Reply, CornerUpRight, Pin, BarChart2, BookOpen, MapPin, ExternalLink, X, Bookmark } from 'lucide-react';
import { useStore, type Message } from '../../store/useStore';
import { joinChatRoom, leaveChatRoom, emitReaction, emitDeleteMessage, emitTogglePin, emitForwardMessage, getSocket } from '../../services/socket';
import { decryptSecretMessage } from '../../services/crypto';
import { PinnedMessageBanner } from './PinnedMessageBanner';

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '👏', '🎉', '💎'];

export const MessageList: React.FC = () => {
  const { activeChatId, messages, setMessages, user, token, secretKeys, chats, addChat, setEditingMessage, setReplyingToMessage, setForwardingMessage, setActiveModal, theme } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [pollVotes, setPollVotes] = useState<Record<string, string[]>>({});
  const [readingArticle, setReadingArticle] = useState<any | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleQuickSaveToSavedMessages = async (message: Message) => {
    try {
      let savedChat = chats.find((c) => c.type === 'SAVED');
      let targetId = savedChat?.id;

      if (!targetId && token) {
        const res = await fetch('/api/chats/saved', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.chat) {
          addChat(data.chat);
          targetId = data.chat.id;
          getSocket()?.emit('join_chat', data.chat.id);
        }
      }

      if (targetId) {
        emitForwardMessage(message.id, [targetId]);
        setToastMsg('Saved to Saved Messages! 🔖');
        setTimeout(() => setToastMsg(null), 2500);
      }
    } catch (err) {
      console.error('Failed to quick-save message:', err);
    }
  };

  const handleVotePoll = (pollId: string, optionId: string, allowsMultiple?: boolean) => {
    setPollVotes((prev) => {
      const current = prev[pollId] || [];
      if (allowsMultiple) {
        if (current.includes(optionId)) {
          return { ...prev, [pollId]: current.filter((id) => id !== optionId) };
        } else {
          return { ...prev, [pollId]: [...current, optionId] };
        }
      } else {
        return { ...prev, [pollId]: [optionId] };
      }
    });
  };

  const parseSpecialPayload = (text?: string) => {
    if (!text || (!text.startsWith('{') && !text.startsWith('{"type"'))) return null;
    try {
      const parsed = JSON.parse(text);
      if (parsed && (parsed.type === 'POLL' || parsed.type === 'ARTICLE' || parsed.type === 'LOCATION')) {
        return parsed;
      }
    } catch {
      return null;
    }
    return null;
  };

  const activeChat = chats.find((c) => c.id === activeChatId);
  const isSecret = activeChat?.type === 'SECRET';

  // Fetch chat messages
  useEffect(() => {
    if (!activeChatId || !token) return;

    joinChatRoom(activeChatId);

    fetch(`/api/chats/${activeChatId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(async (data) => {
        if (data.messages) {
          const processed = await Promise.all(
            data.messages.map(async (m: Message) => {
              if (m.ciphertext && m.iv) {
                const key = secretKeys[m.chatId];
                if (key) {
                  m.decryptedContent = await decryptSecretMessage(m.ciphertext, m.iv, key);
                } else {
                  m.decryptedContent = '🔒 [Encrypted Secret Message]';
                }
              }
              return m;
            })
          );
          setMessages(processed);
        }
      })
      .catch((err) => console.error(err));

    return () => {
      leaveChatRoom(activeChatId);
    };
  }, [activeChatId, token]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleToggleAudio = (id: string, url: string) => {
    if (playingAudioId === id) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(id);
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => setPlayingAudioId(null);
    }
  };

  if (!activeChatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[#7f91a4] select-none">
        <div className="px-4 py-2 rounded-full bg-[#17212b] text-xs font-medium">
          Select a chat to start messaging
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Pinned Message Sticky Banner */}
      <PinnedMessageBanner />

      <div className="flex-1 overflow-y-auto p-4 space-y-3 tg-wallpaper">
        {/* Secret Chat Banner */}
      {isSecret && (
        <div className={`max-w-md mx-auto my-4 p-4 rounded-2xl border text-center space-y-2 backdrop-blur-xs shadow-lg ${theme === 'light' ? 'bg-white/95 border-emerald-500/30 text-gray-800' : 'bg-[#17212b]/90 border-emerald-500/20 text-white'}`}>
          <div className="flex items-center justify-center gap-1.5 text-emerald-500 font-bold text-xs uppercase tracking-wider">
            <Lock className="w-4 h-4" /> End-to-End Encrypted Secret Chat
          </div>
          <div className={`text-[11px] leading-relaxed ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
            • Uses browser Web Cryptography API (ECDH P-256 + AES-GCM)<br />
            • Leaves no trace on our servers<br />
            • Forward secrecy & visual emoji key verification
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.map((m) => {
        const isMine = m.senderId === user?.id;
        const textToDisplay = m.decryptedContent || m.content;

        return (
          <div
            key={m.id}
            id={`msg-${m.id}`}
            className={`flex flex-col group ${isMine ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`relative max-w-[80%] sm:max-w-[70%] px-3.5 py-2 rounded-2xl shadow-xs text-sm select-text ${
                isMine
                  ? theme === 'light'
                    ? 'bg-[#effdde] text-gray-900 border border-[#d2ecad]/60 bubble-tail-out rounded-br-xs'
                    : 'bg-[#2b5278] text-white bubble-tail-out rounded-br-xs'
                  : theme === 'light'
                  ? 'bg-white text-gray-900 border border-gray-100 shadow-xs bubble-tail-in rounded-bl-xs'
                  : 'bg-[#182533] text-white bubble-tail-in rounded-bl-xs'
              }`}
            >
              {/* Forwarded Header */}
              {m.forwardFrom && (
                <div className="flex items-center gap-1 text-[11px] text-[#5288c1] font-semibold mb-1 italic">
                  <CornerUpRight className="w-3 h-3" />
                  <span>Forwarded from {m.forwardFrom}</span>
                </div>
              )}

              {/* Replied Message Quote Card */}
              {m.replyTo && (
                <div
                  onClick={() => {
                    const el = document.getElementById(`msg-${m.replyTo?.id}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el?.classList.add('animate-pulse');
                    setTimeout(() => el?.classList.remove('animate-pulse'), 1500);
                  }}
                  className={`mb-1.5 p-1.5 px-2 border-l-2 border-[#5288c1] rounded-r-lg cursor-pointer text-left text-xs transition ${theme === 'light' ? 'bg-black/5 hover:bg-black/10' : 'bg-black/25 hover:bg-black/35'}`}
                >
                  <div className="font-semibold text-[11px] text-[#5288c1]">
                    {m.replyTo?.sender?.displayName || 'Deleted Message'}
                  </div>
                  <div className={`text-[11px] truncate ${theme === 'light' ? 'text-gray-600' : 'text-white/70'}`}>
                    {m.replyTo.content || 'Photo/Media attachment'}
                  </div>
                </div>
              )}

              {/* Sender Name in group / channel context */}
              {!isMine && !m.forwardFrom && (
                <div className="text-[11px] font-semibold text-[#5288c1] mb-0.5">
                  {m.sender?.displayName || 'Colleague'}
                </div>
              )}

              {/* Attachments rendering */}
              {m.attachments?.map((att, i) => (
                <div key={i} className="mb-2">
                  {att.fileType.startsWith('image/') ? (
                    <img
                      src={att.fileUrl}
                      alt={att.fileName}
                      className="rounded-xl max-h-64 object-cover w-full cursor-pointer hover:opacity-95"
                      onClick={() => window.open(att.fileUrl, '_blank')}
                    />
                  ) : att.fileType.startsWith('audio/') ? (
                    /* Voice Note Waveform Player */
                    <div className="flex items-center gap-3 p-2 bg-black/20 rounded-xl min-w-[220px]">
                      <button
                        onClick={() => handleToggleAudio(m.id, att.fileUrl)}
                        className="w-9 h-9 rounded-full bg-[#5288c1] text-white flex items-center justify-center shrink-0 cursor-pointer shadow"
                      >
                        {playingAudioId === m.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </button>
                      <div className="flex-1 space-y-1">
                        <div className="h-4 flex items-center gap-0.5">
                          {[40, 70, 30, 90, 60, 100, 40, 80, 50, 70, 90, 40, 60, 30].map(
                            (h, idx) => (
                              <div
                                key={idx}
                                style={{ height: `${h}%` }}
                                className={`w-1 rounded-full ${
                                  playingAudioId === m.id ? 'bg-blue-300 animate-pulse' : 'bg-white/40'
                                }`}
                              />
                            )
                          )}
                        </div>
                        <div className="text-[10px] text-white/50">Voice Message</div>
                      </div>
                    </div>
                  ) : (
                    /* Generic File Document */
                    <a
                      href={att.fileUrl}
                      download={att.fileName}
                      className="flex items-center gap-2 p-2 bg-black/20 rounded-xl hover:bg-black/30 transition text-xs"
                    >
                      <Download className="w-4 h-4 text-[#5288c1]" />
                      <span className="truncate">{att.fileName}</span>
                    </a>
                  )}
                </div>
              ))}

              {/* Message Content or Structured Card (Poll, Article, Location) */}
              {(() => {
                const special = parseSpecialPayload(textToDisplay);
                if (special?.type === 'POLL') {
                  const myVotes = pollVotes[special.pollId] || [];
                  const totalVotes = special.options.reduce((acc: number, o: any) => {
                    const hasSelected = myVotes.includes(o.id);
                    return acc + (o.votes?.length || 0) + (hasSelected ? 1 : 0);
                  }, 0);

                  return (
                    <div className="w-64 sm:w-72 space-y-2 py-1 select-none">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                        <BarChart2 className="w-4 h-4 shrink-0" />
                        <span>{special.isAnonymous ? 'Anonymous Poll' : 'Public Poll'}</span>
                      </div>
                      <h4 className="font-bold text-sm text-white leading-snug">{special.question}</h4>
                      <div className="space-y-1.5 pt-1">
                        {special.options?.map((opt: any) => {
                          const isSelected = myVotes.includes(opt.id);
                          const votesCount = (opt.votes?.length || 0) + (isSelected ? 1 : 0);
                          const percent = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;

                          return (
                            <div
                              key={opt.id}
                              onClick={() => handleVotePoll(special.pollId, opt.id, special.allowsMultiple)}
                              className={`p-2.5 rounded-xl border transition cursor-pointer relative overflow-hidden ${
                                isSelected
                                  ? 'border-[#5288c1] bg-[#5288c1]/20'
                                  : 'border-white/10 hover:border-white/20 bg-black/15'
                              }`}
                            >
                              {totalVotes > 0 && (
                                <div
                                  style={{ width: `${percent}%` }}
                                  className="absolute left-0 top-0 bottom-0 bg-[#5288c1]/25 transition-all duration-300 pointer-events-none"
                                />
                              )}
                              <div className="flex items-center justify-between text-xs relative z-10">
                                <span className={`font-medium ${isSelected ? 'text-white' : 'text-white/90'}`}>{opt.text}</span>
                                {totalVotes > 0 && (
                                  <span className="font-bold text-[11px] text-[#5288c1] ml-2 shrink-0">
                                    {percent}%
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-[11px] text-[#7f91a4] pt-0.5">
                        {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                      </div>
                    </div>
                  );
                }

                if (special?.type === 'ARTICLE') {
                  return (
                    <div className="w-64 sm:w-80 p-3 rounded-xl bg-amber-500/10 border-l-4 border-amber-400 space-y-2 select-none">
                      <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Instant View Article</span>
                      </div>
                      <h4 className="font-bold text-sm text-white leading-tight">{special.title}</h4>
                      <p className="text-[11px] text-[#7f91a4]">By {special.author}</p>
                      <p className="text-xs text-white/80 line-clamp-3 leading-relaxed">{special.snippet}</p>
                      <button
                        type="button"
                        onClick={() => setReadingArticle(special)}
                        className="mt-1 w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Read Full Article</span>
                      </button>
                    </div>
                  );
                }

                if (special?.type === 'LOCATION') {
                  return (
                    <div className="w-64 sm:w-72 p-3 rounded-xl bg-rose-500/10 border-l-4 border-rose-400 space-y-2 select-none">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <h4 className="font-bold text-xs text-white truncate">{special.title}</h4>
                          <p className="text-[11px] text-white/70 truncate">{special.address}</p>
                        </div>
                      </div>
                      <a
                        href={special.mapsUrl || `https://maps.google.com/?q=${special.lat},${special.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <span>Open in Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  );
                }

                if (textToDisplay) {
                  return (
                    <div className="leading-relaxed break-words whitespace-pre-wrap">
                      {textToDisplay}
                    </div>
                  );
                }

                return null;
              })()}

              {/* Timestamp & Status Icon */}
              <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none ${theme === 'light' ? 'text-gray-500' : 'text-white/50'}`}>
                {m.isEdited && (
                  <span className={`text-[10px] italic mr-0.5 ${theme === 'light' ? 'text-gray-400' : 'text-white/40'}`}>edited</span>
                )}
                {m.ttlSeconds && (
                  <span className="text-amber-500 dark:text-amber-300 font-mono flex items-center gap-0.5">
                    <Clock className="w-3 h-3" /> {m.ttlSeconds}s
                  </span>
                )}
                <span>
                  {new Date(m.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {isMine && (
                  <CheckCheck className="w-3.5 h-3.5 text-[#5288c1]" />
                )}
              </div>
            </div>

            {/* Reactions Bar */}
            <div className="flex items-center gap-1 mt-1 px-1">
              {m.reactions && m.reactions.length > 0 && (
                <div className="flex items-center gap-1">
                  {m.reactions.map((r, idx) => (
                    <button
                      key={idx}
                      onClick={() => emitReaction(activeChatId, m.id, r.emoji)}
                      className={`px-2 py-0.5 rounded-full border text-xs flex items-center gap-1 cursor-pointer transition ${
                        theme === 'light'
                          ? 'bg-white border-gray-200 text-gray-800 hover:bg-gray-100 shadow-xs'
                          : 'bg-[#182533] border-white/10 hover:bg-white/10 text-white'
                      }`}
                    >
                      <span>{r.emoji}</span>
                      <span className={`text-[10px] ${theme === 'light' ? 'text-gray-500' : 'text-white/60'}`}>1</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Hover Quick Action Bar: Reactions, Reply, Forward, Edit & Delete */}
              <div className={`hidden group-hover:flex items-center gap-1 rounded-full px-2 py-0.5 border shadow-md ${
                theme === 'light' ? 'bg-white/95 border-gray-200 text-gray-700' : 'bg-[#17212b]/95 border-white/10 text-white'
              }`}>
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => emitReaction(activeChatId, m.id, emoji)}
                    className="hover:scale-125 transition text-xs cursor-pointer p-0.5"
                  >
                    {emoji}
                  </button>
                ))}

                <div className={`w-[1px] h-3 mx-0.5 ${theme === 'light' ? 'bg-gray-300' : 'bg-white/20'}`} />

                {/* Reply Button */}
                <button
                  onClick={() => setReplyingToMessage(m)}
                  title="Reply to message"
                  className={`hover:scale-110 transition text-xs cursor-pointer p-0.5 ${theme === 'light' ? 'text-gray-500 hover:text-[#5288c1]' : 'text-[#7f91a4] hover:text-[#5288c1]'}`}
                >
                  <Reply className="w-3.5 h-3.5" />
                </button>

                {/* Forward Button */}
                <button
                  onClick={() => {
                    setForwardingMessage(m);
                    setActiveModal('forward');
                  }}
                  title="Forward message"
                  className={`hover:scale-110 transition text-xs cursor-pointer p-0.5 ${theme === 'light' ? 'text-gray-500 hover:text-emerald-500' : 'text-[#7f91a4] hover:text-emerald-400'}`}
                >
                  <CornerUpRight className="w-3.5 h-3.5" />
                </button>

                {/* Quick Save to Saved Messages */}
                <button
                  onClick={() => handleQuickSaveToSavedMessages(m)}
                  title="Save to Saved Messages"
                  className={`hover:scale-110 transition text-xs cursor-pointer p-0.5 ${
                    theme === 'light'
                      ? 'text-gray-500 hover:text-[#5288c1]'
                      : 'text-[#7f91a4] hover:text-[#5288c1]'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                </button>

                {/* Pin / Unpin Button */}
                <button
                  onClick={() => emitTogglePin(activeChatId, m.id)}
                  title={m.isPinned ? 'Unpin message' : 'Pin message'}
                  className={`hover:scale-110 transition text-xs cursor-pointer p-0.5 ${
                    m.isPinned
                      ? 'text-amber-500'
                      : theme === 'light'
                      ? 'text-gray-500 hover:text-amber-500'
                      : 'text-[#7f91a4] hover:text-amber-400'
                  }`}
                >
                  <Pin className="w-3.5 h-3.5 transform -rotate-45" />
                </button>

                {/* Edit Button (for author of plaintext message) */}
                {isMine && !m.ciphertext && (
                  <button
                    onClick={() => setEditingMessage(m)}
                    title="Edit message"
                    className={`hover:scale-110 transition text-xs cursor-pointer p-0.5 ${theme === 'light' ? 'text-gray-500 hover:text-[#5288c1]' : 'text-[#7f91a4] hover:text-[#5288c1]'}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Delete Message Button */}
                <button
                  onClick={() => setMessageToDelete(m)}
                  title="Delete message"
                  className={`hover:scale-110 transition text-xs cursor-pointer p-0.5 ${theme === 'light' ? 'text-gray-500 hover:text-red-500' : 'text-[#7f91a4] hover:text-red-400'}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
        <div ref={bottomRef} />
      </div>

      {/* Delete Confirmation Modal */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#17212b] rounded-2xl p-5 max-w-xs w-full border border-white/10 shadow-2xl animate-in fade-in zoom-in-95">
            <h4 className="font-bold text-sm text-white mb-2">Delete message?</h4>
            <p className="text-xs text-[#7f91a4] mb-4">
              Are you sure you want to delete this message? It will be removed for everyone in this chat.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setMessageToDelete(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/70 hover:bg-white/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  emitDeleteMessage(activeChatId, messageToDelete.id);
                  setMessageToDelete(null);
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Instant View Article Reader Modal */}
      {readingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-2xl max-h-[85vh] bg-[#17212b] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col text-white animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <BookOpen className="w-4 h-4" />
                <span>Instant View</span>
              </div>
              <button
                onClick={() => setReadingArticle(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#7f91a4] hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              <h2 className="text-xl font-bold leading-snug">{readingArticle.title}</h2>
              <div className="text-xs text-[#7f91a4]">
                <span>By {readingArticle.author}</span>
                {readingArticle.publishedAt && (
                  <span> • {new Date(readingArticle.publishedAt).toLocaleDateString()}</span>
                )}
              </div>
              <div className="text-xs text-white/90 leading-relaxed whitespace-pre-wrap font-serif text-[13px] border-t border-white/5 pt-4">
                {readingArticle.body}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#5288c1] text-white px-4 py-2 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Bookmark className="w-4 h-4 fill-white/20" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
