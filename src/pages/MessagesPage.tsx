import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, ArrowLeft, Search, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  getConversations,
  getMessages,
  sendMessage,
  markMessagesRead,
  Conversation,
  Message,
} from '../lib/messaging';
import { PageType } from '../App';

interface MessagesPageProps {
  user: any;
  userProfile: any;
  onNavigate: (page: PageType, hostelId?: string) => void;
  initialConversationId?: string;
}

export default function MessagesPage({
  user,
  userProfile,
  onNavigate,
  initialConversationId,
}: MessagesPageProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  useEffect(() => {
    if (selectedConvo) {
      loadMessages(selectedConvo.id);
      markMessagesRead(selectedConvo.id, user.id);
    }
  }, [selectedConvo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!selectedConvo) return;
    const channel = supabase
      .channel(`messages:${selectedConvo.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${selectedConvo.id}`,
      }, async (payload) => {
        const { data } = await supabase
          .from('messages')
          .select(`*, sender:user_profiles!messages_sender_id_fkey(full_name, avatar_url)`)
          .eq('id', payload.new.id)
          .single();
        if (data) {
          setMessages(prev => [...prev, data]);
          if (data.sender_id !== user.id) {
            markMessagesRead(selectedConvo.id, user.id);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConvo, user.id]);

  async function loadConversations() {
    try {
      const data = await getConversations(user.id);
      setConversations(data);
      if (initialConversationId) {
        const target = data.find(c => c.id === initialConversationId);
        if (target) setSelectedConvo(target);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(conversationId: string) {
    const data = await getMessages(conversationId);
    setMessages(data);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConvo || sending) return;

    setSending(true);
    try {
      await sendMessage(selectedConvo.id, user.id, newMessage.trim());
      setNewMessage('');
    } catch {
    } finally {
      setSending(false);
    }
  }

  const getOtherParty = (convo: Conversation) => {
    if (user.id === convo.student_id) {
      return convo.owner || { full_name: 'Hostel Owner', avatar_url: null };
    }
    return convo.student || { full_name: 'Student', avatar_url: null };
  };

  const filteredConvos = conversations.filter(c => {
    const q = searchQuery.toLowerCase();
    const other = getOtherParty(c);
    return (
      c.hostels?.name.toLowerCase().includes(q) ||
      other.full_name?.toLowerCase().includes(q)
    );
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Sign in to view messages</h3>
          <button
            onClick={() => onNavigate('auth')}
            className="px-6 py-2 bg-[#DC143C] text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-0 sm:px-4 py-0 sm:py-6">
        <div className="bg-white sm:rounded-2xl shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
          <div className="flex h-full">
            <div className={`w-full sm:w-80 flex-shrink-0 border-r border-gray-100 flex flex-col ${selectedConvo ? 'hidden sm:flex' : 'flex'}`}>
              <div className="p-4 border-b border-gray-100">
                <h1 className="text-xl font-bold text-gray-900 mb-3">Messages</h1>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse flex gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4" />
                          <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredConvos.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No conversations yet</p>
                    <p className="text-xs text-gray-400 mt-1">Message a hostel from its detail page</p>
                  </div>
                ) : (
                  filteredConvos.map(convo => {
                    const other = getOtherParty(convo);
                    const isSelected = selectedConvo?.id === convo.id;
                    return (
                      <button
                        key={convo.id}
                        onClick={() => setSelectedConvo(convo)}
                        className={`w-full p-4 flex items-start gap-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 ${isSelected ? 'bg-red-50' : ''}`}
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
                          {other.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="font-semibold text-gray-900 text-sm truncate">{other.full_name}</p>
                            <p className="text-xs text-gray-400 flex-shrink-0 ml-2">
                              {new Date(convo.last_message_at).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 truncate">{convo.hostels?.name}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className={`flex-1 flex flex-col ${selectedConvo ? 'flex' : 'hidden sm:flex'}`}>
              {selectedConvo ? (
                <>
                  <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConvo(null)}
                      className="sm:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold">
                      {getOtherParty(selectedConvo).full_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{getOtherParty(selectedConvo).full_name}</p>
                      <p className="text-xs text-gray-500">{selectedConvo.hostels?.name}</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map(msg => {
                      const isMine = msg.sender_id === user.id;
                      return (
                        <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          {!isMine && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm mr-2 flex-shrink-0 mt-auto">
                              {msg.sender?.full_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                              isMine
                                ? 'bg-[#DC143C] text-white rounded-br-sm'
                                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                            }`}
                          >
                            <p className="leading-relaxed">{msg.content}</p>
                            <p className={`text-xs mt-1 ${isMine ? 'text-red-200' : 'text-gray-400'}`}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={handleSend} className="p-4 border-t border-gray-100 flex gap-3">
                    <input
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
                      maxLength={2000}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="p-2.5 bg-[#DC143C] text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex-shrink-0"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-400">Select a conversation</h3>
                    <p className="text-sm text-gray-400 mt-1">Choose from your conversations on the left</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
