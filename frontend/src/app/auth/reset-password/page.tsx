'use client';

import React, { useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { API_BASE_URL } from '@/lib/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      alert('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('Mật khẩu đã được thay đổi thành công.');
        router.push('/auth/login');
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-8 w-full max-w-md space-y-8"
    >
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gradient">Đặt lại mật khẩu</h1>
        <p className="text-muted-foreground">Nhập mã OTP và mật khẩu mới cho email <strong>{email}</strong></p>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-6">
        <div className="space-y-4">
          <div className="relative">
            <KeyRound className="absolute left-3 top-3.5 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Mã OTP (6 chữ số)"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength={6}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 text-muted-foreground" size={18} />
            <input
              type="password"
              placeholder="Mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 text-muted-foreground" size={18} />
            <input
              type="password"
              placeholder="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
          {loading ? <Loader2 className="animate-spin" /> : <>Cập nhật mật khẩu <ArrowRight size={18} /></>}
        </button>
      </form>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <Navbar />
      <Suspense fallback={<Loader2 className="animate-spin" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
