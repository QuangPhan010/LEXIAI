'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, Suspense } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Upload, FileText, BarChart3, AlertCircle, CheckCircle2, ChevronRight, Zap, Trophy, ClipboardCheck, Target, Key, PlusCircle, RefreshCw, Eye, Lightbulb, ShieldCheck, Brain, TrendingUp, XCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { API_BASE_URL } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveGeminiModel } from '@/lib/geminiModel';
import CVEditor from '@/components/CVEditor';
import dynamic from 'next/dynamic';

const SkillChart = dynamic(() => import('@/components/SkillChart'), { 
  loading: () => <div className="w-full h-[320px] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-t-accent border-muted rounded-full animate-spin" />
  </div>
});

const PDFDirectEditor = dynamic(() => import('@/components/PDFDirectEditor'), {
  ssr: false,
});

interface AnalysisResult {
  score: number;
  breakdown: {
    ats: number;
    structure: number;
    content: number;
    impact: number;
    keywords: number;
  };
  issues: Array<{
    text: string;
    problem: string;
    suggestion: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  radarData: Array<{
    subject: string;
    A: number;
    fullMark: number;
  }>;
  skillGaps: Array<{
    skill: string;
    description: string;
    importance: 'high' | 'medium';
  }>;
  atsKeywords: {
    present: string[];
    missing: string[];
  };
  // New features
  recruiterBrain?: {
    thoughts: string;
    passScreening: boolean;
    reasons: string[];
  };
  careerIntelligence?: {
    recommendedRoles: string[];
    nextLevelMissing: string[];
  };
  truthDetection?: {
    exaggerationSigns: string[];
    integrityScore: number;
  };
  personalizedFeedback?: string;
}

function parseAnalysisJson(rawText: string): AnalysisResult {
  const trimmed = rawText.trim();
  let data: any;

  try {
    data = JSON.parse(trimmed);
  } catch {
    const withoutFence = trimmed
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '');
    try {
      data = JSON.parse(withoutFence);
    } catch {
      const start = withoutFence.indexOf('{');
      const end = withoutFence.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        data = JSON.parse(withoutFence.slice(start, end + 1));
      } else {
        throw new Error('Phản hồi AI không đúng định dạng JSON.');
      }
    }
  }

  // Chuẩn hóa dữ liệu để đảm bảo luôn có các trường cần thiết (hỗ trợ cả camelCase và snake_case từ AI)
  const radarDataRaw = data.radarData || data.radar_data || [];
  let radarData = Array.isArray(radarDataRaw) ? radarDataRaw.map((item: any) => ({
    subject: item.subject || item.label || item.name || "Kỹ năng",
    A: item.A || item.value || item.score || 0,
    fullMark: item.fullMark || 100
  })) : [];

  // Nếu không có dữ liệu radar, tạo dữ liệu giả lập dựa trên điểm số để tránh biểu đồ trống
  if (radarData.length === 0) {
    const baseScore = data.score || 50;
    radarData = [
      { subject: 'Chuyên môn', A: baseScore, fullMark: 100 },
      { subject: 'Kỹ năng mềm', A: Math.max(0, baseScore - 10), fullMark: 100 },
      { subject: 'Kinh nghiệm', A: Math.max(0, baseScore - 5), fullMark: 100 },
      { subject: 'Trình bày', A: Math.min(100, baseScore + 10), fullMark: 100 },
      { subject: 'Độ phù hợp', A: baseScore, fullMark: 100 },
    ];
  }

  const skillGapsRaw = data.skillGaps || data.skill_gaps || [];
  const skillGaps = Array.isArray(skillGapsRaw) ? skillGapsRaw.map((item: any) => ({
    skill: item.skill || item.name || "Kỹ năng",
    description: item.description || item.reason || "",
    importance: item.importance || "medium"
  })) : [];

  return {
    score: data.score || 0,
    breakdown: data.breakdown || { ats: 0, structure: 0, content: 0, impact: 0, keywords: 0 },
    issues: data.issues || [],
    radarData,
    skillGaps,
    atsKeywords: data.atsKeywords || data.ats_keywords || { present: [], missing: [] },
    // New features
    recruiterBrain: data.recruiterBrain || data.recruiter_brain,
    careerIntelligence: data.careerIntelligence || data.career_intelligence,
    truthDetection: data.truthDetection || data.truth_detection,
    personalizedFeedback: data.personalizedFeedback || data.personalized_feedback
  } as AnalysisResult;
}

