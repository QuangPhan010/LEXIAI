'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, Trophy, Plus, LogOut, Check, ChevronRight, Search, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

export default function GuildsPage() {
  const [guilds, setGuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildDesc, setNewGuildDesc] = useState('');

  const fetchGuilds = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`${API_BASE_URL}/guilds/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGuilds(data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchGuilds();
  }, []);

  const handleJoin = async (id: number) => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`${API_BASE_URL}/guilds/${id}/join/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchGuilds();
    } catch (e) { console.error(e); }
  };

  const handleCreate = async () => {
    if (!newGuildName) return;
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`${API_BASE_URL}/guilds/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ name: newGuildName, description: newGuildDesc })
      });
      if (res.ok) {
        setIsCreating(false);
        setNewGuildName('');
        setNewGuildDesc('');
        fetchGuilds();
      }
    } catch (e) { console.error(e); }
  };

  const filteredGuilds = guilds.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) || 
    g.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-background text-foreground min-h-screen pt-32 pb-32 px-8">
      <Navbar />
      <main className="max-w-6xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-accent font-bold uppercase tracking-widest text-xs">
              <Shield size={14} /> Hệ thống Bang hội
            </motion.div>
            <h1 className="text-5xl font-black tracking-tight text-gradient">Cộng đồng LexiAI</h1>
            <p className="text-muted-foreground text-lg">Tham gia các Guild để cùng nhau leo hạng và chia sẻ kinh nghiệm sự nghiệp.</p>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="px-8 py-4 premium-gradient rounded-2xl font-bold flex items-center gap-2 shadow-lg hover-glow transition-all"
          >
            <Plus size={20} /> Tạo Guild mới
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar / Leaderboard */}
          <div className="lg:col-span-4 space-y-8">
            <div className="glass p-8 space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="text-yellow-500" /> Bảng xếp hạng Guild
              </h3>
              <div className="space-y-4">
                {guilds.slice(0, 5).map((g, i) => (
                  <div key={g.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-black w-6 ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-zinc-400' : i === 2 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                        {i + 1}
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-bold">
                        {g.name[0]}
                      </div>
                      <span className="font-bold text-sm group-hover:text-accent transition-all">{g.name}</span>
                    </div>
                    <span className="text-xs font-black text-muted-foreground">{g.points} XP</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass p-8 space-y-4 bg-accent/5 border-accent/20">
              <h3 className="font-bold">Lợi ích khi tham gia Guild</h3>
              <ul className="space-y-3">
                {[
                  "Nhận thêm XP khi hoàn thành nhiệm vụ nhóm",
                  "Mở khóa các biểu tượng độc quyền",
                  "Tham gia thảo luận chuyên sâu theo ngành",
                  "Đua top bảng xếp hạng tuần"
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check size={14} className="text-accent mt-0.5" /> {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Main List */}
          <div className="lg:col-span-8 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input 
                type="text" 
                placeholder="Tìm kiếm Guild theo tên hoặc lĩnh vực..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-glass border border-glass-border rounded-2xl py-5 pl-12 pr-6 text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-20"><Users className="animate-pulse text-accent" size={40} /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredGuilds.map((g) => (
                  <motion.div 
                    layoutId={g.id.toString()}
                    key={g.id}
                    className="glass p-8 space-y-6 hover:border-accent/30 transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                        <Users size={28} />
                      </div>
                      {g.is_joined ? (
                        <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold rounded-full border border-green-500/20">ĐÃ THAM GIA</span>
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{g.member_count} Thành viên</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold group-hover:text-accent transition-all">{g.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{g.description || 'Chưa có mô tả cho Guild này.'}</p>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <span className="text-sm font-black">{g.points} XP</span>
                      {!g.is_joined && (
                        <button 
                          onClick={() => handleJoin(g.id)}
                          className="flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                        >
                          Tham gia ngay <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Guild Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-background border border-glass-border w-full max-w-lg rounded-3xl p-10 space-y-8 shadow-2xl"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold flex items-center gap-2"><Sparkles className="text-accent" /> Tạo Guild của bạn</h2>
                <p className="text-muted-foreground text-sm">Xây dựng cộng đồng cho riêng mình.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tên Guild</label>
                  <input 
                    type="text" 
                    value={newGuildName}
                    onChange={(e) => setNewGuildName(e.target.value)}
                    placeholder="VD: Java Masters, Marketing Pro..."
                    className="w-full bg-input border border-glass-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mô tả</label>
                  <textarea 
                    value={newGuildDesc}
                    onChange={(e) => setNewGuildDesc(e.target.value)}
                    placeholder="Giới thiệu ngắn gọn về Guild..."
                    className="w-full h-32 bg-input border border-glass-border rounded-xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-4 bg-muted hover:bg-muted/80 rounded-xl font-bold transition-all"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleCreate}
                  className="flex-1 py-4 premium-gradient rounded-xl font-bold shadow-lg hover-glow transition-all"
                >
                  Tạo ngay
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
