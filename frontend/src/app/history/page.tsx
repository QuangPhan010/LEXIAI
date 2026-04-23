'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Calendar, ChevronRight, Trash2, Zap, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface HistoryItem {
  id: number;
  file_name?: string;
  score?: number;
  created_at: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'cv' | 'interview'>('cv');

  useEffect(() => {
    fetchHistory();
  }, [type]);

  const fetchHistory = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const endpoint = type === 'cv' ? 'history/' : 'interviews/';
      const res = await fetch(`http://localhost:8000/api/${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteHistory = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa bản ghi này?')) return;
    const token = localStorage.getItem('access_token');
    const endpoint = type === 'cv' ? 'history/' : 'interviews/';
    try {
      await fetch(`http://localhost:8000/api/${endpoint}${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setHistory(history.filter(item => item.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-32 pb-24 px-8">
      <Navbar />
      <main className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-gradient">Lịch sử hoạt động</h1>
            <p className="text-muted-foreground">Xem lại các bản phân tích CV và phỏng vấn trước đây.</p>
          </div>
          
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <button 
              onClick={() => setType('cv')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${type === 'cv' ? 'premium-gradient text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
            >
              CV Analysis
            </button>
            <button 
              onClick={() => setType('interview')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${type === 'interview' ? 'premium-gradient text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
            >
              Mock Interview
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Zap className="animate-spin text-accent" size={40} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div 
              key={type}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-4"
            >
              {history.length > 0 ? (
                history.map((item) => (
                  <motion.div 
                    key={item.id}
                    className="glass p-6 flex items-center justify-between hover:bg-white/[0.05] transition-all group"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                        {type === 'cv' ? <FileText size={24} /> : <MessageSquare size={24} />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">
                          {type === 'cv' ? item.file_name : `Phỏng vấn thử #${item.id}`}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} /> 
                            {new Date(item.created_at).toLocaleDateString('vi-VN')}
                          </span>
                          {type === 'cv' && (
                            <span className="font-bold text-accent">Điểm: {item.score}/100</span>
                          )}
                          {type === 'interview' && (
                            <span className="text-green-400 font-medium">Đã có nhận xét</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => deleteHistory(item.id)}
                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                      <Link 
                        href={type === 'cv' ? `/cv?historyId=${item.id}` : `/interview?historyId=${item.id}`} 
                        className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-all"
                      >
                        <ChevronRight size={24} />
                      </Link>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-20 glass border-dashed">
                  <p className="text-muted-foreground">Bạn chưa có lịch sử {type === 'cv' ? 'phân tích' : 'phỏng vấn'} nào.</p>
                  <Link href={type === 'cv' ? "/cv" : "/interview"} className="text-accent hover:underline mt-2 inline-block">
                    Bắt đầu ngay
                  </Link>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
