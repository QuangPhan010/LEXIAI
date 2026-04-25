'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Search, Filter, MapPin, Building2, Zap, CheckCircle2, ChevronRight, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { resolveGeminiModel } from '@/lib/geminiModel';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  description: string;
}

const mockJobs: Job[] = [
  {
    id: '1',
    title: 'Senior Frontend Developer (React)',
    company: 'TechVision Global',
    location: 'Hà Nội / Remote',
    salary: '2500$ - 3500$',
    type: 'Full-time',
    description: 'Chúng tôi tìm kiếm ứng viên có 5+ năm kinh nghiệm với React, Next.js và có tư duy thiết kế tốt.'
  },
  {
    id: '2',
    title: 'Fullstack Engineer (Django & React)',
    company: 'Nexus AI Solutions',
    location: 'TP. Hồ Chí Minh',
    salary: 'Thỏa thuận',
    type: 'Full-time',
    description: 'Xây dựng các hệ thống AI tiên tiến sử dụng Python/Django và React. Yêu cầu kiến thức về REST API.'
  },
  {
    id: '3',
    title: 'Product Designer (UI/UX)',
    company: 'Creative Studio',
    location: 'Đà Nẵng / Remote',
    salary: '1500$ - 2500$',
    type: 'Contract',
    description: 'Thiết kế giao diện người dùng cho các ứng dụng Web và Mobile. Ưu tiên ứng viên biết dùng Figma.'
  }
];

export default function JobMatcherPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<{ score: number; feedback: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const checkMatch = async (job: Job) => {
    const username = localStorage.getItem('username') || 'guest';
    const cvText = localStorage.getItem(`last_cv_text_${username}`);
    const apiKey = localStorage.getItem('gemini_api_key');

    if (!cvText || !apiKey) {
      alert("Vui lòng tải lên CV và cấu hình API Key trước.");
      return;
    }

    setMatchingId(job.id);
    setLoading(true);
    setMatchResult(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = await resolveGeminiModel(apiKey, 'flash');
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { 
          responseMimeType: 'application/json' 
        }
      });

      const prompt = `
        Bạn là một hệ thống tuyển dụng thông minh. Hãy so khớp CV của ứng viên với Mô tả công việc (JD) sau đây.
        
        NỘI DUNG CV: ${cvText}
        JD CÔNG VIỆC: ${job.title} tại ${job.company}. Mô tả: ${job.description}

        Hãy trả về kết quả dưới dạng JSON:
        {
          "score": number (0-100),
          "feedback": "Nhận xét ngắn gọn khoảng 2 câu về mức độ phù hợp và điểm cần cải thiện để ứng tuyển vị trí này."
        }
        
        Trả về kết quả bằng tiếng Việt.
      `;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });
      
      const data = JSON.parse(result.response.text());
      setMatchResult(data);
    } catch (error) {
      console.error(error);
      alert("Lỗi khi so khớp việc làm.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-32 pb-32 px-8">
      <Navbar />
      <main className="max-w-6xl mx-auto space-y-12">
        <header className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-gradient">Gợi ý việc làm phù hợp</h1>
          <p className="text-muted-foreground text-lg">AI tự động so khớp CV của bạn với các cơ hội nghề nghiệp mới nhất.</p>
        </header>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input 
              type="text" 
              placeholder="Tìm kiếm vị trí, công ty..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
            />
          </div>
          <button className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl font-bold flex items-center gap-2 hover:bg-white/10 transition-all">
            <Filter size={20} /> Lọc
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Job List */}
          <div className="lg:col-span-7 space-y-4">
            {mockJobs.map((job) => (
              <motion.div 
                key={job.id}
                layoutId={job.id}
                className={`glass p-6 border-l-4 transition-all cursor-pointer ${matchingId === job.id ? 'border-l-accent bg-accent/5' : 'border-l-transparent hover:border-l-white/20'}`}
                onClick={() => checkMatch(job)}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold">{job.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Building2 size={14} /> {job.company}</span>
                      <span className="flex items-center gap-1"><MapPin size={14} /> {job.location}</span>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-[10px] font-bold text-accent uppercase">
                    {job.type}
                  </div>
                </div>
                <p className="mt-4 text-sm text-zinc-400 line-clamp-2">{job.description}</p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{job.salary}</span>
                  <button className="flex items-center gap-2 text-xs font-bold text-accent hover:underline">
                    Chi tiết <ChevronRight size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Match Analysis */}
          <div className="lg:col-span-5">
            <div className="sticky top-40 glass p-8 space-y-8 border-accent/20">
              {!matchingId ? (
                <div className="text-center py-20 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-muted-foreground opacity-20">
                    <Briefcase size={32} />
                  </div>
                  <p className="text-sm text-muted-foreground italic">Chọn một công việc để AI phân tích độ phù hợp với CV của bạn.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                      <Sparkles size={20} />
                    </div>
                    <h3 className="font-bold text-lg">Phân tích độ phù hợp</h3>
                  </div>

                  {loading ? (
                    <div className="py-12 flex flex-col items-center gap-4">
                      <RefreshCw className="animate-spin text-accent" size={32} />
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Gemini đang so khớp...</p>
                    </div>
                  ) : matchResult ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                      <div className="flex flex-col items-center text-center space-y-2">
                        <div className="text-6xl font-black text-gradient">{matchResult.score}%</div>
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tương thích với JD</div>
                      </div>
                      
                      <div className="bg-accent/5 border border-accent/10 p-4 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-accent">
                          <CheckCircle2 size={16} />
                          <span className="text-xs font-bold uppercase">Nhận xét từ AI</span>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed italic">"{matchResult.feedback}"</p>
                      </div>

                      <button className="w-full py-4 premium-gradient rounded-xl font-bold shadow-lg hover-glow transition-all flex items-center justify-center gap-2">
                        <Zap size={18} /> Ứng tuyển ngay với LexiAI
                      </button>
                    </motion.div>
                  ) : (
                    <div className="py-12 flex flex-col items-center gap-2 text-red-400">
                      <AlertCircle size={32} />
                      <p className="text-sm font-bold">Không thể tải dữ liệu.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
