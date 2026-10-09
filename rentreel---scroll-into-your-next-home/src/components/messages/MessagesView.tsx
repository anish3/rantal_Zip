import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Image,
  Sparkles,
  CheckCheck,
  Building,
  MapPin,
  Clock,
  Phone,
  Video,
  Info,
  Calendar,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react';
import { Conversation, Message, MessageContext, User } from '../../types/client.ts';
import { api } from '../../lib/api.ts';
import { useApp } from '../../context/AppContext.tsx';

export const MessagesView: React.FC<{ initialConversationId?: string; initialContext?: MessageContext }> = ({
  initialConversationId,
  initialContext,
}) => {
  const { currentUser, showToast, openPropertyProfile, openScheduleVisit } = useApp();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(initialConversationId || null);
  const [activeOtherUser, setActiveOtherUser] = useState<User | null>(null);
  const [activeContext, setActiveContext] = useState<MessageContext | undefined>(initialContext);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    'Is this room still available for move-in?',
    'Can I schedule an in-person visit tomorrow?',
    'What is the security deposit amount?',
    'Is vegetarian meal included in the rent?',
  ];

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data.conversations);
      if (!activeConvId && data.conversations.length > 0) {
        setActiveConvId(data.conversations[0].id);
        setActiveOtherUser(data.conversations[0].otherUser || null);
        setActiveContext(data.conversations[0].activeContext);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (initialConversationId) {
      setActiveConvId(initialConversationId);
      if (initialContext) {
        setActiveContext(initialContext);
      }
      loadConversations();
    }
  }, [initialConversationId, initialContext]);

  const loadActiveMessages = async (convId: string) => {
    try {
      const data = await api.getMessages(convId);
      setMessages(data.messages);
      setActiveOtherUser(data.otherUser);
      if (data.conversation.activeContext) {
        setActiveContext(data.conversation.activeContext);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeConvId) {
      loadActiveMessages(activeConvId);
      const pollTimer = setInterval(() => {
        loadActiveMessages(activeConvId);
      }, 3000);
      return () => clearInterval(pollTimer);
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || !activeConvId || !activeOtherUser || !currentUser) return;

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      conversationId: activeConvId,
      senderId: currentUser.id,
      receiverId: activeOtherUser.id,
      text: textToSend.trim(),
      context: activeContext,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');

    try {
      await api.sendMessage({
        conversationId: activeConvId,
        receiverId: activeOtherUser.id,
        text: textToSend.trim(),
        context: activeContext,
      });

      // Simulate realistic typing reply after 1.8 seconds!
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          const autoReply: Message = {
            id: `reply-${Date.now()}`,
            conversationId: activeConvId,
            senderId: activeOtherUser.id,
            receiverId: currentUser.id,
            text: `Hi ${currentUser.name}! Yes, it is available. You are welcome to visit anytime between 11 AM and 7 PM. Let me know what time works best!`,
            isRead: true,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, autoReply]);
        }, 1800);
      }, 800);
    } catch (e) {
      showToast('Could not send message', 'error');
    }
  };

  return (
    <div className="h-[calc(100vh-4.5rem)] max-w-6xl mx-auto px-2 md:px-4 py-2 flex gap-4">
      {/* Left List of Conversations */}
      <div
        className={`w-full md:w-80 lg:w-96 bg-zinc-900/90 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl backdrop-blur-md ${
          activeConvId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <span>Direct Messages</span>
            <span className="text-xs text-rose-400 font-bold">
              ({conversations.length})
            </span>
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">
          {conversations.map((c) => {
            const isSelected = activeConvId === c.id;
            const other = c.otherUser;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setActiveConvId(c.id);
                  setActiveOtherUser(other || null);
                  setActiveContext(c.activeContext);
                }}
                className={`w-full p-4 flex items-center gap-3.5 text-left transition-colors ${
                  isSelected ? 'bg-zinc-800/90' : 'hover:bg-zinc-850'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={other?.avatar || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=100'}
                    alt={other?.name}
                    className="w-12 h-12 rounded-full object-cover border border-zinc-700"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-zinc-900"></span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white truncate">{other?.name}</p>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate mt-0.5 font-medium">
                    {c.lastMessage || 'New inquiry conversation'}
                  </p>
                  {c.activeContext && (
                    <span className="text-[10px] text-rose-400 font-semibold truncate block mt-0.5">
                      📍 {c.activeContext.title}
                    </span>
                  )}
                </div>

                {c.unreadCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Active Chat Thread */}
      <div
        className={`flex-1 bg-zinc-900/90 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl backdrop-blur-md ${
          !activeConvId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeConvId && activeOtherUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveConvId(null)}
                  className="md:hidden p-1.5 rounded-xl text-zinc-400 hover:text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="relative">
                  <img
                    src={activeOtherUser.avatar}
                    alt={activeOtherUser.name}
                    className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950"></span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    {activeOtherUser.name}
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-medium">
                    Active now • {activeOtherUser.activeRole}
                  </p>
                </div>
              </div>

              {/* Header Action Tools */}
              <div className="flex items-center gap-2">
                {activeContext && (
                  <button
                    onClick={() => openPropertyProfile(activeContext.id)}
                    className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200"
                  >
                    <span>View Property</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* ATTACHED PROPERTY CONTEXT BANNER (RULE 10) */}
            {activeContext && (
              <div className="bg-zinc-950/90 border-b border-zinc-800 p-3 flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3 truncate">
                  {activeContext.imageUrl && (
                    <img
                      src={activeContext.imageUrl}
                      alt={activeContext.title}
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                    />
                  )}
                  <div className="truncate">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                      Inquiring About {activeContext.type}
                    </span>
                    <h4 className="text-xs font-bold text-white truncate">{activeContext.title}</h4>
                    {activeContext.price && (
                      <p className="text-xs font-extrabold text-emerald-400">
                        ₹{activeContext.price.toLocaleString('en-IN')}/mo
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() =>
                      openScheduleVisit(
                        activeContext.id,
                        activeContext.title,
                        activeOtherUser.id
                      )
                    }
                    className="px-3 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 rounded-xl text-xs font-bold transition-colors"
                  >
                    Schedule Visit
                  </button>
                </div>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m) => {
                const isMine = m.senderId === currentUser?.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-md rounded-2xl px-4 py-2.5 text-xs font-medium shadow-md ${
                        isMine
                          ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-br-none'
                          : 'bg-zinc-800 text-zinc-100 rounded-bl-none'
                      }`}
                    >
                      <p className="leading-relaxed">{m.text}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-500 px-1">
                      <span>
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {isMine && <CheckCheck className="w-3 h-3 text-sky-400" />}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator simulation */}
              {isTyping && (
                <div className="flex items-center gap-2 bg-zinc-800/80 px-3 py-2 rounded-2xl w-fit">
                  <span className="text-[11px] text-zinc-400 font-medium">
                    {activeOtherUser.name} is typing...
                  </span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce delay-200"></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Inquiry Preset Buttons */}
            <div className="p-2 border-t border-zinc-800/80 overflow-x-auto no-scrollbar flex items-center gap-1.5 bg-zinc-950/40">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  className="whitespace-nowrap px-3 py-1 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-300 transition-colors flex-shrink-0"
                >
                  💬 {q}
                </button>
              ))}
            </div>

            {/* Message Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 border-t border-zinc-800 flex items-center gap-2 bg-zinc-950/80"
            >
              <input
                type="text"
                placeholder={`Message ${activeOtherUser.name}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="p-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl shadow-md transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-zinc-500 space-y-2">
            <Building className="w-12 h-12 text-zinc-700" />
            <p className="font-bold text-zinc-400">Select a conversation</p>
            <p className="text-xs text-zinc-600">
              Click Message Owner on any listing or tenant requirement to chat.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
