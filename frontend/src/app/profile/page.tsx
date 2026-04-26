'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { motion } from 'framer-motion';
import { 
  User, Mail, Briefcase, Globe, 
  Award, Zap, Star, ShieldCheck, PenTool, Save, 
  Plus, X, ChevronRight, TrendingUp, Cpu
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      window.location.href = '/auth/login';
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/profile/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setFormData(data);
      }
    } catch (error) {
      console.error("Lỗi tải profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem('access_token');
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/profile/`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setEditMode(false);
      }
    } catch (error) {
      console.error("Lỗi lưu profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s: string) => s !== skill)
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Zap className="animate-spin text-accent" size={40} />
    </div>
  );

  const levelProgress = (profile?.points % 100) || 0;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />
      
      <main className="max-w-5xl mx-auto pt-32 px-6 space-y-10">
        {/* Profile Header */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-purple-500/20 blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="glass p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-center gap-8 border-white/10">
            <div className="relative">
              <div className="w-32 h-32 rounded-2xl bg-accent/20 flex items-center justify-center text-accent ring-4 ring-accent/10">
                <User size={64} />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-accent text-white text-xs font-black px-3 py-1 rounded-full shadow-lg">
                LEVEL {profile?.level}
              </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <h1 className="text-4xl font-black tracking-tight">{profile?.username || 'Lexi User'}</h1>
                <span className="text-muted-foreground text-sm font-medium flex items-center gap-1">
                  <Mail size={14} /> {profile?.email}
                </span>
              </div>
              <p className="text-xl font-medium text-accent">
                {profile?.target_role || 'Chưa thiết lập mục tiêu'}
              </p>
              
              <div className="pt-4 max-w-md">
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-muted-foreground uppercase tracking-widest">Tiến trình cấp độ</span>
                  <span>{profile?.points} / {(profile?.level) * 100} XP</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${levelProgress}%` }}
                    className="h-full premium-gradient shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={() => editMode ? handleSave() : setEditMode(true)}
              disabled={saving}
              className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${editMode ? 'premium-gradient text-white shadow-glow' : 'glass hover:bg-white/10'}`}
            >
              {saving ? <Zap className="animate-spin" size={18} /> : (editMode ? <Save size={18} /> : <PenTool size={18} />)}
              {editMode ? 'Lưu hồ sơ' : 'Chỉnh sửa'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Details & Social */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bio & Professional Info */}
            <section className="glass p-8 space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Briefcase className="text-accent" size={20} /> Thông tin chuyên môn
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vị trí mong muốn</label>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={formData.target_role || ''} 
                      onChange={(e) => setFormData({...formData, target_role: e.target.value})}
                      placeholder="VD: Senior Frontend Developer"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-all"
                    />
                  ) : (
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 font-medium">
                      {profile?.target_role || 'Chưa cập nhật'}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Lĩnh vực / Công nghiệp</label>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={formData.industry || ''} 
                      onChange={(e) => setFormData({...formData, industry: e.target.value})}
                      placeholder="VD: FinTech, eCommerce"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-all"
                    />
                  ) : (
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 font-medium">
                      {profile?.industry || 'Chưa cập nhật'}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Giới thiệu bản thân</label>
                {editMode ? (
                  <textarea 
                    rows={4}
                    value={formData.bio || ''} 
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    placeholder="Mô tả ngắn gọn về kinh nghiệm và mục tiêu của bạn..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-all resize-none"
                  />
                ) : (
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5 font-medium leading-relaxed whitespace-pre-wrap">
                    {profile?.bio || 'Hãy thêm một chút giới thiệu về bạn để AI hiểu bạn hơn.'}
                  </div>
                )}
              </div>
            </section>

            {/* Skill Matrix */}
            <section className="glass p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Cpu className="text-accent" size={20} /> Hệ thống kỹ năng
                </h3>
                {editMode && (
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newSkill} 
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                      placeholder="Thêm kỹ năng..."
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-accent"
                    />
                    <button onClick={addSkill} className="p-1.5 bg-accent rounded-lg hover:scale-110 transition-all">
                      <Plus size={16} />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-3">
                {(editMode ? formData.skills : profile?.skills)?.map((skill: string, index: number) => (
                  <motion.div 
                    key={index}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="px-4 py-2 bg-accent/10 border border-accent/20 rounded-xl text-sm font-bold text-accent flex items-center gap-2 group/skill hover:bg-accent/20 transition-all"
                  >
                    {skill}
                    {editMode && (
                      <button onClick={() => removeSkill(skill)} className="opacity-0 group-hover/skill:opacity-100 transition-opacity">
                        <X size={14} className="hover:text-red-500" />
                      </button>
                    )}
                  </motion.div>
                ))}
                {(!profile?.skills || profile.skills.length === 0) && !editMode && (
                  <p className="text-muted-foreground italic text-sm">Chưa có kỹ năng nào được cập nhật. AI sẽ tự động cập nhật khi bạn phân tích CV.</p>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Achievements & Links */}
          <div className="space-y-8">
            {/* Achievements Gallery */}
            <section className="glass p-6 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Award className="text-accent" size={18} /> Thành tựu & Huy hiệu
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'ats_master', label: 'ATS Master', icon: <ShieldCheck size={20} />, color: 'indigo' },
                  { id: 'interview_expert', label: 'Interview Pro', icon: <Star size={20} />, color: 'purple' },
                  { id: 'early_adopter', label: 'Early Bird', icon: <Zap size={20} />, color: 'blue' },
                  { id: 'cv_architect', label: 'CV Architect', icon: <PenTool size={20} />, color: 'pink' },
                ].map((badge) => {
                  const isEarned = profile?.achievements?.includes(badge.id);
                  return (
                    <div 
                      key={badge.id}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${isEarned ? `bg-${badge.color}-500/10 border-${badge.color}-500/30 text-${badge.color}-400` : 'bg-white/5 border-white/5 text-muted-foreground/30 grayscale opacity-50'}`}
                    >
                      <div className="mb-2">{badge.icon}</div>
                      <span className="text-[10px] font-black text-center">{badge.label}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-center text-muted-foreground font-medium italic">Hoàn thành nhiệm vụ để mở khóa huy hiệu</p>
            </section>

            {/* Social Links */}
            <section className="glass p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Globe className="text-accent" size={18} /> Liên kết bên ngoài
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Globe className="text-muted-foreground" size={18} />
                  {editMode ? (
                    <input 
                      type="text" 
                      value={formData.social_links?.github || ''} 
                      onChange={(e) => setFormData({...formData, social_links: {...formData.social_links, github: e.target.value}})}
                      placeholder="Username GitHub"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  ) : (
                    <a href={`https://github.com/${profile?.social_links?.github}`} target="_blank" className="text-sm font-medium hover:text-accent transition-all truncate">
                      {profile?.social_links?.github || 'Chưa cập nhật'}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="text-muted-foreground" size={18} />
                  {editMode ? (
                    <input 
                      type="text" 
                      value={formData.social_links?.linkedin || ''} 
                      onChange={(e) => setFormData({...formData, social_links: {...formData.social_links, linkedin: e.target.value}})}
                      placeholder="LinkedIn Profile URL"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  ) : (
                    <a href={profile?.social_links?.linkedin} target="_blank" className="text-sm font-medium hover:text-accent transition-all truncate">
                      {profile?.social_links?.linkedin || 'Chưa cập nhật'}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="text-muted-foreground" size={18} />
                  {editMode ? (
                    <input 
                      type="text" 
                      value={formData.social_links?.website || ''} 
                      onChange={(e) => setFormData({...formData, social_links: {...formData.social_links, website: e.target.value}})}
                      placeholder="Website cá nhân"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  ) : (
                    <a href={profile?.social_links?.website} target="_blank" className="text-sm font-medium hover:text-accent transition-all truncate">
                      {profile?.social_links?.website || 'Chưa cập nhật'}
                    </a>
                  )}
                </div>
              </div>
            </section>

            {/* Quick Stats */}
            <div className="p-6 bg-accent rounded-3xl text-white shadow-glow flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase opacity-70 tracking-tighter">Readiness Score</p>
                <div className="text-4xl font-black">78%</div>
              </div>
              <TrendingUp size={48} className="opacity-30" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
