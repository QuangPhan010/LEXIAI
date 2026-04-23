'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { API_BASE_URL } from '@/lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('username', username);
        router.push('/cv');
      } else {
        alert('Tên đăng nhập hoặc mật khẩu không đúng.');
      }
    } catch (error) {
      console.error(error);
      alert('Đã xảy ra lỗi khi đăng nhập.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <Navbar />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-8 w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gradient">Chào mừng trở lại</h1>
          <p className="text-muted-foreground">Tiếp tục tối ưu CV của bạn với LexiAI.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-3.5 text-muted-foreground" size={18} />
              <input
                type="text"
                placeholder="Tên đăng nhập"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-muted-foreground" size={18} />
              <input
                type="password"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 premium-gradient rounded-xl font-bold flex items-center justify-center gap-2 hover-glow transition-all"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Đăng nhập <ArrowRight size={18} /></>}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Chưa có tài khoản? <Link href="/auth/signup" className="text-accent hover:underline">Đăng ký ngay</Link>
        </p>
      </motion.div>
    </div>
  );
}
