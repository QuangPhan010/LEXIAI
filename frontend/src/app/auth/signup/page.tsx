'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { API_BASE_URL } from '@/lib/api';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const router = useRouter();

  const handleSendOTP = async () => {
    if (!email) return alert('Vui lòng nhập email trước.');
    setOtpLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/send-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setOtpSent(true);
        alert('Mã OTP đã được gửi đến email của bạn.');
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi gửi OTP.');
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi kết nối.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, otp }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('username', data.user.username);
        router.push('/cv');
      } else {
        const err = await res.json();
        alert(JSON.stringify(err));
      }
    } catch (error) {
      console.error(error);
      alert('Đã xảy ra lỗi khi đăng ký.');
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
          <h1 className="text-3xl font-bold text-gradient">Tạo tài khoản LexiAI</h1>
          <p className="text-muted-foreground">Bắt đầu hành trình tối ưu sự nghiệp của bạn.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
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
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-3.5 text-muted-foreground" size={18} />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                />
              </div>
              <button
                type="button"
                onClick={handleSendOTP}
                disabled={otpLoading || !email}
                className="px-4 rounded-xl bg-accent/20 border border-accent/30 text-accent text-xs font-bold hover:bg-accent/30 transition-all disabled:opacity-50"
              >
                {otpLoading ? <Loader2 size={14} className="animate-spin" /> : otpSent ? 'Gửi lại' : 'Gửi mã'}
              </button>
            </div>
            {otpSent && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="relative"
              >
                <Lock className="absolute left-3 top-3.5 text-muted-foreground" size={18} />
                <input
                  type="text"
                  placeholder="Mã xác thực (OTP)"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  className="w-full bg-accent/5 border border-accent/20 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-accent transition-all font-mono tracking-[0.5em] text-center"
                  maxLength={6}
                />
              </motion.div>
            )}
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
            {loading ? <Loader2 className="animate-spin" /> : <>Đăng ký <ArrowRight size={18} /></>}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Đã có tài khoản? <Link href="/auth/login" className="text-accent hover:underline">Đăng nhập ngay</Link>
        </p>
      </motion.div>
    </div>
  );
}
