'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, LogOut, Settings, User as UserIcon, Menu, X, ChevronDown, Sparkles, Briefcase, History, FileText, Bot, Map, Search, Video, Rocket } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import APIConfigModal from './APIConfigModal';

export default function Navbar() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [model, setModel] = useState<'flash' | 'pro'>('flash');
  const [showModal, setShowModal] = useState(false);
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedUsername = localStorage.getItem('username');
    const token = localStorage.getItem('access_token');
    if (savedUsername && token) {
      setUsername(savedUsername);
    } else {
      setUsername(null);
    }
    
    const savedKey = localStorage.getItem('gemini_api_key');
    const savedModel = localStorage.getItem('lexiai_model') as 'flash' | 'pro';
    setApiKey(savedKey);
    if (savedModel) setModel(savedModel);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
    setUsername(null);
    window.location.href = '/';
  };

  const toggleModel = () => {
    const newModel = model === 'flash' ? 'pro' : 'flash';
    setModel(newModel);
    localStorage.setItem('lexiai_model', newModel);
    window.dispatchEvent(new Event('storage'));
  };

  const handleSaveKey = (key: string) => {
    setApiKey(key);
    setShowModal(false);
  };

  if (!mounted) return null;

  return (
    <>
      <nav className="fixed top-4 left-1/2 z-50 w-[min(1200px,calc(100%-1.5rem))] -translate-x-1/2 glass border-white/10 dark:border-white/10 border-black/5 shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-6 md:py-3">
          <div className="flex items-center gap-4 md:gap-8">
            <Link href="/" className="shrink-0">
              <Image
                src="/lexi_logo.svg"
                alt="Logo LexiAI"
                width={500}
                height={74}
                priority
                className="h-12 md:h-16 w-auto dark:brightness-100 brightness-0 invert-0 dark:invert-0"
              />
            </Link>
            <div className="hidden lg:flex gap-6 text-sm font-bold uppercase tracking-wider">
              {/* AI Tools Dropdown */}
              <div className="relative group py-4">
                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all">
                  Công cụ AI <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
                </button>
                <div className="absolute top-full left-0 pt-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-50">
                  <div className="bg-background p-3 min-w-[220px] space-y-1 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-black/5 dark:border-white/10 rounded-2xl">
                    {[
                      { name: 'Viết lách', href: '/writing', icon: <FileText size={14} />, desc: 'Soạn thảo nội dung bằng AI' },
                      { name: 'AI Mentor', href: '/mentor', icon: <Bot size={14} />, desc: 'Tư vấn sự nghiệp 24/7' },
                      { name: 'Lộ trình học', href: '/roadmap', icon: <Map size={14} />, desc: 'Kế hoạch phát triển sự nghiệp' },
                      { name: 'Dự án thực tế', href: '/portfolio', icon: <Rocket size={14} />, desc: 'Xây dựng Portfolio thực chiến' },
                    ].map((item) => (
                      <Link 
                        key={item.href} 
                        href={item.href}
                        className={`flex items-start gap-3 p-2.5 rounded-xl transition-all hover:bg-accent/10 hover:text-accent group/item ${pathname === item.href ? 'bg-accent/10 text-accent' : 'text-foreground'}`}
                      >
                        <div className="mt-0.5 text-foreground">{item.icon}</div>
                        <div>
                          <div className="text-[11px] font-black text-foreground">{item.name}</div>
                          <div className="text-[9px] opacity-70 font-medium normal-case text-muted-foreground">{item.desc}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Career Dropdown */}
              <div className="relative group py-4">
                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all">
                  Sự nghiệp <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
                </button>
                <div className="absolute top-full left-0 pt-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-50">
                  <div className="bg-background p-3 min-w-[220px] space-y-1 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-black/5 dark:border-white/10 rounded-2xl">
                    {[
                      { name: 'Phân tích CV', href: '/cv', icon: <Search size={14} />, desc: 'Tối ưu chỉ số ATS' },
                      { name: 'Phỏng vấn AI', href: '/interview', icon: <Video size={14} />, desc: 'Mô phỏng phỏng vấn & Văn hóa công ty' },
                      { name: 'Việc làm', href: '/jobs', icon: <Briefcase size={14} />, desc: 'Tìm kiếm cơ hội phù hợp' },
                    ].map((item) => (
                      <Link 
                        key={item.href} 
                        href={item.href}
                        className={`flex items-start gap-3 p-2.5 rounded-xl transition-all hover:bg-accent/10 hover:text-accent group/item ${pathname === item.href ? 'bg-accent/10 text-accent' : 'text-foreground'}`}
                      >
                        <div className="mt-0.5 text-foreground">{item.icon}</div>
                        <div>
                          <div className="text-[11px] font-black text-foreground">{item.name}</div>
                          <div className="text-[9px] opacity-70 font-medium normal-case text-muted-foreground">{item.desc}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <Link 
                href="/history" 
                className={`flex items-center gap-1.5 py-4 transition-all hover:scale-105 ${pathname === '/history' ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Lịch sử
              </Link>
              <Link 
                href="/quests" 
                className={`flex items-center gap-1.5 py-4 transition-all hover:scale-105 ${pathname === '/quests' ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Nhiệm vụ
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full bg-muted border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:scale-110 transition-all"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Model Switcher */}
            <div className="hidden md:flex bg-zinc-100 dark:bg-white/5 rounded-full p-1 border border-zinc-200 dark:border-white/10">
              <button
                onClick={() => setModel('flash')}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${model === 'flash' ? 'premium-gradient text-white shadow-lg' : 'text-zinc-500 dark:text-zinc-400'}`}
              >
                ⚡ NHANH
              </button>
              <button
                onClick={() => setModel('pro')}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${model === 'pro' ? 'premium-gradient text-white shadow-lg' : 'text-zinc-500 dark:text-zinc-400'}`}
              >
                🎯 PRO
              </button>
            </div>

            {/* API Config */}
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:bg-muted transition-all"
            >
              <div className={`w-2 h-2 rounded-full ${apiKey ? 'bg-green-500 shadow-glow' : 'bg-red-500'}`} />
              <Settings size={16} className="text-zinc-600 dark:text-zinc-400" />
            </button>

            {/* User Profile */}
            {username ? (
              <div className="flex items-center gap-2 border-l border-zinc-200 dark:border-white/10 pl-4">
                <Link href="/profile" className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent hover:bg-accent/30 transition-all cursor-pointer">
                  <UserIcon size={16} />
                </Link>
                <button 
                  onClick={handleLogout}
                  className="p-2 rounded-full hover:bg-red-500/10 text-red-500 transition-all"
                  title="Đăng xuất"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <Link 
                href="/auth/login"
                className="text-xs font-bold px-5 py-2.5 rounded-full premium-gradient text-white shadow-lg hover-glow transition-all"
              >
                Bắt đầu
              </Link>
            )}
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-black/20 backdrop-blur-xl overflow-hidden rounded-b-2xl"
            >
              <div className="flex flex-col p-4 gap-4">
                <div className="space-y-6">
                  {/* AI Tools Section */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-4">Công cụ AI</p>
                    <div className="flex flex-col gap-1">
                      {[
                        { name: 'Viết lách', href: '/writing' },
                        { name: 'AI Mentor', href: '/mentor' },
                        { name: 'Lộ trình học', href: '/roadmap' },
                        { name: 'Dự án thực tế', href: '/portfolio' },
                      ].map((link) => (
                        <Link 
                          key={link.href}
                          href={link.href} 
                          onClick={() => setIsOpen(false)}
                          className={`text-sm font-bold uppercase tracking-widest py-3 px-4 rounded-xl transition-all ${
                            pathname === link.href ? 'bg-accent/10 text-accent border border-accent/20' : 'text-muted-foreground hover:bg-zinc-100 dark:hover:bg-white/5'
                          }`}
                        >
                          {link.name}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Career Section */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-4">Sự nghiệp</p>
                    <div className="flex flex-col gap-1">
                      {[
                        { name: 'Phân tích CV', href: '/cv' },
                        { name: 'Phỏng vấn AI', href: '/interview' },
                        { name: 'Việc làm', href: '/jobs' },
                      ].map((link) => (
                        <Link 
                          key={link.href}
                          href={link.href} 
                          onClick={() => setIsOpen(false)}
                          className={`text-sm font-bold uppercase tracking-widest py-3 px-4 rounded-xl transition-all ${
                            pathname === link.href ? 'bg-accent/10 text-accent border border-accent/20' : 'text-muted-foreground hover:bg-zinc-100 dark:hover:bg-white/5'
                          }`}
                        >
                          {link.name}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <Link 
                    href="/history" 
                    onClick={() => setIsOpen(false)}
                    className={`text-sm font-bold uppercase tracking-widest py-3 px-4 rounded-xl transition-all ${
                      pathname === '/history' ? 'bg-accent/10 text-accent border border-accent/20' : 'text-muted-foreground hover:bg-zinc-100 dark:hover:bg-white/5'
                    }`}
                  >
                    Lịch sử
                  </Link>
                  <Link 
                    href="/quests" 
                    onClick={() => setIsOpen(false)}
                    className={`text-sm font-bold uppercase tracking-widest py-3 px-4 rounded-xl transition-all ${
                      pathname === '/quests' ? 'bg-accent/10 text-accent border border-accent/20' : 'text-muted-foreground hover:bg-zinc-100 dark:hover:bg-white/5'
                    }`}
                  >
                    Nhiệm vụ
                  </Link>
                </div>
                
                {/* Mobile Model Switcher */}
                <div className="mt-4 p-4 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">
                    Mô hình AI
                  </p>
                  <div className="flex bg-white/50 dark:bg-black/20 rounded-full p-1 border border-zinc-200 dark:border-white/10">
                    <button
                      onClick={() => { setModel('flash'); localStorage.setItem('lexiai_model', 'flash'); window.dispatchEvent(new Event('storage')); }}
                      className={`flex-1 py-2.5 rounded-full text-[10px] font-bold transition-all ${model === 'flash' ? 'premium-gradient text-white shadow-lg' : 'text-zinc-500 dark:text-zinc-400'}`}
                    >
                      ⚡ NHANH (FLASH)
                    </button>
                    <button
                      onClick={() => { setModel('pro'); localStorage.setItem('lexiai_model', 'pro'); window.dispatchEvent(new Event('storage')); }}
                      className={`flex-1 py-2.5 rounded-full text-[10px] font-bold transition-all ${model === 'pro' ? 'premium-gradient text-white shadow-lg' : 'text-zinc-500 dark:text-zinc-400'}`}
                    >
                      🎯 CHẤT LƯỢNG (PRO)
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {showModal && (
        <APIConfigModal 
          onClose={() => setShowModal(false)} 
          onSave={handleSaveKey} 
        />
      )}
    </>
  );
}
