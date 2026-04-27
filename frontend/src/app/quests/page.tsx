'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Calendar, 
  FileSearch, 
  Bot, 
  Target, 
  ShieldCheck, 
  CheckCircle2, 
  Gift, 
  Trophy, 
  Clock, 
  ArrowRight,
  RefreshCw,
  Zap,
  Lock,
  ExternalLink
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api';

interface Quest {
  id: number;
  title: string;
  description: string;
  points: number;
  quest_type: 'DAILY' | 'ONE_TIME' | 'ACHIEVEMENT';
  key: string;
  icon: string;
  is_completed: boolean;
  is_claimed: boolean;
}

const ICON_MAP: Record<string, any> = {
  Calendar: <Calendar size={24} />,
  FileSearch: <FileSearch size={24} />,
  Bot: <Bot size={24} />,
  Target: <Target size={24} />,
  ShieldCheck: <ShieldCheck size={24} />,
  Sparkles: <Sparkles size={24} />
};

const ROUTE_MAP: Record<string, string> = {
  'upload_cv': '/cv',
  'complete_interview': '/interview',
  'update_profile': '/profile',
  'ats_master': '/cv',
  'daily_login': '/'
};

function QuestsContent() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchQuests();
  }, []);

  const fetchQuests = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/quests/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQuests(data);
      }
    } catch (error) {
      console.error("Lỗi tải nhiệm vụ:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (questId: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setClaimingId(questId);
    try {
      const res = await fetch(`${API_BASE_URL}/quests/${questId}/claim/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message, type: 'success' });
        fetchQuests(); // Reload quests
      } else {
        setMessage({ text: data.error || "Không thể nhận thưởng.", type: 'error' });
      }
    } catch (error) {
      setMessage({ text: "Lỗi kết nối máy chủ.", type: 'error' });
    } finally {
      setClaimingId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const dailyQuests = quests.filter(q => q.quest_type === 'DAILY');
  const mainQuests = quests.filter(q => q.quest_type === 'ONE_TIME');
  const achievements = quests.filter(q => q.quest_type === 'ACHIEVEMENT');

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <RefreshCw className="animate-spin text-accent" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <Navbar />
      
      <main className="max-w-6xl mx-auto pt-32 px-6 space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent uppercase tracking-widest"
            >
              <Trophy size={12} /> Hệ thống phần thưởng
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gradient">Trung tâm Nhiệm vụ</h1>
            <p className="text-muted-foreground font-medium max-w-xl">
              Hoàn thành các thử thách để nhận XP, thăng cấp và mở khóa các tính năng AI cao cấp hơn.
            </p>
          </div>
          
          <div className="glass p-4 rounded-2xl border-l-4 border-l-accent flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <Zap size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tiến độ tuần</p>
              <p className="text-xl font-black">{quests.filter(q => q.is_completed).length}/{quests.length}</p>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-4 rounded-xl border flex items-center gap-3 font-bold text-sm ${
                message.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <Lock size={18} />}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* DAILY QUESTS */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-xl font-bold">
              <Clock className="text-accent" />
              <h2>Hàng ngày</h2>
            </div>
            <div className="space-y-4">
              {dailyQuests.map((quest) => (
                <QuestCard key={quest.id} quest={quest} onClaim={handleClaim} claimingId={claimingId} />
              ))}
            </div>
          </section>

          {/* MAIN QUESTS */}
          <section className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2 text-xl font-bold">
              <Gift className="text-accent" />
              <h2>Nhiệm vụ chính</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mainQuests.map((quest) => (
                <QuestCard key={quest.id} quest={quest} onClaim={handleClaim} claimingId={claimingId} />
              ))}
            </div>

            <div className="pt-8 flex items-center gap-2 text-xl font-bold">
              <Trophy className="text-yellow-500" />
              <h2>Thành tựu</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((quest) => (
                <QuestCard key={quest.id} quest={quest} onClaim={handleClaim} claimingId={claimingId} />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default function QuestsPage() {
  const [userKey, setUserKey] = useState<string | null>(null);

  useEffect(() => {
    setUserKey(localStorage.getItem('username') || 'guest');
  }, []);

  if (userKey === null) return null;

  return (
    <QuestsContent key={userKey} />
  );
}


function QuestCard({ quest, onClaim, claimingId }: { quest: Quest, onClaim: (id: number) => void, claimingId: number | null }) {
  const isClaiming = claimingId === quest.id;
  const targetRoute = ROUTE_MAP[quest.key];

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={`glass p-6 border transition-all relative overflow-hidden group ${
        quest.is_claimed 
        ? 'border-white/5 opacity-60' 
        : quest.is_completed 
          ? 'border-accent/40 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
          : 'border-white/10'
      }`}
    >
      {quest.is_claimed && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="text-green-500" size={16} />
        </div>
      )}
      
      <div className="flex gap-4 items-start">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-500 ${
          quest.is_completed ? 'bg-accent/20 text-accent' : 'bg-white/5 text-muted-foreground'
        }`}>
          {ICON_MAP[quest.icon] || <Sparkles size={24} />}
        </div>
        <div className="space-y-1 pr-4 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm leading-tight">{quest.title}</h3>
            {!quest.is_completed && targetRoute && (
              <Link href={targetRoute} className="text-accent hover:text-accent/80 transition-colors">
                <ExternalLink size={14} />
              </Link>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{quest.description}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-[10px] font-black text-accent">
            +{quest.points} XP
          </div>
          {quest.quest_type === 'DAILY' && (
            <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
              <Clock size={10} /> Mỗi 24h
            </span>
          )}
        </div>

        {quest.is_claimed ? (
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Đã nhận</span>
        ) : quest.is_completed ? (
          <button 
            onClick={() => onClaim(quest.id)}
            disabled={isClaiming}
            className="px-4 py-1.5 premium-gradient rounded-lg text-[10px] font-bold hover-glow transition-all flex items-center gap-2"
          >
            {isClaiming ? <RefreshCw size={12} className="animate-spin" /> : <Gift size={12} />}
            Nhận thưởng
          </button>
        ) : (
          <Link 
            href={targetRoute || '#'}
            className="px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2"
          >
            Thực hiện
            <ArrowRight size={12} />
          </Link>
        )}
      </div>
    </motion.div>
  );
}