function CVAnalyzerContent() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);
  const [jd, setJd] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isDirectEditing, setIsDirectEditing] = useState(false);
  const searchParams = useSearchParams();

  const loadHistory = async (id: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/history/${id}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const radarDataRaw = data.radar_data || data.radarData || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let radarData = Array.isArray(radarDataRaw) ? radarDataRaw.map((item: any) => ({
          subject: item.subject || item.label || item.name || "Kỹ năng",
          A: item.A || item.value || item.score || 0,
          fullMark: item.fullMark || 100
        })) : [];

        if (radarData.length === 0) {
          const baseScore = data.score || 50;
          radarData = [
            { subject: 'Chuyên môn', A: baseScore, fullMark: 100 },
            { subject: 'Kỹ năng mềm', A: Math.max(0, baseScore - 10), fullMark: 100 },
            { subject: 'Kinh nghiệm', A: Math.max(0, baseScore - 5), fullMark: 100 },
            { subject: 'Trình bày', A: Math.min(100, baseScore + 10), fullMark: 100 },
            { subject: 'Độ phù hợp', A: baseScore, fullMark: 100 },
          ];
        }

        const skillGapsRaw = data.skill_gaps || data.skillGaps || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const skillGaps = Array.isArray(skillGapsRaw) ? skillGapsRaw.map((item: any) => ({
          skill: item.skill || item.name || "Kỹ năng",
          description: item.description || item.reason || "",
          importance: item.importance || "medium"
        })) : [];

        const resultData: AnalysisResult = {
          score: data.score || 0,
          breakdown: data.breakdown || { ats: 0, structure: 0, content: 0, impact: 0, keywords: 0 },
          issues: data.issues || [],
          radarData,
          skillGaps,
          atsKeywords: {
            present: data.ats_keywords?.present || data.atsKeywords?.present || [],
            missing: data.ats_keywords?.missing || data.atsKeywords?.missing || []
          },
          recruiterBrain: data.recruiter_brain || data.recruiterBrain,
          careerIntelligence: data.career_intelligence || data.careerIntelligence,
          truthDetection: data.truth_detection || data.truthDetection,
          personalizedFeedback: data.personalized_feedback || data.personalizedFeedback
        };
        setResult(resultData);
        setExtractedText(data.extracted_text || '');
        const username = localStorage.getItem('username') || 'guest';
        localStorage.setItem(`last_cv_text_${username}`, data.extracted_text || '');
      }
    } catch (error) {
      console.error("Lỗi tải lịch sử:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    const historyId = searchParams.get('historyId');
    if (historyId) {
      loadHistory(historyId);
    }
  }, [searchParams]);

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const saveToHistory = async (token: string, fileName: string, data: AnalysisResult, text: string) => {
    try {
      await fetch(`${API_BASE_URL}/history/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          file_name: fileName,
          score: Math.round(data.score || 0),
          breakdown: data.breakdown,
          issues: data.issues,
          radar_data: data.radarData,
          skill_gaps: data.skillGaps,
          ats_keywords: data.atsKeywords,
          recruiter_brain: data.recruiterBrain,
          career_intelligence: data.careerIntelligence,
          truth_detection: data.truthDetection,
          personalized_feedback: data.personalizedFeedback,
          extracted_text: text
        })
      });
    } catch (e) { console.error("Lỗi lưu lịch sử:", e); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const analyzeCV = async () => {
    if (!file) return;
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      alert("Vui lòng cài đặt Gemini API Key trên thanh điều hướng trước.");
      return;
    }

    setLoading(true);
    setExtracting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const extractResponse = await fetch(`${API_BASE_URL}/cv/extract-text/`, {
        method: 'POST',
        body: formData,
      });
      if (!extractResponse.ok) throw new Error("Không thể trích xuất nội dung từ tệp.");
      const { text } = await extractResponse.json();
      
      const username = localStorage.getItem('username') || 'guest';
      
      // Kiểm tra nếu CV và JD giống hệt lần trước của USER NÀY
      const lastText = localStorage.getItem(`last_cv_text_${username}`);
      const lastJd = localStorage.getItem(`last_jd_${username}`);
      const cachedResult = localStorage.getItem(`last_cv_result_${username}`);

      if (text === lastText && jd === lastJd && cachedResult) {
        console.log("Phát hiện CV và JD trùng lặp, sử dụng kết quả cũ.");
        const data = JSON.parse(cachedResult);
        setResult(data);
        setExtractedText(text);
        setExtracting(false);
        setLoading(false);
        
        // Vẫn lưu vào lịch sử cho user hiện tại nếu họ đang đăng nhập
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
          saveToHistory(accessToken, file.name, data, text);
        }
        return;
      }

      setExtractedText(text);
      localStorage.setItem(`last_cv_text_${username}`, text);
      localStorage.setItem(`last_jd_${username}`, jd);
      setExtracting(false);

      const modelType = localStorage.getItem('lexiai_model') || 'flash';
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = await resolveGeminiModel(apiKey, modelType === 'pro' ? 'pro' : 'flash');
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { 
          responseMimeType: 'application/json' 
        }
      });

      const prompt = `
        Bạn là chuyên gia nhân sự cao cấp và hệ thống ATS.
        Hãy phân tích nội dung CV sau${jd ? ' dựa trên Mô tả công việc (JD) được cung cấp' : ''} và trả về đúng định dạng JSON.
        Tất cả nội dung hiển thị phải viết bằng tiếng Việt.

        {
          "score": number (0-100),
          "breakdown": {
            "ats": number, "structure": number, "content": number, "impact": number, "keywords": number
          },
          "issues": [
            { "text": "nội dung gốc", "problem": "vấn đề", "suggestion": "gợi ý", "severity": "low|medium|high" }
          ],
          "radarData": [
            { "subject": "Kỹ năng chuyên môn", "A": number, "fullMark": 100 },
            { "subject": "Kỹ năng mềm", "A": number, "fullMark": 100 },
            { "subject": "Kinh nghiệm", "A": number, "fullMark": 100 },
            { "subject": "Trình bày", "A": number, "fullMark": 100 },
            { "subject": "Độ phù hợp JD", "A": number, "fullMark": 100 }
          ],
          "skillGaps": [
            { "skill": "Tên kỹ năng thiếu", "description": "Lý do tại sao quan trọng", "importance": "high|medium" }
          ],
          "atsKeywords": {
            "present": ["từ khóa đã có 1", "từ khóa đã có 2"],
            "missing": ["từ khóa thiếu 1", "từ khóa thiếu 2"]
          },
          "recruiterBrain": {
            "thoughts": "Suy nghĩ của HR về ứng viên này (ngắn gọn, sắc sảo)",
            "passScreening": boolean,
            "reasons": ["lý do 1", "lý do 2"]
          },
          "careerIntelligence": {
            "recommendedRoles": ["role 1", "role 2"],
            "nextLevelMissing": ["thiếu gì để lên level tiếp theo"]
          },
          "truthDetection": {
            "exaggerationSigns": ["các dấu hiệu nói quá hoặc từ ngữ sáo rỗng"],
            "integrityScore": number (0-100)
          },
          "personalizedFeedback": "Lời khuyên cá nhân hóa trực tiếp cho ứng viên (không dùng mẫu, viết như một mentor)"
        }

        NỘI DUNG CV: ${text}
        ${jd ? `MÔ TẢ CÔNG VIỆC (JD): ${jd}` : ''}
      `;

      let aiResponseText = "";
      let retries = 0;
      const maxRetries = 5;
      while (retries < maxRetries) {
        try {
          const aiResult = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          });
          aiResponseText = aiResult.response.text();
          break;
        } catch (err: any) {
          retries++;
          const isRateLimit = err.message?.includes('429') || err.message?.includes('quota');
          const isServiceBusy = err.message?.includes('503') || err.message?.includes('high demand') || err.message?.includes('service unavailable');
          
          if (retries < maxRetries && (isRateLimit || isServiceBusy)) {
            const waitTime = Math.pow(2, retries) * 1000 + Math.random() * 1000;
            console.log(`Model đang bận hoặc quá tải, thử lại lần ${retries}/${maxRetries} sau ${Math.round(waitTime)}ms...`);
            await delay(waitTime);
          } else { throw err; }
        }
      }
      const data = parseAnalysisJson(aiResponseText);
      setResult(data);
      localStorage.setItem(`last_cv_result_${username}`, JSON.stringify(data));

      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        await saveToHistory(accessToken, file.name, data, text);
      }
    } catch (error: any) {
      console.error(error);
      alert(`Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
      setExtracting(false);
    }
  };

  const handleApply = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setAppliedIndex(index);
    setTimeout(() => setAppliedIndex(null), 2000);
  };

  if (!isMounted) return null;

  return (
    <div className="bg-background text-foreground pt-32 pb-32 px-8">
      <Navbar />
      <main className="max-w-7xl mx-auto space-y-12">
        <header className="flex flex-col items-center text-center space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 px-4 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-widest">
            <Zap size={14} fill="currentColor" /> Tối ưu ATS nâng cao
          </motion.div>
          <h1 className="text-5xl font-extrabold tracking-tight text-gradient">Phân tích CV bằng AI</h1>
          <p className="text-muted-foreground max-w-2xl text-lg">Tải lên CV định dạng PDF hoặc DOCX để nhận điểm đánh giá chi tiết và gợi ý tối ưu bằng AI.</p>
        </header>

        {!result && !loading && (
          <motion.div layoutId="upload-zone" className="max-w-2xl mx-auto">
            <div className="glass p-12 border-dashed border-2 border-glass-border flex flex-col items-center justify-center space-y-6 hover:border-accent/50 transition-all group cursor-pointer relative overflow-hidden">
              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-all duration-500">
                <Upload size={32} className="text-accent" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold mb-1">Kéo thả hoặc chọn CV</h3>
                <p className="text-sm text-muted-foreground">Định dạng hỗ trợ: PDF, DOCX (tối đa 10MB)</p>
              </div>
              <input type="file" accept=".pdf,.docx" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              {file && (
                <div className="flex items-center gap-2 px-4 py-2 bg-glass rounded-lg border border-glass-border">
                  <FileText size={16} className="text-accent" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
              )}
            </div>
            {file && (
              <div className="mt-6 space-y-4">
                <div className="bg-muted p-4 border border-glass-border rounded-2xl">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Mô tả công việc (JD) - Tùy chọn</label>
                  <textarea value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Dán JD vào đây để AI so khớp độ phù hợp..." className="w-full h-32 bg-transparent border-none focus:ring-0 text-sm placeholder:text-muted-foreground/50 resize-none text-foreground" />
                </div>
                <button onClick={analyzeCV} className="w-full py-4 premium-gradient rounded-2xl font-bold text-lg shadow-xl hover-glow transition-all">Bắt đầu phân tích</button>
              </div>
            )}
          </motion.div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center space-y-8 py-20">
            <div className="relative w-24 h-24">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full border-4 border-t-accent border-r-transparent border-b-muted border-l-transparent" />
              <div className="absolute inset-4 rounded-full bg-accent/20 flex items-center justify-center"><FileText size={24} className="text-accent animate-pulse" /></div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">{extracting ? 'Đang đọc tài liệu...' : 'Đang quét từ khóa...'}</h2>
              <p className="text-muted-foreground text-sm">Gemini đang đánh giá mức độ nổi bật của CV.</p>
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-12">
            <div className="flex justify-between items-end">
              <div><h2 className="text-3xl font-bold">Kết quả phân tích</h2><p className="text-muted-foreground">Chi tiết về mức độ tối ưu của CV.</p></div>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setResult(null);
                    setFile(null);
                    const username = localStorage.getItem('username') || 'guest';
                    localStorage.removeItem(`last_cv_result_${username}`);
                    localStorage.removeItem(`last_roadmap_${username}`);
                    localStorage.removeItem(`last_roadmap_role_${username}`);
                    localStorage.removeItem(`last_roadmap_cv_sig_${username}`);
                  }} 
                  className="px-6 py-3 rounded-xl bg-accent text-white hover:opacity-90 transition-all font-bold flex items-center gap-2 shadow-lg hover-glow"
                >
                  <PlusCircle size={18} /> Phân tích CV mới
                </button>
                <button 
                  onClick={() => setIsEditing(!isEditing)} 
                  className="px-6 py-3 rounded-xl bg-glass border border-glass-border hover:bg-muted transition-all font-bold flex items-center gap-2"
                >
                  {isEditing ? 'Đóng trình soạn thảo' : 'Mở trình soạn thảo & Xuất PDF'}
                </button>
              </div>
            </div>

            {isEditing ? (<div className="h-[800px]"><CVEditor initialContent={extractedText} /></div>) : (
              <div className="space-y-8">
                {/* Personalized Feedback - The Mentor's Voice */}
                {result.personalizedFeedback && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="glass p-8 border-l-4 border-l-accent relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Brain size={120} className="text-accent" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
                      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0">
                        <Zap size={32} className="text-accent" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          Lời khuyên từ Mentor LexiAI
                        </h3>
                        <p className="text-lg text-foreground/90 leading-relaxed italic">
                          &quot;{result.personalizedFeedback}&quot;
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                  <div className="glass p-8 flex flex-col items-center text-center">
                    <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" className="text-black/5 dark:text-white/5" strokeWidth="12" />
                        <circle cx="80" cy="80" r="70" fill="transparent" stroke="url(#grad)" strokeWidth="12" strokeDasharray={440} strokeDashoffset={440 - (440 * result.score) / 100} strokeLinecap="round" />
                        <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#a855f7" /></linearGradient></defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-5xl font-black">{result.score}</span><span className="text-xs uppercase font-bold tracking-widest opacity-60 dark:opacity-40">Điểm</span></div>
                    </div>
                    <h2 className="text-2xl font-bold mb-1">Điểm tác động</h2>
                    <p className="text-sm text-muted-foreground">CV của bạn tốt hơn {result.score - 5}% ứng viên trong hệ thống.</p>
                  </div>

                  {/* Recruiter Brain Section */}
                  {result.recruiterBrain && (
                    <div className="glass p-6 space-y-4 border-t-4 border-t-accent">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-wider opacity-60 flex items-center gap-2">
                          <Eye size={14} /> Recruiter Brain
                        </h3>
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${result.recruiterBrain.passScreening ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                          {result.recruiterBrain.passScreening ? 'Pass Screening' : 'Fail Screening'}
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="bg-accent/5 p-3 rounded-lg border border-accent/10">
                          <p className="text-sm font-medium italic text-foreground">
                            &quot;{result.recruiterBrain.thoughts}&quot;
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase opacity-50">Lý do chính:</p>
                          <ul className="space-y-1.5">
                            {result.recruiterBrain.reasons.map((reason, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                {result.recruiterBrain?.passScreening ? 
                                  <CheckCircle2 size={12} className="text-green-500 mt-0.5 shrink-0" /> : 
                                  <XCircle size={12} className="text-red-500 mt-0.5 shrink-0" />
                                }
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                      <div className="glass p-6 min-h-[400px] w-full flex flex-col" style={{ minWidth: 0 }}>
                        <h3 className="text-sm font-bold uppercase tracking-wider opacity-60 mb-4">Phân tích kỹ năng</h3>
                        <div className="flex-1 w-full flex items-center justify-center">
                          {result.radarData && result.radarData.length > 0 ? (
                            <SkillChart data={result.radarData} />
                          ) : (
                            <div className="text-muted-foreground text-sm italic">Đang cập nhật dữ liệu...</div>
                          )}
                        </div>
                      </div>

                  {/* ATS Keywords Section */}
                  <div className="glass p-6 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider opacity-60 flex items-center gap-2"><Key size={14} /> Từ khóa ATS</h3>
                    
                    <div className="space-y-4">
                      {result.atsKeywords.present.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase text-green-500/60">Đã tối ưu</p>
                          <div className="flex flex-wrap gap-2">
                            {result.atsKeywords.present.map((kw, i) => (
                              <span key={i} className="px-2 py-1 bg-green-500/5 border border-green-500/20 rounded-md text-[10px] font-medium text-green-400">{kw}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {result.atsKeywords.missing.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase text-red-500/60">Cần bổ sung</p>
                          <div className="flex flex-wrap gap-2">
                            {result.atsKeywords.missing.map((kw, i) => (
                              <span key={i} className="px-2 py-1 bg-red-500/5 border border-red-500/20 rounded-md text-[10px] font-medium text-red-400">{kw}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="lg:col-span-8 space-y-6">

                  {/* Skill Gaps Section */}
                  {result.skillGaps && result.skillGaps.length > 0 && (
                    <div className="glass p-6 space-y-4 border-l-4 border-l-yellow-500">
                      <h3 className="text-lg font-bold flex items-center gap-2"><Target size={20} className="text-yellow-500" /> Lỗ hổng kỹ năng cần bổ sung</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.skillGaps.map((gap, i) => (
                          <div key={i} className="bg-yellow-500/5 p-3 rounded-lg border border-yellow-500/10">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-sm text-yellow-500">{gap.skill}</span>
                              <span className="text-[10px] uppercase font-bold text-yellow-500/60">{gap.importance} priority</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{gap.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Career Intelligence Section */}
                  {result.careerIntelligence && (
                    <div className="glass p-8 space-y-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                      <div className="flex items-center justify-between relative z-10">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <TrendingUp size={20} className="text-accent" /> Career Intelligence
                        </h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                            <Target size={14} /> Vai trò thực tế phù hợp
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {result.careerIntelligence.recommendedRoles.map((role, i) => (
                              <span key={i} className="px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-xl text-sm font-medium text-accent">
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                            <Lightbulb size={14} /> Để lên Level tiếp theo
                          </div>
                          <ul className="space-y-2">
                            {result.careerIntelligence.nextLevelMissing.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                                <ChevronRight size={16} className="text-accent mt-0.5 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Truth Detection Section */}
                  {result.truthDetection && (
                    <div className="glass p-6 space-y-4 border-l-4 border-l-blue-500 bg-blue-500/5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                          <ShieldCheck size={20} /> Integrity & Clarity Check
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground uppercase">Trust Score:</span>
                          <span className={`text-lg font-black ${result.truthDetection.integrityScore > 80 ? 'text-green-500' : result.truthDetection.integrityScore > 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {result.truthDetection.integrityScore}%
                          </span>
                        </div>
                      </div>
                      
                      {result.truthDetection.exaggerationSigns.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-blue-500/80 uppercase">Các điểm cần làm rõ/thực tế hơn:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {result.truthDetection.exaggerationSigns.map((sign, i) => (
                              <div key={i} className="bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-blue-500/10 text-sm text-foreground/80 flex items-start gap-2">
                                <AlertCircle size={14} className="text-blue-500 mt-0.5 shrink-0" />
                                {sign}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-green-500 font-medium flex items-center gap-2">
                          <CheckCircle2 size={16} /> CV của bạn có độ tin cậy cao và sử dụng ngôn ngữ chuyên nghiệp, thực tế.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Zap size={20} className="text-accent" /> Đề xuất tối ưu từ AI</h3>
                    <span className="text-xs text-muted-foreground font-medium">Tìm thấy {result.issues.length} điểm cần cải thiện</span>
                  </div>

                  <div className="space-y-4">
                    <AnimatePresence>
                      {result.issues.map((issue, idx) => (
                        <motion.div key={idx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} className="glass p-6 hover:bg-accent/5 transition-all group border-l-4 border-l-transparent hover:border-l-accent">
                          <div className="flex gap-4">
                            <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${issue.severity === 'high' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : issue.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                            <div className="flex-1 space-y-4">
                              <div className="space-y-1"><span className="text-xs font-bold uppercase text-muted-foreground">Nội dung gốc</span><p className="text-sm font-medium italic text-foreground">&quot;{issue.text}&quot;</p></div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-red-500/5 rounded-lg p-3 border border-red-500/10"><span className="text-[10px] font-black uppercase text-red-500 block mb-1">Vấn đề phát hiện</span><p className="text-sm text-foreground">{issue.problem}</p></div>
                                <div className="bg-green-500/10 dark:bg-green-500/5 rounded-lg p-3 border border-green-500/20 relative"><span className="text-[10px] font-black uppercase text-green-600 dark:text-green-500 block mb-1">Gợi ý từ AI</span><p className="text-sm font-bold text-foreground leading-relaxed">{issue.suggestion}</p>
                                  <button onClick={() => handleApply(issue.suggestion, idx)} className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all ${appliedIndex === idx ? 'bg-green-500 text-white' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>{appliedIndex === idx ? <ClipboardCheck size={14} /> : <Zap size={14} />}</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        )}
      </main>

      {/* Direct PDF Editor Modal
      {isDirectEditing && file && result && (
        <PDFDirectEditor 
          file={file}
          suggestions={result.issues}
          onClose={() => setIsDirectEditing(false)}
        />
      )}
      */}
    </div>
  );
}

export default function CVAnalyzer() {
  const [userKey, setUserKey] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('username') || 'guest';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUserKey(stored);
     
  }, []);

  if (userKey === null) return null;

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-t-accent border-white/10 rounded-full animate-spin" />
      </div>
    }>
      <CVAnalyzerContent key={userKey} />
    </Suspense>
  );
}
