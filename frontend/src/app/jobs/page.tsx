'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Search, Filter, MapPin, Building2, Zap, CheckCircle2, ChevronRight, Sparkles, RefreshCw, AlertCircle, FileText, Bookmark, GraduationCap, X, Copy, Check, Link as LinkIcon, Plus } from 'lucide-react';
import SkillChart from '@/components/SkillChart';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { resolveGeminiModel } from '@/lib/geminiModel';
import { API_BASE_URL } from '@/lib/api';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  description: string;
  tags: string[];
  postedAt: string;
}

interface CVHistory {
  id: number;
  file_name: string;
  created_at: string;
}

interface MatchResult {
  score: number;
  feedback: string;
  strengths: string[];
  gaps: string[];
  skillData: Array<{ subject: string; A: number; fullMark: number }>;
  coverLetter: string;
}

// No mock jobs needed anymore

function JobMatcherContent() {
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [cvHistory, setCvHistory] = useState<CVHistory[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<string>('last');
  const [activeCvName, setActiveCvName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [externalJD, setExternalJD] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCVHistory();
  }, []);

  const fetchCVHistory = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/history/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCvHistory(data);
      }
    } catch (error) {
      console.error("Lỗi tải lịch sử CV:", error);
    }
  };

  const checkMatch = async (job: Job) => {
    const username = localStorage.getItem('username') || 'guest';
    const apiKey = localStorage.getItem('gemini_api_key');
    let cvContent = '';

    setLoading(true);
    
    try {
      if (selectedCvId === 'last') {
        cvContent = localStorage.getItem(`last_cv_text_${username}`) || '';
        setActiveCvName("CV mới sử dụng gần nhất");
      } else {
        const token = localStorage.getItem('access_token');
        if (token) {
          const res = await fetch(`${API_BASE_URL}/history/${selectedCvId}/`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            cvContent = data.extracted_text;
            setActiveCvName(data.file_name || `CV #${selectedCvId}`);
          } else {
            throw new Error("Không thể tải nội dung CV từ máy chủ.");
          }
        }
      }

      if (!cvContent) {
        alert("Không tìm thấy nội dung CV. Vui lòng kiểm tra lại bản CV đã chọn.");
        setLoading(false);
        return;
      }

      if (!apiKey) {
        alert("Vui lòng cấu hình API Key trong phần cài đặt.");
        setLoading(false);
        return;
      }

      setMatchingId(job.id);
      setMatchResult(null);

      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = await resolveGeminiModel(apiKey, 'flash');
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { 
          responseMimeType: 'application/json' 
        }
      });

      const prompt = `
        Bạn là một hệ thống tuyển dụng thông minh. Hãy so khớp CV của ứng viên với Mô tả công việc (JD) sau đây.
        
        NỘI DUNG CV: ${cvContent}
        JD CÔNG VIỆC: ${job.title} tại ${job.company}. Mô tả: ${job.description}
 
        Hãy trả về kết quả dưới dạng JSON với cấu trúc sau:
        {
          "score": number (0-100),
          "feedback": "Nhận xét ngắn gọn khoảng 2 câu về mức độ phù hợp.",
          "strengths": ["Điểm mạnh 1", "Điểm mạnh 2", ...],
          "gaps": ["Kỹ năng còn thiếu 1", "Kỹ năng còn thiếu 2", ...],
          "skillData": [
            {"subject": "Technical", "A": number (0-100), "fullMark": 100},
            {"subject": "Soft Skills", "A": number (0-100), "fullMark": 100},
            {"subject": "Experience", "A": number (0-100), "fullMark": 100},
            {"subject": "Education", "A": number (0-100), "fullMark": 100},
            {"subject": "Tools", "A": number (0-100), "fullMark": 100}
          ],
          "coverLetter": "Một bản nháp thư xin việc (Cover Letter) chuyên nghiệp dựa trên mẫu sau đây. Hãy điền các thông tin từ CV và JD vào các phần trong ngoặc []:\n\nChủ đề email: Ứng tuyển vị trí [Tên vị trí] – [Họ tên]\n\nChào Anh/Chị [Tên người tuyển dụng hoặc ghi chung là Anh/Chị nếu không rõ],\n\nEm là [Họ tên], hiện đang [làm việc tại Công ty/theo học tại Trường].\n\nEm biết đến thông tin tuyển dụng vị trí [Tên vị trí] của công ty mình qua [Nguồn tuyển dụng], và xin phép được gửi email ứng tuyển.\n\nVề kinh nghiệm, [Nếu có kinh nghiệm: em đã có X năm kinh nghiệm trong lĩnh vực Y, từng làm việc tại Z với vai trò W. Ngoài ra, em có khả năng K... / Nếu là fresher: em tập trung vào chuyên ngành học A, các dự án dự án tiêu biểu như B, C và các kỹ năng D, E].\n\nTrong quá trình học tập/làm việc, em đã có cơ hội tham gia các dự án như:\n- [Tên dự án 1 - mô tả ngắn]\n- [Tên dự án 2 - mô tả ngắn]\n\nNgoài ra, em có kỹ năng [liệt kê kỹ năng phù hợp] và từng tham gia [hoạt động ngoại khóa/thực tập].\n\nHồ sơ ứng tuyển của em bao gồm CV và Portfolio/Chứng chỉ đi kèm.\n\nEm rất mong có cơ hội được trao đổi thêm với Anh/Chị trong buổi phỏng vấn. Chị có thể liên hệ với em qua email này hoặc số điện thoại [Số ĐT trong CV].\n\nMong sớm nhận được phản hồi từ Anh/Chị.\n\nTrân trọng,\n[Họ tên]"
        }
        
        LƯU Ý: Tuyệt đối tuân thủ văn phong chuyên nghiệp nhưng gần gũi, không dùng 'Dear anh/chị'. Trả về kết quả bằng tiếng Việt.
      `;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });
      
      const text = result.response.text();
      const data = JSON.parse(text);
      if (data.coverLetter) {
        data.coverLetter = data.coverLetter.normalize('NFC');
      }
      setMatchResult(data);
    } catch (error) {
      console.error(error);
      alert("Lỗi khi so khớp việc làm.");
    } finally {
      setLoading(false);
    }
  };

  const handleExternalMatch = async () => {
    if (!externalJD.trim()) return;
    
    const fakeJob: Job = {
      id: 'external',
      title: 'Công việc tùy chỉnh',
      company: 'Nguồn ngoài (LinkedIn/URL)',
      location: 'Tùy chọn',
      salary: 'Thỏa thuận',
      type: 'Tùy chọn',
      description: externalJD,
      tags: ['Custom'],
      postedAt: 'Ngay bây giờ'
    };
    
    await checkMatch(fakeJob);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-32 pb-32 px-8">
      <Navbar />
      <main className="max-w-6xl mx-auto space-y-12">
        <header className="space-y-4 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gradient">AI JD Analyzer</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Dán mô tả công việc (JD) bạn tìm thấy trên LinkedIn, TopCV... để LexiAI phân tích độ phù hợp và soạn hồ sơ ứng tuyển.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* JD Input Area */}
          <div className="lg:col-span-7 space-y-6">
            <div className="glass p-8 border-accent/20 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg text-accent">
                  <FileText size={24} />
                </div>
                <h3 className="font-bold text-xl">Mô tả công việc (JD)</h3>
              </div>

              {/* CV Selector */}
              {cvHistory.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Chọn CV để so khớp</label>
                  <select 
                    value={selectedCvId}
                    onChange={(e) => setSelectedCvId(e.target.value)}
                    className="w-full bg-muted/50 border border-glass-border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-accent transition-all text-sm"
                  >
                    <option value="last">CV mới sử dụng gần nhất</option>
                    {cvHistory.map(cv => (
                      <option key={cv.id} value={cv.id}>
                        {cv.file_name} ({new Date(cv.created_at).toLocaleDateString('vi-VN')})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <textarea 
                value={externalJD}
                onChange={(e) => setExternalJD(e.target.value)}
                placeholder="Dán nội dung mô tả công việc từ LinkedIn, TopCV, Indeed hoặc bất cứ nguồn nào tại đây..."
                className="w-full h-[500px] bg-muted/30 border border-glass-border rounded-2xl p-6 focus:outline-none focus:ring-1 focus:ring-accent resize-none transition-all text-sm leading-relaxed"
              />

              <AnimatePresence>
                {externalJD.trim().startsWith('http') && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3"
                  >
                    <AlertCircle className="text-amber-600 shrink-0" size={20} />
                    <div className="text-sm leading-relaxed text-foreground/90">
                      <span className="font-bold text-amber-700">Lưu ý quan trọng:</span> 
                      <span> Bạn đang dán một liên kết. LexiAI hiện tại không thể tự truy cập vào link để đọc nội dung. </span>
                      <br className="hidden md:block" />
                      <span className="font-bold">Để có kết quả tốt nhất, hãy </span>
                      <span className="font-black underline decoration-2 underline-offset-4 text-accent decoration-accent/30">
                        copy toàn bộ văn bản mô tả công việc
                      </span> 
                      <span> và dán trực tiếp vào ô phía trên.</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                onClick={handleExternalMatch}
                disabled={loading || !externalJD.trim()}
                className="w-full py-5 premium-gradient rounded-2xl font-bold text-white shadow-xl hover-glow transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
              >
                {loading ? <RefreshCw className="animate-spin" size={24} /> : <Zap size={24} />}
                {loading ? 'Đang phân tích...' : 'Bắt đầu so khớp với CV'}
              </button>
            </div>

            <div className="glass p-6 border-accent/10 bg-accent/5 flex items-center gap-4">
              <div className="p-3 bg-accent/20 rounded-xl text-accent">
                <Sparkles size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-foreground">Mẹo tối ưu</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">Kết quả sẽ chính xác nhất nếu bạn dán đầy đủ các phần: Yêu cầu công việc, Kỹ năng cần thiết và Mô tả nhiệm vụ.</p>
              </div>
            </div>
          </div>

          {/* Match Analysis */}
          <div className="lg:col-span-5">
            <div className="sticky top-40 space-y-6">
              <div className="glass p-8 space-y-8 border-accent/20">
                {!matchingId ? (
                  <div className="text-center py-20 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground opacity-20">
                      <Briefcase size={32} />
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-muted-foreground italic">Dán mô tả công việc để AI phân tích độ phù hợp với CV của bạn.</p>
                  </div>
                ) : (
                  <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                            <Sparkles size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">AI Analysis</h3>
                            {activeCvName && (
                              <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">Dựa trên: {activeCvName}</p>
                            )}
                          </div>
                        </div>
                        {matchResult && <div className="text-2xl font-black text-gradient">{matchResult.score}%</div>}
                      </div>

                    {loading ? (
                      <div className="py-12 flex flex-col items-center gap-4">
                        <div className="relative">
                          <RefreshCw className="animate-spin text-accent" size={40} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">LexiAI đang tính toán...</p>
                      </div>
                    ) : matchResult ? (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        {/* Radar Chart */}
                        <div className="bg-muted/30 rounded-2xl p-4 border border-glass-border">
                          <SkillChart data={matchResult.skillData} />
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 size={18} />
                              <span className="text-sm font-bold uppercase tracking-wider">Điểm mạnh</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {matchResult.strengths.map((s, i) => (
                                <span key={i} className="text-xs bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-400/20">{s}</span>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                              <AlertCircle size={18} />
                              <span className="text-sm font-bold uppercase tracking-wider">Cần cải thiện</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {matchResult.gaps.map((g, i) => (
                                <span key={i} className="text-xs bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-lg border border-amber-400/20">{g}</span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="pt-6 border-t border-glass-border space-y-4">
                          <button 
                            onClick={() => setShowCoverLetter(true)}
                            className="w-full py-4 bg-accent text-white rounded-xl font-bold shadow-lg hover:shadow-accent/40 transition-all flex items-center justify-center gap-2"
                          >
                            <FileText size={18} /> Soạn Cover Letter với AI
                          </button>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <button className="py-3 bg-glass border border-glass-border rounded-xl text-xs font-bold flex flex-col items-center gap-2 hover:bg-muted transition-all">
                              <Zap size={18} className="text-yellow-400" />
                              Luyện phỏng vấn
                            </button>
                            <button className="py-3 bg-glass border border-glass-border rounded-xl text-xs font-bold flex flex-col items-center gap-2 hover:bg-muted transition-all">
                              <GraduationCap size={18} className="text-blue-400" />
                              Xem Roadmap
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="py-12 flex flex-col items-center gap-2 text-red-400">
                        <AlertCircle size={32} />
                        <p className="text-sm font-bold">Không thể tải dữ liệu.</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Tips Card */}
              <div className="glass p-6 border-accent/10 bg-accent/5">
                <div className="flex gap-4">
                  <div className="p-3 bg-accent/20 rounded-xl text-accent h-fit">
                    <Sparkles size={24} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground">Mẹo nhỏ</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">Cập nhật CV thường xuyên với các dự án mới nhất để AI có thể đưa ra gợi ý việc làm chính xác hơn 40%.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Cover Letter Modal */}
      <AnimatePresence>
        {showCoverLetter && matchResult && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowCoverLetter(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-3xl glass max-h-[80vh] overflow-hidden flex flex-col shadow-2xl border-accent/20"
            >
              <div className="p-6 border-b border-glass-border flex items-center justify-between bg-accent/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-lg text-accent">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">AI Generated Cover Letter</h3>
                    <p className="text-xs text-muted-foreground">Tối ưu cho mô tả công việc bạn đã cung cấp</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCoverLetter(false)}
                  className="p-2 hover:bg-muted rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 leading-relaxed text-foreground/90 whitespace-pre-wrap selection:bg-accent/30">
                {matchResult.coverLetter}
              </div>

              <div className="p-6 border-t border-glass-border bg-muted/30 flex flex-col md:flex-row gap-4 items-center justify-between">
                <p className="text-xs text-muted-foreground italic">Bạn có thể chỉnh sửa nội dung này trước khi gửi cho nhà tuyển dụng.</p>
                <div className="flex gap-3 w-full md:w-auto">
                  <button 
                    onClick={() => copyToClipboard(matchResult.coverLetter)}
                    className="flex-1 md:flex-none px-6 py-3 bg-glass border border-glass-border rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-muted transition-all"
                  >
                    {copied ? <><Check size={18} className="text-emerald-400" /> Đã sao chép</> : <><Copy size={18} /> Sao chép</>}
                  </button>
                  <button className="flex-1 md:flex-none px-8 py-3 premium-gradient rounded-xl font-bold text-white shadow-lg hover-glow transition-all">
                    Tải PDF
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function JobMatcherPage() {
  const [userKey, setUserKey] = useState<string | null>(null);

  useEffect(() => {
    setUserKey(localStorage.getItem('username') || 'guest');
  }, []);

  if (userKey === null) return null;

  return (
    <JobMatcherContent key={userKey} />
  );
}

