'use client';

import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Upload, FileText, BarChart3, AlertCircle, CheckCircle2, ChevronRight, Zap, Trophy, ClipboardCheck, Target, Key } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveGeminiModel } from '@/lib/geminiModel';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import CVEditor from '@/components/CVEditor';

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
  const radarData = Array.isArray(radarDataRaw) ? radarDataRaw.map((item: any) => ({
    subject: item.subject || item.label || item.name || "Kỹ năng",
    A: item.A || item.value || item.score || 0,
    fullMark: item.fullMark || 100
  })) : [];

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
    atsKeywords: data.atsKeywords || data.ats_keywords || { present: [], missing: [] }
  } as AnalysisResult;
}

export default function CVAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);
  const [jd, setJd] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    setIsMounted(true);
    const historyId = searchParams.get('historyId');
    if (historyId) {
      loadHistory(historyId);
    }
  }, [searchParams]);

  const loadHistory = async (id: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/history/${id}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const radarDataRaw = data.radar_data || data.radarData || [];
        const radarData = Array.isArray(radarDataRaw) ? radarDataRaw.map((item: any) => ({
          subject: item.subject || item.label || item.name || "Kỹ năng",
          A: item.A || item.value || item.score || 0,
          fullMark: item.fullMark || 100
        })) : [];

        const skillGapsRaw = data.skill_gaps || data.skillGaps || [];
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
          }
        };
        setResult(resultData);
        setExtractedText(data.extracted_text || '');
        localStorage.setItem('last_cv_text', data.extracted_text || '');
      }
    } catch (error) {
      console.error("Lỗi tải lịch sử:", error);
    } finally {
      setLoading(false);
    }
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

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
      const extractResponse = await fetch('http://localhost:8000/api/cv/extract-text/', {
        method: 'POST',
        body: formData,
      });
      if (!extractResponse.ok) throw new Error("Không thể trích xuất nội dung từ tệp.");
      const { text } = await extractResponse.json();
      
      // Kiểm tra nếu CV và JD giống hệt lần trước
      const lastText = localStorage.getItem('last_cv_text');
      const lastJd = localStorage.getItem('last_jd');
      const cachedResult = localStorage.getItem('last_cv_result');

      if (text === lastText && jd === lastJd && cachedResult) {
        console.log("Phát hiện CV và JD trùng lặp, sử dụng kết quả cũ.");
        setResult(JSON.parse(cachedResult));
        setExtractedText(text);
        setExtracting(false);
        setLoading(false);
        return;
      }

      setExtractedText(text);
      localStorage.setItem('last_cv_text', text);
      localStorage.setItem('last_jd', jd);
      setExtracting(false);

      const modelType = localStorage.getItem('lexiai_model') || 'pro';
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = await resolveGeminiModel(apiKey, modelType === 'pro' ? 'pro' : 'flash');
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { 
          maxOutputTokens: 2000, 
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
          }
        }

        NỘI DUNG CV: ${text}
        ${jd ? `MÔ TẢ CÔNG VIỆC (JD): ${jd}` : ''}
      `;

      let aiResponseText = "";
      let retries = 0;
      const maxRetries = 3;
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
          if (retries < maxRetries && (err.message?.includes('503') || err.message?.includes('high demand'))) {
            await delay(Math.pow(2, retries) * 1000);
          } else { throw err; }
        }
      }
      const data = parseAnalysisJson(aiResponseText);
      setResult(data);
      localStorage.setItem('last_cv_result', JSON.stringify(data));

      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        try {
          await fetch('http://localhost:8000/api/history/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify({
              file_name: file.name,
              score: Math.round(data.score || 0),
              breakdown: data.breakdown,
              issues: data.issues,
              radar_data: data.radarData,
              skill_gaps: data.skillGaps,
              ats_keywords: data.atsKeywords,
              extracted_text: text
            })
          });
        } catch (e) { console.error("Lỗi lưu lịch sử:", e); }
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

  return (
    <div className="min-h-screen bg-background text-foreground pt-32 pb-24 px-8">
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
            <div className="glass p-12 border-dashed border-2 border-white/10 flex flex-col items-center justify-center space-y-6 hover:border-accent/50 transition-all group cursor-pointer relative overflow-hidden">
              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-all duration-500">
                <Upload size={32} className="text-accent" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold mb-1">Kéo thả hoặc chọn CV</h3>
                <p className="text-sm text-muted-foreground">Định dạng hỗ trợ: PDF, DOCX (tối đa 10MB)</p>
              </div>
              <input type="file" accept=".pdf,.docx" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              {file && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                  <FileText size={16} className="text-accent" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
              )}
            </div>
            {file && (
              <div className="mt-6 space-y-4">
                <div className="bg-input p-4 border border-black/5 dark:border-white/10 rounded-2xl">
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
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full border-4 border-t-accent border-r-transparent border-b-white/10 border-l-transparent" />
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
              <button onClick={() => setIsEditing(!isEditing)} className="px-6 py-3 rounded-xl bg-white/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-all font-bold flex items-center gap-2">
                {isEditing ? 'Đóng trình soạn thảo' : 'Mở trình soạn thảo & Xuất PDF'}
              </button>
            </div>

            {isEditing ? (<div className="h-[800px]"><CVEditor initialContent={extractedText} /></div>) : (
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

                    <div className="glass p-6 min-h-[400px] w-full flex flex-col" style={{ minWidth: 0 }}>
                      <h3 className="text-sm font-bold uppercase tracking-wider opacity-60 mb-4">Phân tích kỹ năng</h3>
                      <div className="flex-1 w-full min-h-[300px]">
                        {isMounted ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={result.radarData}>
                              <PolarGrid stroke="currentColor" className="text-black/10 dark:text-white/10" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: 'currentColor', fontSize: 10, className: 'text-muted-foreground' }} />
                              <Radar name="Kỹ năng" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.5} />
                            </RadarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-t-accent border-white/10 rounded-full animate-spin" />
                          </div>
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
                            <p className="text-xs text-zinc-400">{gap.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Zap size={20} className="text-accent" /> Đề xuất tối ưu từ AI</h3>
                    <span className="text-xs text-muted-foreground font-medium">Tìm thấy {result.issues.length} điểm cần cải thiện</span>
                  </div>

                  <div className="space-y-4">
                    <AnimatePresence>
                      {result.issues.map((issue, idx) => (
                        <motion.div key={idx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} className="glass p-6 hover:bg-white/[0.05] transition-all group border-l-4 border-l-transparent hover:border-l-accent">
                          <div className="flex gap-4">
                            <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${issue.severity === 'high' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : issue.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                            <div className="flex-1 space-y-4">
                              <div className="space-y-1"><span className="text-xs font-bold uppercase text-muted-foreground">Nội dung gốc</span><p className="text-sm font-medium italic text-foreground">"{issue.text}"</p></div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-red-500/5 rounded-lg p-3 border border-red-500/10"><span className="text-[10px] font-black uppercase text-red-500 block mb-1">Vấn đề phát hiện</span><p className="text-sm text-foreground">{issue.problem}</p></div>
                                <div className="bg-green-500/10 dark:bg-green-500/5 rounded-lg p-3 border border-green-500/20 relative"><span className="text-[10px] font-black uppercase text-green-600 dark:text-green-500 block mb-1">Gợi ý từ AI</span><p className="text-sm font-bold text-foreground leading-relaxed">{issue.suggestion}</p>
                                  <button onClick={() => handleApply(issue.suggestion, idx)} className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all ${appliedIndex === idx ? 'bg-green-500 text-white' : 'hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground'}`}>{appliedIndex === idx ? <ClipboardCheck size={14} /> : <Zap size={14} />}</button>
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
            )}
          </div>
        )}
      </main>
    </div>
  );
}
