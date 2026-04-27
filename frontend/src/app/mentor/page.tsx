'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Bot, Sparkles, RefreshCw, MessageCircle, ArrowLeft, Terminal, Briefcase, Zap, Plus, Trash2 } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Navbar from '@/components/Navbar';
import { resolveGeminiModel } from '@/lib/geminiModel';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MentorSession {
  id: string;
  title: string;
  lastUpdated: string;
  messages: Message[];
}

const SUGGESTED_PROMPTS = [
  "Làm sao để đàm phán lương hiệu quả?",
  "Kế toán trưởng cần những chứng chỉ gì?",
  "Cách chuẩn bị cho phỏng vấn văn hóa doanh nghiệp?",
  "Quản trị kinh doanh thì nên bắt đầu từ đâu?"
];

function AIMentorContent() {
  const [sessions, setSessions] = useState<MentorSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'guest' : 'guest';
  const STORAGE_KEY = `lexiai_mentor_sessions_${username}`;

  useEffect(() => {
    setMounted(true);
    // Load sessions from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: MentorSession[] = JSON.parse(saved);
        // Convert string dates back to Date objects
        const formatted = parsed.map(s => ({
          ...s,
          messages: s.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }))
        }));
        setSessions(formatted);
        if (formatted.length > 0) {
          // Load most recent session by default
          const mostRecent = formatted.sort((a, b) => 
            new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
          )[0];
          setActiveSessionId(mostRecent.id);
          setMessages(mostRecent.messages);
        } else {
          startNewChat();
        }
      } catch (e) {
        console.error("Lỗi load sessions:", e);
        startNewChat();
      }
    } else {
      startNewChat();
    }
  }, []);

  const startNewChat = () => {
    const initialMessage: Message = {
      role: 'assistant',
      content: 'Xin chào! Tôi là Lexi Mentor. Tôi ở đây để hỗ trợ bạn định hướng sự nghiệp, tối ưu hóa hồ sơ và giải đáp mọi thắc mắc về thị trường lao động. Hôm nay tôi có thể giúp gì cho bạn?',
      timestamp: new Date()
    };
    const newSession: MentorSession = {
      id: Date.now().toString(),
      title: 'Cuộc trò chuyện mới',
      lastUpdated: new Date().toISOString(),
      messages: [initialMessage]
    };
    setMessages([initialMessage]);
    setActiveSessionId(newSession.id);
    setSessions(prev => [newSession, ...prev]);
    saveSessions([newSession, ...sessions]);
  };

  const saveSessions = (updatedSessions: MentorSession[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
  };

  const loadSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setActiveSessionId(id);
      setMessages(session.messages);
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa cuộc trò chuyện này?')) return;
    
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    saveSessions(updated);
    
    if (activeSessionId === id) {
      if (updated.length > 0) {
        loadSession(updated[0].id);
      } else {
        startNewChat();
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;

    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      alert("Vui lòng cài đặt Gemini API Key trên thanh điều hướng trước.");
      return;
    }

    const userMessage: Message = { role: 'user', content: text, timestamp: new Date() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Update session title if it's the first user message
    let updatedTitle = sessions.find(s => s.id === activeSessionId)?.title || 'Cuộc trò chuyện mới';
    if (newMessages.filter(m => m.role === 'user').length === 1) {
      updatedTitle = text.length > 30 ? text.substring(0, 30) + '...' : text;
    }

    try {
      const cvText = localStorage.getItem(`last_cv_text_${username}`);
      const modelType = localStorage.getItem('lexiai_model') || 'flash';
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = await resolveGeminiModel(apiKey, modelType === 'pro' ? 'pro' : 'flash');
      const model = genAI.getGenerativeModel({ model: modelName });

      const systemPrompt = `Bạn là Lexi Mentor - một chuyên gia tư vấn sự nghiệp cao cấp với 15 năm kinh nghiệm trong lĩnh vực nhân sự và công nghệ.
Nhiệm vụ của bạn:
1. Đưa ra lời khuyên nghề nghiệp thực tế, sắc bén và có tính hành động cao.
2. Trả lời các câu hỏi về thị trường lao động, xu hướng công nghệ và kỹ năng.
3. Nếu có thông tin CV đi kèm, hãy cá nhân hóa câu trả lời dựa trên kinh nghiệm của người dùng.
4. Giọng văn: Chuyên nghiệp, truyền cảm hứng, thẳng thắn nhưng khích lệ.

${cvText ? `Dưới đây là thông tin CV của người dùng để bạn tham khảo:\n${cvText}\n\n` : ''}
Hãy trả lời tin nhắn của người dùng bằng tiếng Việt. Sử dụng định dạng Markdown nếu cần thiết.`;

      const chatHistory = messages
        .filter((m, i) => !(i === 0 && m.role === 'assistant')) // Skip initial greeting
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        }));

      const chat = model.startChat({
        history: chatHistory,
      });

      const result = await chat.sendMessageStream([
        { text: systemPrompt },
        { text: text }
      ]);

      let assistantMessage: Message = { role: 'assistant', content: '', timestamp: new Date() };
      setMessages(prev => [...prev, assistantMessage]);

      let fullContent = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullContent += chunkText;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...assistantMessage, content: fullContent };
          return updated;
        });
      }

      // Final save to sessions
      const finalMessages = [...newMessages, { ...assistantMessage, content: fullContent }];
      const updatedSessions = sessions.map(s => 
        s.id === activeSessionId 
        ? { ...s, messages: finalMessages, title: updatedTitle, lastUpdated: new Date().toISOString() } 
        : s
      );
      setSessions(updatedSessions);
      saveSessions(updatedSessions);

    } catch (error: any) {
      console.error(error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Lỗi: ${error.message}. Vui lòng kiểm tra lại API Key hoặc kết nối mạng.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="bg-background text-foreground h-screen flex flex-col overflow-hidden">
      <Navbar />
      
      <main className="flex-1 max-w-[1600px] mx-auto w-full pt-28 pb-6 px-4 md:px-8 flex gap-6 overflow-hidden">
        {/* Sidebar - Chat History */}
        <aside className="w-80 hidden lg:flex flex-col gap-4 overflow-hidden">
          <div className="glass p-4 rounded-2xl flex flex-col gap-4 h-full border border-white/10">
            <button 
              onClick={startNewChat}
              className="w-full py-3 premium-gradient rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover-glow transition-all shrink-0"
            >
              <Plus size={18} /> Chat mới
            </button>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2 mb-4">Lịch sử trò chuyện</h3>
              <AnimatePresence initial={false}>
                {sessions.map((session) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => loadSession(session.id)}
                    className={`group p-4 rounded-xl border cursor-pointer transition-all relative ${
                      activeSessionId === session.id 
                      ? 'bg-accent/10 border-accent/30 text-accent' 
                      : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <MessageCircle size={16} className={activeSessionId === session.id ? 'text-accent' : 'text-muted-foreground'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate pr-6">{session.title}</p>
                        <p className="text-[9px] opacity-50 mt-1 font-medium">
                          {new Date(session.lastUpdated).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => deleteSession(session.id, e)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {sessions.length === 0 && (
                <div className="text-center py-10 opacity-30 italic text-sm">Chưa có lịch sử.</div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Chat Header */}
          <div className="flex items-center justify-between glass p-4 rounded-2xl border border-black/5 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <Bot size={24} />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">Lexi Mentor</h1>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Sẵn sàng hỗ trợ</span>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Trí tuệ nhân tạo</p>
                <p className="text-xs font-medium">Gemini Pro/Flash</p>
              </div>
              <Zap size={20} className="text-accent" />
            </div>
          </div>

          {/* Chat Box */}
          <div className="flex-1 bg-white/50 dark:bg-transparent glass rounded-2xl border border-black/5 dark:border-white/5 flex flex-col overflow-hidden relative">
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar"
            >
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[85%] md:max-w-[70%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-accent text-white' : 'bg-white/10 text-accent'}`}>
                        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                      </div>
                      <div className={`space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user' 
                          ? 'bg-accent text-white shadow-lg' 
                          : 'bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 text-foreground shadow-sm'
                        }`}>
                          {msg.content}
                        </div>
                        <span className="text-[9px] text-muted-foreground px-1">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {loading && (
                <div className="flex justify-start">
                  <div className="flex gap-3 items-center text-accent">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <Bot size={16} />
                    </div>
                    <div className="flex gap-1">
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-accent rounded-full" />
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-accent rounded-full" />
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-accent rounded-full" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompts */}
            {messages.length < 3 && (
              <div className="p-4 flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    suppressHydrationWarning
                    className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-muted-foreground hover:bg-accent/10 hover:text-accent hover:border-accent/50 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 md:p-6 border-t border-white/5">
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(input);
                    }
                  }}
                  suppressHydrationWarning
                  placeholder="Hỏi Lexi Mentor về sự nghiệp của bạn..."
                  className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl py-4 pl-4 pr-14 text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-all resize-none min-h-[60px] max-h-[120px] shadow-sm"
                  rows={1}
                />
                <button
                  onClick={() => handleSend(input)}
                  disabled={loading || !input.trim()}
                  suppressHydrationWarning
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 premium-gradient rounded-xl text-white shadow-lg disabled:opacity-50 hover-glow transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="mt-3 text-[10px] text-center text-muted-foreground">
                Lexi Mentor sử dụng trí tuệ nhân tạo để đưa ra lời khuyên. Hãy đối chiếu với thực tế và chuyên gia.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


export default function AIMentorPage() {
  const [userKey, setUserKey] = useState<string | null>(null);

  useEffect(() => {
    setUserKey(localStorage.getItem('username') || 'guest');
  }, []);

  if (userKey === null) return null;

  return (
    <AIMentorContent key={userKey} />
  );
}

