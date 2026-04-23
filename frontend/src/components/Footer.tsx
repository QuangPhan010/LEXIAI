'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { 
  Code2, 
  Briefcase, 
  Globe, 
  Mail, 
  ExternalLink, 
  Cpu, 
  Sparkles, 
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    platform: [
      { name: 'Phân tích CV', href: '/cv' },
      { name: 'Phỏng vấn thử', href: '/interview' },
      { name: 'Lộ trình sự nghiệp', href: '/roadmap' },
      { name: 'Gợi ý việc làm', href: '/jobs' },
    ],
    resources: [
      { name: 'Blog công nghệ', href: '#' },
      { name: 'Mẫu CV chuẩn', href: '#' },
      { name: 'Hướng dẫn sử dụng', href: '#' },
      { name: 'Cộng đồng LexiAI', href: '#' },
    ],
    company: [
      { name: 'Về chúng tôi', href: '#' },
      { name: 'Điều khoản dịch vụ', href: '#' },
      { name: 'Chính sách bảo mật', href: '#' },
      { name: 'Liên hệ', href: 'mailto:contact@lexiai.com' },
    ]
  };

  return (
    <footer className="relative mt-24 border-t border-black/10 dark:border-white/10 bg-muted/30 backdrop-blur-sm shadow-[0_-1px_0_rgba(0,0,0,0.05)] dark:shadow-[0_-1px_0_rgba(255,255,255,0.05)]">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-accent/5 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-8 relative">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          {/* Brand Column */}
          <div className="md:col-span-4 space-y-6">
            <Link href="/" className="flex items-center gap-3 group">
              <Image 
                src="/lexi_logo.svg" 
                alt="LexiAI Logo" 
                width={40} 
                height={40} 
                className="group-hover:scale-110 transition-transform duration-300"
              />
              <span className="text-2xl font-black tracking-tighter text-gradient">LEXI AI</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs font-medium">
              Nền tảng AI tiên phong giúp bạn tối ưu hóa hồ sơ năng lực và chinh phục những đỉnh cao mới trong sự nghiệp.
            </p>
            <div className="flex items-center gap-4">
              {[
                { icon: <Code2 size={18} />, href: '#' },
                { icon: <Briefcase size={18} />, href: '#' },
                { icon: <Globe size={18} />, href: '#' },
                { icon: <Mail size={18} />, href: 'mailto:contact@lexiai.com' },
              ].map((social, i) => (
                <Link 
                  key={i} 
                  href={social.href}
                  className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-muted-foreground hover:bg-accent/10 hover:text-accent hover:border-accent/20 transition-all duration-300"
                >
                  {social.icon}
                </Link>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-2 space-y-6">
            <h4 className="text-sm font-bold uppercase tracking-widest text-foreground">Nền tảng</h4>
            <ul className="space-y-3">
              {footerLinks.platform.map((link, i) => (
                <li key={i}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-accent flex items-center gap-1 transition-colors group font-medium">
                    <ChevronRight size={12} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2 space-y-6">
            <h4 className="text-sm font-bold uppercase tracking-widest text-foreground">Tài nguyên</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link, i) => (
                <li key={i}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-accent flex items-center gap-1 transition-colors group font-medium">
                    <ChevronRight size={12} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4 space-y-6">
            <div className="bg-input border border-black/10 dark:border-white/10 p-6 rounded-2xl shadow-sm">
              <h4 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
                <Sparkles size={16} className="text-accent" />
                Đăng ký bản tin công nghệ
              </h4>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed font-medium">
                Nhận những mẹo tối ưu CV và xu hướng tuyển dụng mới nhất từ AI.
              </p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Email của bạn"
                  suppressHydrationWarning
                  className="flex-1 bg-input border border-black/5 dark:border-white/10 rounded-lg px-4 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                />
                <button 
                  suppressHydrationWarning
                  className="px-4 py-2 premium-gradient text-white rounded-lg text-xs font-bold shadow-lg hover-glow"
                >
                  Gửi
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-black/5 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p 
            suppressHydrationWarning
            className="text-[10px] uppercase tracking-widest text-muted-foreground font-black"
          >
            © {currentYear} LexiAI Inc. Tất cả quyền được bảo lưu.
          </p>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground font-black">
              <ShieldCheck size={14} className="text-green-500" />
              Bảo mật bởi AI
            </div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground font-black">
              Hệ thống: <span className="text-green-500">Hoạt động tốt</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
