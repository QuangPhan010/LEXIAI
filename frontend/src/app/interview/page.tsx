'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import { API_BASE_URL } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Bot, Zap, RefreshCw, Trophy, Lightbulb, FileText, ChevronRight } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { resolveGeminiModel } from '@/lib/geminiModel';
import { useSearchParams } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function MockInterviewContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [jd, setJd] = useState('');
  const [initialPrompt, setInitialPrompt] = useState('');
  const [evaluation, setEvaluation] = useState<string | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [isHistory, setIsHistory] = useState(false);
  const [language, setLanguage] = useState<'vi' | 'en' | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const historyId = searchParams.get('historyId');
    if (historyId) {
      loadHistory(historyId);
    }
  }, [searchParams]);

  const loadHistory = async (id: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/interviews/${id}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setEvaluation(data.evaluation);
        setIsStarted(true);
        setIsHistory(true);
        if (data.evaluation) {
          setShowEvaluation(true);
        }
      }
    } catch (error) {
      console.error("Lỗi tải lịch sử phỏng vấn:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startInterview = async (selectedLang: 'vi' | 'en') => {
    const cvText = localStorage.getItem('last_cv_text');
    if (!cvText) {
      alert("Vui lòng tải lên và phân tích CV trước khi bắt đầu phỏng vấn.");
      return;
    }
    
    setLanguage(selectedLang);
    setIsStarted(true);
    setLoading(true);

    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      alert("Vui lòng cài đặt API Key.");
      return;
    }

    const modelType = localStorage.getItem('lexiai_model') || 'flash';
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = await resolveGeminiModel(apiKey, modelType as any);
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { }
      });

      const prompt = selectedLang === 'vi' 
        ? `
          Bạn là một nhà tuyển dụng chuyên nghiệp. 
          Dựa trên nội dung CV sau đây ${jd ? 'và Mô tả công việc (JD) được cung cấp' : ''}, hãy bắt đầu một buổi phỏng vấn thử.
          Hãy bắt đầu bằng lời chào và một câu hỏi phỏng vấn đầu tiên liên quan đến kinh nghiệm hoặc kỹ năng trong CV.
          Giữ văn phong chuyên nghiệp nhưng cởi mở. 
          Chỉ trả về nội dung câu hỏi bằng tiếng Việt.

          NỘI DUNG CV: ${cvText}
          ${jd ? `MÔ TẢ CÔNG VIỆC (JD): ${jd}` : ''}
        `
        : `
          You are a professional interviewer. 
          Based on the following CV content ${jd ? 'and the provided Job Description (JD)' : ''}, start a mock interview.
          Begin with a greeting and the first interview question related to the experience or skills in the CV.
          Keep the tone professional but welcoming. 
          Return ONLY the interview question in English.

          CV CONTENT: ${cvText}
          ${jd ? `JOB DESCRIPTION (JD): ${jd}` : ''}
        `;

      setInitialPrompt(prompt);
      
      let result;
      let retries = 0;
      const maxRetries = 3;
      while (retries < maxRetries) {
        try {
          result = await model.generateContentStream(prompt);
          break;
        } catch (err: any) {
          retries++;
          if (retries < maxRetries && (err.message?.includes('503') || err.message?.includes('high demand'))) {
            await delay(Math.pow(2, retries) * 1000);
          } else { throw err; }
        }
      }

      let fullText = "";
      setMessages([{ role: 'assistant', content: "" }]);
      
      if (result) {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullText += chunkText;
          setMessages([{ role: 'assistant', content: fullText }]);
        }
      }

    } catch (error) {
      console.error(error);
      alert("Lỗi khi bắt đầu phỏng vấn.");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input || loading) return;

    const currentMessages = [...messages];
    const userMessage = input;
    setInput('');
    setHint(null);
    const newMessages: Message[] = [...currentMessages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    const apiKey = localStorage.getItem('gemini_api_key');

    const modelType = localStorage.getItem('lexiai_model') || 'flash';
    try {
      const genAI = new GoogleGenerativeAI(apiKey!);
      const modelName = await resolveGeminiModel(apiKey!, modelType as any);
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { }
      });

      const chat = model.startChat({
        history: [
          { role: 'user', parts: [{ text: initialPrompt }] },
          ...currentMessages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
          })),
        ],
      });

      let result;
      let retries = 0;
      const maxRetries = 3;
      while (retries < maxRetries) {
        try {
          result = await chat.sendMessageStream(userMessage);
          break;
        } catch (err: any) {
          retries++;
          if (retries < maxRetries && (err.message?.includes('503') || err.message?.includes('high demand'))) {
            await delay(Math.pow(2, retries) * 1000);
          } else { throw err; }
        }
      }

      let fullText = "";
      setMessages(prev => [...prev, { role: 'assistant', content: "" }]);

      if (result) {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullText += chunkText;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].content = fullText;
            return updated;
          });
        }
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetHint = async () => {
    if (loading || hintLoading || messages.length === 0) return;

    setHintLoading(true);
    const apiKey = localStorage.getItem('gemini_api_key');
    try {
      const genAI = new GoogleGenerativeAI(apiKey!);
      const modelName = await resolveGeminiModel(apiKey!, 'flash');
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { } // Hint chỉ cần ngắn
      });

      const lastQuestion = messages[messages.length - 1].content;
      const prompt = language === 'vi'
        ? `Câu hỏi phỏng vấn là: "${lastQuestion}". Hãy đưa ra một gợi ý ngắn gọn (khoảng 2-3 ý) về cách trả lời tốt nhất cho câu hỏi này dựa trên CV của ứng viên. Chỉ trả về nội dung gợi ý bằng tiếng Việt.`
        : `The interview question is: "${lastQuestion}". Provide a concise hint (2-3 bullet points) on how to best answer this question based on the candidate's CV. Return ONLY the hint in English.`;

      let result;
      let retries = 0;
      const maxRetries = 3;
      while (retries < maxRetries) {
        try {
          result = await model.generateContent(prompt);
          break;
        } catch (err: any) {
          retries++;
          if (retries < maxRetries && (err.message?.includes('503') || err.message?.includes('high demand'))) {
            await delay(Math.pow(2, retries) * 1000);
          } else { throw err; }
        }
      }
      if (result) {
        setHint(result.response.text());
      }
    } catch (error) {
      console.error("Lỗi lấy gợi ý:", error);
    } finally {
      setHintLoading(false);
    }
  };

  const handleEndInterview = async () => {
    if (messages.length < 2) {
      alert("Buổi phỏng vấn quá ngắn để đánh giá. Hãy trao đổi thêm nhé!");
      return;
    }

    setLoading(true);
    const apiKey = localStorage.getItem('gemini_api_key');
    const modelType = localStorage.getItem('lexiai_model') || 'flash';
    try {
      const genAI = new GoogleGenerativeAI(apiKey!);
      const modelName = await resolveGeminiModel(apiKey!, modelType as any);
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { } // Đánh giá cần dài hơn chút
      });

      const transcript = messages.map(m => `${m.role === 'user' ? 'Ứng viên' : 'Người phỏng vấn'}: ${m.content}`).join('\n\n');
      
      const evalPrompt = language === 'vi'
        ? `Dựa trên nội dung buổi phỏng vấn sau đây, hãy đưa ra nhận xét chi tiết và khách quan về phần thể hiện của ứng viên.
          
          TRANSCRIPT BUỔI PHỎNG VẤN:
          ${transcript}

          Hãy chia nhỏ thành các mục: 1. Điểm mạnh, 2. Điểm cần cải thiện, 3. Lời khuyên & Tài liệu tham khảo. 
          Văn phong chuyên nghiệp, khích lệ. Chỉ trả về nội dung nhận xét bằng tiếng Việt.`
        : `Based on the following interview transcript, please provide a detailed and objective evaluation of the candidate's performance.
          
          INTERVIEW TRANSCRIPT:
          ${transcript}

          Break it down into: 1. Strengths, 2. Areas for Improvement, 3. Advice & Reference Materials. 
          Keep the tone professional and encouraging. Return ONLY the evaluation content in English.`;
      
      let result;
      let retries = 0;
      const maxRetries = 3;
      while (retries < maxRetries) {
        try {
          result = await model.generateContent([initialPrompt, evalPrompt]);
          break;
        } catch (err: any) {
          retries++;
          if (retries < maxRetries && (err.message?.includes('503') || err.message?.includes('high demand'))) {
            await delay(Math.pow(2, retries) * 1000);
          } else { throw err; }
        }
      }
      
      if (result) {
        const response = await result.response;
        const evaluationText = response.text();
        setEvaluation(evaluationText);
        setShowEvaluation(true);

        const token = localStorage.getItem('access_token');
        if (token) {
          try {
            const res = await fetch(`${API_BASE_URL}/interviews/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                messages: [...messages],
                evaluation: evaluationText
              })
            });
            if (res.status === 401) {
              localStorage.removeItem('access_token');
              localStorage.removeItem('username');
              window.location.href = '/auth/login';
              return;
            }
            if (!res.ok) {
              const errorData = await res.json();
              console.error("Lỗi khi lưu lịch sử phỏng vấn:", res.status, errorData);
            } else {
              console.log("Lưu lịch sử phỏng vấn thành công");
            }
          } catch (e) {
            console.error("Lỗi kết nối khi lưu lịch sử phỏng vấn:", e);
          }
        }
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi khi tạo nhận xét. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const restartInterview = () => {
    setMessages([]);
    setIsStarted(false);
    setEvaluation(null);
    setShowEvaluation(false);
    setInitialPrompt('');
    setIsHistory(false);
    setLanguage(null);
    setHint(null);
  };

  if (!isMounted) return null;

  return (
    <div className="bg-background text-foreground pt-32 pb-32 px-8">
      <Navbar />
      <main className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col space-y-6">
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-gradient">Phỏng vấn thử AI</h1>
            <p className="text-muted-foreground text-sm">Luyện tập trả lời phỏng vấn dựa trên CV của bạn.</p>
          </div>
          {!isStarted ? (
            <div className="flex gap-4">
              <button 
                onClick={() => startInterview('vi')}
                className="px-6 py-3 bg-muted/50 border border-border rounded-xl font-bold hover:bg-muted transition-all flex items-center gap-2"
              >
                <span className="text-xl">🇻🇳</span> Tiếng Việt
              </button>
              <button 
                onClick={() => startInterview('en')}
                className="px-6 py-3 premium-gradient rounded-xl font-bold shadow-lg hover-glow transition-all flex items-center gap-2"
              >
                <span className="text-xl">🇺🇸</span> English
              </button>
            </div>
          ) : isHistory ? (
            <div className="flex gap-2">
              <button 
                onClick={() => setShowEvaluation(true)}
                className="px-6 py-3 bg-accent/20 border border-accent/30 text-accent rounded-xl font-bold hover:bg-accent/30 transition-all flex items-center gap-2"
              >
                <Trophy size={18} /> Xem lại đánh giá
              </button>
              <button 
                onClick={restartInterview}
                className="px-6 py-3 bg-muted/50 border border-border text-muted-foreground rounded-xl font-bold hover:bg-muted transition-all"
              >
                Phỏng vấn mới
              </button>
            </div>
          ) : (
            <button 
              onClick={handleEndInterview}
              disabled={loading || messages.length < 2}
              className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trophy size={18} /> Kết thúc & Đánh giá
            </button>
          )}
        </header>

        {isStarted ? (
          <div className="flex-1 glass border-border flex flex-col overflow-hidden">
            {/* Chat Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
            >
              <AnimatePresence mode="popLayout">
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        msg.role === 'user' ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'
                      }`}>
                        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                      </div>
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user' 
                        ? 'bg-accent text-white shadow-lg' 
                        : 'bg-muted/30 border border-border text-foreground'
                      }`}>
                        {msg.content || (loading && idx === messages.length - 1 ? <RefreshCw size={14} className="animate-spin" /> : '')}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {hint && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex gap-3"
                >
                  <Lightbulb className="text-yellow-500 shrink-0" size={18} />
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-yellow-500">Gợi ý từ AI</p>
                    <p className="text-sm text-muted-foreground leading-relaxed italic">{hint}</p>
                  </div>
                </motion.div>
              )}

              {loading && messages[messages.length-1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="bg-muted/50 border border-border p-4 rounded-2xl flex items-center gap-2">
                    <RefreshCw size={16} className="animate-spin text-accent" />
                    <span className="text-xs text-muted-foreground italic">AI đang suy nghĩ...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            {!isHistory ? (
              <div className="p-4 bg-muted/20 border-t border-border space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Nhập câu trả lời của bạn..."
                      className="w-full bg-input border border-border rounded-xl py-4 pl-4 pr-12 focus:outline-none focus:ring-1 focus:ring-accent transition-all text-sm text-foreground"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input || loading}
                      className="absolute right-2 top-2 p-2.5 premium-gradient rounded-lg shadow-lg hover-glow transition-all disabled:opacity-50 disabled:grayscale"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  <button
                    onClick={handleGetHint}
                    disabled={loading || hintLoading || messages.length === 0}
                    title="Nhận gợi ý trả lời"
                    className="p-4 bg-muted/50 border border-border rounded-xl hover:bg-muted transition-all text-yellow-500 disabled:opacity-50"
                  >
                    {hintLoading ? <RefreshCw size={20} className="animate-spin" /> : <Lightbulb size={20} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-muted/20 border-t border-border text-center text-muted-foreground text-sm italic">
                Đây là nội dung lưu trữ từ buổi phỏng vấn trước.
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Left: JD Input */}
            <div className="glass p-8 flex flex-col space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold">Mô tả công việc (JD)</h3>
                  <p className="text-xs text-muted-foreground">Tùy chọn: Giúp AI đặt câu hỏi sát thực tế hơn.</p>
                </div>
              </div>
              <textarea 
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Dán JD hoặc yêu cầu công việc tại đây..."
                className="flex-1 bg-input border border-border rounded-xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-all resize-none text-foreground"
              />
            </div>

            {/* Right: Language Selection */}
            <div className="glass p-8 flex flex-col items-center justify-center space-y-8 text-center">
              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                <Zap size={40} fill="currentColor" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Bắt đầu phỏng vấn</h3>
                <p className="text-sm text-zinc-400">Chọn ngôn ngữ để bắt đầu buổi tập luyện.</p>
              </div>
              <div className="flex flex-col w-full gap-4">
                <button 
                  onClick={() => startInterview('vi')}
                  className="w-full py-4 bg-muted/50 border border-border rounded-xl font-bold hover:bg-muted transition-all flex items-center justify-center gap-3 group"
                >
                  <span className="text-2xl">🇻🇳</span>
                  Tiếng Việt
                  <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
                <button 
                  onClick={() => startInterview('en')}
                  className="w-full py-4 premium-gradient rounded-xl font-bold shadow-lg hover-glow transition-all flex items-center justify-center gap-3 group"
                >
                  <span className="text-2xl">🇺🇸</span>
                  English
                  <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      {/* Evaluation Modal */}
      <AnimatePresence>
        {showEvaluation && evaluation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-background border border-border w-full max-w-2xl max-h-[80vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-8 border-b border-white/5 premium-gradient">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Trophy className="text-white" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Đánh giá buổi phỏng vấn</h2>
                </div>
                <p className="text-white/70 text-sm">Phân tích chi tiết từ AI dựa trên các câu trả lời của bạn.</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar text-foreground prose dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap leading-relaxed">
                  {evaluation}
                </div>
              </div>

              <div className="p-6 bg-muted/50 flex gap-4">
                <button 
                  onClick={restartInterview}
                  className="flex-1 py-4 bg-muted hover:bg-muted/80 rounded-xl font-bold transition-all"
                >
                  Phỏng vấn mới
                </button>
                <button 
                  onClick={() => setShowEvaluation(false)}
                  className="flex-1 py-4 premium-gradient rounded-xl font-bold shadow-lg hover-glow transition-all"
                >
                  Tiếp tục xem lại chat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MockInterviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-t-accent border-white/10 rounded-full animate-spin" />
      </div>
    }>
      <MockInterviewContent />
    </Suspense>
  );
}
