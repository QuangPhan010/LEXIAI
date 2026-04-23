'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { API_BASE_URL } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('Mã xác nhận đã được gửi đến email của bạn.');
        router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
      } else {
        alert(data.error || 'Đã xảy ra lỗi.');
      }
    } catch (error) {
      console.error(error);
      alert('Đã xảy ra lỗi kết nối.');
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
          <h1 className="text-3xl font-bold text-gradient">Quên mật khẩu</h1>
          <p className="text-muted-foreground">Nhập email của bạn để nhận mã xác nhận đặt lại mật khẩu.</p>
        </div>

        <form onSubmit={handleRequestReset} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-muted-foreground" size={18} />
              <input
                type="email"
                placeholder="Email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            {loading ? <Loader2 className="animate-spin" /> : <>Gửi mã xác nhận <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="text-center">
          <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-accent flex items-center justify-center gap-2">
            <ArrowLeft size={14} /> Quay lại đăng nhập
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
