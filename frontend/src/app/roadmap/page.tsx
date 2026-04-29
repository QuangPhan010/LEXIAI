'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Sparkles, Target, BookOpen, GraduationCap, ArrowRight, RefreshCw, Map, ChevronRight, Globe, ExternalLink, CheckCircle2 } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { resolveGeminiModel } from '@/lib/geminiModel';

function CareerRoadmapContent() {
  const [loading, setLoading] = useState(false);
  const [roadmapText, setRoadmapText] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [mounted, setMounted] = useState(false);
  const [quests, setQuests] = useState<any[]>([]);
  const [completingId, setCompletingId] = useState<string | null>(null);
  
  useEffect(() => {
    setMounted(true);
    const username = localStorage.getItem('username') || 'guest';
    const savedRoadmap = localStorage.getItem(`last_roadmap_${username}`);
    const savedRole = localStorage.getItem(`last_roadmap_role_${username}`);
    const savedCvSig = localStorage.getItem(`last_roadmap_cv_sig_${username}`);
    
    // Kiểm tra xem Roadmap có khớp với CV hiện tại không
    const currentCvText = localStorage.getItem(`last_cv_text_${username}`) || '';
    const currentCvSig = currentCvText.substring(0, 100);

    if (savedRole) setTargetRole(savedRole);
    
    if (savedRoadmap && savedCvSig === currentCvSig) {
      setRoadmapText(savedRoadmap);
      parseQuests(savedRoadmap);
    } else if (savedRoadmap) {
      // Nếu CV đã đổi, xóa roadmap cũ để tránh nhầm lẫn
      localStorage.removeItem(`last_roadmap_${username}`);
      localStorage.removeItem(`last_roadmap_role_${username}`);
      localStorage.removeItem(`last_roadmap_cv_sig_${username}`);
    }
  }, []);

  const generateRoadmap = async () => {
    const username = localStorage.getItem('username') || 'guest';
    const cvText = localStorage.getItem(`last_cv_text_${username}`);
    const apiKey = localStorage.getItem('gemini_api_key');
    
    if (!cvText || !apiKey) {
      alert("Vui lòng tải lên CV và cấu hình API Key trước.");
      return;
    }

    setLoading(true);
    try {
      const modelType = localStorage.getItem('lexiai_model') || 'flash';
      const accessToken = localStorage.getItem('access_token');
      const modelName = modelType === 'pro' ? 'gemini-1.5-pro' : 'gemini-1.5-flash';

      const prompt = `
        Dựa trên nội dung CV sau đây và vị trí mục tiêu là "${targetRole || 'phát triển sự nghiệp tối ưu'}", hãy xây dựng một lộ trình phát triển sự nghiệp (Career Roadmap) chi tiết trong 2 năm tới.
        
        Yêu cầu kết quả trả về bằng định dạng Markdown với các phần sau:
        1. **Mục tiêu chiến lược**: Vị trí mong muốn và lý do dựa trên thế mạnh CV.
        2. **Lộ trình theo giai đoạn (6 tháng/lần)**: Các kỹ năng cụ thể cần đạt được.
        3. **Tài nguyên học tập ĐỀ XUẤT**: Liệt kê ít nhất 3 khóa học hoặc tài liệu thực tế (kèm link giả định từ Coursera, Udemy, hoặc LinkedIn Learning).
        5. **Career Quests (Nhiệm vụ sự nghiệp)**: Cuối cùng, hãy liệt kê đúng 3 nhiệm vụ ngắn hạn người dùng có thể thực hiện NGAY để tiến gần hơn tới mục tiêu. Mỗi nhiệm vụ phải bắt đầu bằng dòng "[QUEST] Tên nhiệm vụ | Mô tả ngắn | XP" (với XP là số điểm từ 20-50 tùy độ khó).
        
        Văn phong chuyên nghiệp, truyền cảm hứng. Chỉ trả về Markdown bằng tiếng Việt.
 
        NỘI DUNG CV: ${cvText}
      `;

      const proxyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/ai/proxy/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          prompt: prompt,
          input_text: cvText,
          model: modelName,
          api_key: apiKey
        })
      });

      if (!proxyResponse.ok) {
        const errorData = await proxyResponse.json();
        throw new Error(errorData.error || "Lỗi khi gọi AI Proxy.");
      }

      const { result: text } = await proxyResponse.json();
      setRoadmapText(text);
      parseQuests(text);
      
      // Lưu kết quả kèm theo metadata để kiểm tra tính hợp lệ sau này
      localStorage.setItem(`last_roadmap_${username}`, text);
      localStorage.setItem(`last_roadmap_role_${username}`, targetRole);
      localStorage.setItem(`last_roadmap_cv_sig_${username}`, cvText.substring(0, 100));
    } catch (error: any) {
      console.error(error);
      alert(`Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const parseQuests = (text: string) => {
    const lines = text.split('\n');
    const extractedQuests = lines
      .filter(line => line.includes('[QUEST]'))
      .map((line, index) => {
        const content = line.replace('[QUEST]', '').trim();
        const [title, desc, xpStr] = content.split('|').map(s => s.trim());
        const xp = parseInt(xpStr) || 20;
        return { id: `q-${index}`, title, desc, xp, completed: false };
      });
    setQuests(extractedQuests);
  };

  const handleCompleteQuest = async (quest: any) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert("Vui lòng đăng nhập để nhận thưởng XP!");
      return;
    }

    setCompletingId(quest.id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/profile/add-points/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          points: quest.xp,
          reason: `Hoàn thành nhiệm vụ: ${quest.title}`
        })
      });

      if (res.ok) {
        setQuests(prev => prev.map(q => q.id === quest.id ? { ...q, completed: true } : q));
        // Update local profile points if needed or just let dashboard refresh
      } else {
        alert("Có lỗi khi nhận thưởng. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCompletingId(null);
    }
  };

  if (!mounted) return null;

  return (
    <div className="bg-background text-foreground pt-32 pb-32 px-8">
      <Navbar />
      <main className="max-w-5xl mx-auto space-y-12">
        <header className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-2">
            <Map size={32} />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-gradient">Lộ trình Sự nghiệp AI</h1>
          <p className="text-muted-foreground max-w-2xl text-lg">Xây dựng kế hoạch phát triển bản thân dựa trên phân tích sâu từ Gemini.</p>
        </header>

        {!roadmapText && !loading ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto glass p-10 space-y-8"
          >
            <div className="space-y-4">
              <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Vị trí mục tiêu của bạn</label>
              <input 
                type="text" 
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                suppressHydrationWarning
                placeholder="VD: Kế toán trưởng, Quản trị kinh doanh, Marketing Manager..."
                className="w-full bg-input border border-zinc-300 dark:border-white/10 rounded-xl px-6 py-4 text-lg focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
            <button 
              onClick={generateRoadmap}
              suppressHydrationWarning
              className="w-full py-5 premium-gradient rounded-2xl font-bold text-xl shadow-xl hover-glow transition-all flex items-center justify-center gap-3"
            >
              <Sparkles size={24} /> Bắt đầu xây dựng lộ trình
            </button>
            <p className="text-xs text-center text-muted-foreground italic">AI sẽ phân tích CV mới nhất bạn đã tải lên để cá nhân hóa lộ trình.</p>
          </motion.div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-8">
            <div className="relative w-24 h-24">
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-4 border-t-accent border-r-transparent border-b-white/10 border-l-transparent"
              />
              <div className="absolute inset-4 rounded-full bg-accent/20 flex items-center justify-center">
                <Rocket size={24} className="text-accent animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Đang vẽ bản đồ sự nghiệp...</h2>
              <p className="text-muted-foreground animate-pulse">Gemini đang tính toán các bước đi tối ưu cho bạn.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Sidebar Controls */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass p-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="font-bold text-lg">Tùy chỉnh mục tiêu</h3>
                  <p className="text-xs text-muted-foreground">Thay đổi vị trí để AI cập nhật lại lộ trình.</p>
                </div>
                <input 
                  type="text" 
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  suppressHydrationWarning
                  placeholder="Mục tiêu mới..."
                  className="w-full bg-input border border-zinc-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
                />
                <button 
                  onClick={generateRoadmap}
                  suppressHydrationWarning
                  className="w-full py-3 bg-input border border-zinc-300 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} /> Cập nhật lộ trình
                </button>
              </div>

              <div className="glass p-6 space-y-4">
                <h3 className="font-bold flex items-center gap-2"><Target size={18} className="text-accent" /> Nhiệm vụ (Career Quests)</h3>
                <div className="space-y-3">
                  {quests.length > 0 ? quests.map((q) => (
                    <motion.div 
                      key={q.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 rounded-xl border transition-all ${
                        q.completed 
                        ? 'bg-green-500/10 border-green-500/30' 
                        : 'bg-white/50 dark:bg-white/5 border-zinc-300 dark:border-white/10 hover:border-accent/30 shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-xs font-bold ${q.completed ? 'text-green-400 line-through' : 'text-foreground'}`}>{q.title}</h4>
                        <span className="text-[10px] font-black text-accent">+{q.xp} XP</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-3">{q.desc}</p>
                      {!q.completed && (
                        <button 
                          onClick={() => handleCompleteQuest(q)}
                          disabled={completingId !== null}
                          className="w-full py-2 bg-accent/20 hover:bg-accent text-accent hover:text-white rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                        >
                          {completingId === q.id ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                          Đánh dấu hoàn thành
                        </button>
                      )}
                      {q.completed && (
                        <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-green-500">
                          <CheckCircle2 size={12} /> Đã nhận thưởng
                        </div>
                      ) }
                    </motion.div>
                  )) : (
                    <p className="text-xs text-muted-foreground italic">Tạo lộ trình để nhận nhiệm vụ thăng cấp.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Roadmap Content */}
            <div className="lg:col-span-8">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass p-10 border-accent/20 relative"
              >
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <BookOpen size={80} />
                </div>
                <div className="prose prose-invert max-w-none prose-headings:text-gradient prose-a:text-accent prose-strong:text-white prose-zinc leading-relaxed whitespace-pre-wrap">
                  {roadmapText}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CareerRoadmapPage() {
  const [userKey, setUserKey] = useState<string | null>(null);

  useEffect(() => {
    setUserKey(localStorage.getItem('username') || 'guest');
  }, []);

  if (userKey === null) return null;

  return (
    <CareerRoadmapContent key={userKey} />
  );
}

