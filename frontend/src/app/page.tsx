'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, FileSearch, ArrowRight, GitFork, Globe, BrainCircuit, Rocket, ShieldCheck, TrendingUp, Calendar, Map, CheckCircle2, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { resolveGeminiModel } from '@/lib/geminiModel';
import { API_BASE_URL } from '@/lib/api';
import { Briefcase } from 'lucide-react';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roadmap, setRoadmap] = useState<string | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsLoggedIn(true);
      fetchHistory(token);
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchHistory = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/history/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.reverse()); // Chronological order for chart
      }
    } catch (error) {
      console.error("Lỗi tải lịch sử:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/profile/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (error) {
      console.error("Lỗi tải profile:", error);
    }
  };

  const generateRoadmap = async () => {
    const username = localStorage.getItem('username') || 'guest';
    const cvText = localStorage.getItem(`last_cv_text_${username}`);
    const apiKey = localStorage.getItem('gemini_api_key');
    
    if (!cvText || !apiKey) {
      alert("Vui lòng tải lên CV và cấu hình API Key trước.");
      return;
    }

    setRoadmapLoading(true);
    try {
      const modelType = localStorage.getItem('lexiai_model') || 'flash';
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = await resolveGeminiModel(apiKey, modelType === 'pro' ? 'pro' : 'flash');
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = `
        Dựa trên nội dung CV sau đây, hãy xây dựng một lộ trình phát triển sự nghiệp (Career Roadmap) chi tiết trong 2 năm tới.
        Lộ trình nên bao gồm:
        1. Mục tiêu vị trí công việc tiếp theo.
        2. Các kỹ năng quan trọng cần bổ sung (từ khóa cụ thể).
        3. Các cột mốc quan trọng theo từng quý.
        4. Lời khuyên tối ưu hóa thương hiệu cá nhân.
        Văn phong chuyên nghiệp, truyền cảm hứng. Trả về kết quả bằng tiếng Việt, định dạng Markdown ngắn gọn.

        NỘI DUNG CV: ${cvText}
      `;

      const result = await model.generateContent(prompt);
      setRoadmap(result.response.text());
    } catch (error) {
      console.error("Lỗi tạo lộ trình:", error);
    } finally {
      setRoadmapLoading(false);
    }
  };

  const chartData = history.map(item => ({
    name: new Date(item.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    score: item.score
  }));

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <RefreshCw className="animate-spin text-accent" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30">
      <Navbar />
      
      {isLoggedIn ? (
        /* DASHBOARD VIEW */
        <main className="max-w-7xl mx-auto pt-32 pb-32 px-6 space-y-10">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tight text-gradient">Chào mừng trở lại! 👋</h1>
              <p className="text-muted-foreground font-medium">Đây là bảng tổng quan tiến độ sự nghiệp của bạn.</p>
            </div>
            <div className="flex gap-4">
              <Link href="/cv" className="px-6 py-3 premium-gradient rounded-xl font-bold shadow-lg hover-glow transition-all flex items-center gap-2">
                <Sparkles size={18} /> Phân tích CV mới
              </Link>
            </div>
          </header>

          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass p-6 space-y-4 border-l-4 border-l-accent">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Cấp độ người dùng</p>
                  <span className="px-2 py-1 bg-accent/20 rounded text-[10px] font-bold text-accent">LEVEL {profile?.level || 1}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{profile?.points || 0} XP</span>
                    <span className="opacity-40">{(profile?.level || 1) * 100} XP</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(profile?.points % 100) || 0}%` }}
                      className="h-full premium-gradient"
                    />
                  </div>
                </div>
              </div>
              <div className="glass p-6 space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Điểm CV cao nhất</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black">{history.length > 0 ? Math.max(...history.map(h => h.score)) : 0}</span>
                  <TrendingUp className="text-green-500 mb-1" size={20} />
                </div>
              </div>
              <div className="glass p-6 space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tổng lượt phân tích</p>
                <span className="text-4xl font-black">{history.length}</span>
              </div>
            </div>

            {/* Chart Area */}
            <div className="glass p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="text-accent" /> Xu hướng tối ưu hóa</h3>
                <span className="text-xs font-medium text-muted-foreground">Dựa trên các lần phân tích gần nhất</span>
              </div>
              <div className="h-[350px] w-full" style={{ minWidth: 0 }}>
                <ResponsiveContainer width="99%" height={350}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#6366f1', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Career Roadmap - Now Below */}
            <div className="glass p-8 space-y-6 border-accent/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <Map size={120} />
              </div>
              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <Rocket size={24} />
                  </div>
                  <h3 className="font-bold text-2xl">Lộ trình sự nghiệp AI</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed max-w-2xl">
                  Dựa trên lịch sử và hồ sơ của bạn, Gemini đã phân tích và xây dựng một kế hoạch phát triển chiến lược để giúp bạn đạt tới những cột mốc quan trọng trong sự nghiệp.
                </p>
                
                <div className="flex items-center gap-4">
                  <Link 
                    href="/roadmap"
                    className="px-8 py-4 premium-gradient rounded-xl font-bold flex items-center justify-center gap-2 hover-glow transition-all"
                  >
                    <Map size={18} />
                    Xem lộ trình chi tiết
                  </Link>
                  <Link 
                    href="/jobs"
                    className="px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <Briefcase size={18} />
                    Tìm việc phù hợp
                  </Link>
                </div>
              </div>

              {roadmap && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 p-6 bg-black/30 rounded-2xl border border-white/5 flex-1 relative"
                >
                  <div className="prose prose-invert max-w-none text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {roadmap}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </main>
      ) : (
        /* HERO VIEW (FOR NON-LOGGED IN) */
        <>
          <section className="relative pt-40 md:pt-52 pb-20 md:pb-32 px-6 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl -z-10 opacity-40">
              <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity }} className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full bg-indigo-600/20 blur-[140px]" />
              <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 10, repeat: Infinity, delay: 1 }} className="absolute bottom-[10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-700/20 blur-[140px]" />
            </div>

            <div className="max-w-6xl mx-auto flex flex-col items-center text-center space-y-8 md:space-y-12">
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-accent">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
                Nền tảng trí tuệ nghề nghiệp thế hệ mới
              </motion.div>

              <div className="space-y-6">
                <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-[0.95] text-gradient">
                  Nâng tầm <br className="hidden md:block" /> bản sắc nghề nghiệp.
                </motion.h1>
                <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg md:text-2xl text-zinc-400 max-w-3xl mx-auto font-medium leading-relaxed">
                  LexiAI kết hợp chiến lược phát triển sự nghiệp cùng khả năng suy luận của Gemini để biến CV thành lợi thế cạnh tranh thực sự.
                </motion.p>
              </div>

              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row justify-center gap-5 w-full max-w-md">
                <Link href="/cv" className="group px-10 py-5 premium-gradient rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover-glow transition-all">
                  Bắt đầu ngay <ArrowRight size={22} className="group-hover:translate-x-1.5 transition-transform" />
                </Link>
                <Link href="/auth/login" className="px-10 py-5 glass rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-white/10 transition-all border border-white/10">
                  Đăng nhập <CheckCircle2 size={22} className="text-accent" />
                </Link>
              </motion.div>
            </div>
          </section>

          <section className="max-w-7xl mx-auto py-24 px-6 relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: <FileSearch size={32} />, title: "Phân tích sâu ngữ cảnh", desc: "Đánh giá toàn diện nội dung CV vượt xa đối sánh từ khóa thông thường.", color: "indigo" },
                { icon: <BrainCircuit size={32} />, title: "Động cơ viết lại bằng AI", desc: "Trích xuất thành tích và viết lại theo thời gian thực với Gemini.", color: "purple" },
                { icon: <ShieldCheck size={32} />, title: "Tương thích ATS", desc: "Đối chiếu CV với các tiêu chuẩn chấm điểm thực tế từ chuyên gia.", color: "blue" }
              ].map((feature, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass p-10 space-y-6 card-hover group">
                  <div className={`w-16 h-16 rounded-2xl bg-${feature.color}-500/10 flex items-center justify-center text-${feature.color}-400 group-hover:scale-110 transition-all duration-500`}>
                    {feature.icon}
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-black">{feature.title}</h3>
                    <p className="text-zinc-400 leading-relaxed font-medium">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
