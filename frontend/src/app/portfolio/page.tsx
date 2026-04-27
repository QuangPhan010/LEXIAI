'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Sparkles, Code2, Layers, ListChecks, 
  ChevronRight, RefreshCw, Briefcase, ExternalLink, 
  Cpu, Layout, Database, BookOpen, ArrowRight, Zap,
  X, Copy, Check, Terminal, FolderTree, FileCode, Download
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { resolveGeminiModel } from '@/lib/geminiModel';

interface ProjectSuggestion {
  title: string;
  description: string;
  techStack: string[];
  relevance: string;
  userStories: string[];
  steps: string[];
}

interface TechnicalBlueprint {
  structure: string;
  setupCommands: string[];
  databaseSchema?: string;
  keySnippets: {
    filename: string;
    code: string;
    explanation: string;
  }[];
}

function PortfolioContent() {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectSuggestion[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectSuggestion | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Blueprint States
  const [showBlueprint, setShowBlueprint] = useState(false);
  const [blueprintLoading, setBlueprintLoading] = useState(false);
  const [blueprint, setBlueprint] = useState<TechnicalBlueprint | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    const username = localStorage.getItem('username') || 'guest';
    const savedProjects = localStorage.getItem(`last_portfolio_suggestions_${username}`);
    if (savedProjects) {
      try {
        setProjects(JSON.parse(savedProjects));
      } catch (e) {
        console.error("Lỗi parse dữ liệu dự án:", e);
      }
    }
  }, []);

  const generateProjects = async () => {
    const username = localStorage.getItem('username') || 'guest';
    const cvText = localStorage.getItem(`last_cv_text_${username}`);
    const roadmapText = localStorage.getItem(`last_roadmap_${username}`);
    const apiKey = localStorage.getItem('gemini_api_key');

    if (!cvText || !apiKey) {
      alert("Vui lòng tải lên CV và cấu hình API Key trước.");
      return;
    }

    setLoading(true);
    try {
      const modelType = localStorage.getItem('lexiai_model') || 'flash';
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = await resolveGeminiModel(apiKey, modelType === 'pro' ? 'pro' : 'flash');
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' }
      });

      const prompt = `
        Dựa trên nội dung CV và Lộ trình sự nghiệp sau đây, hãy gợi ý 3 dự án thực tế (Portfolio Projects) để ứng viên có thể thực hiện nhằm lấp đầy các lỗ hổng kỹ năng và đạt được mục tiêu sự nghiệp.
        
        NỘI DUNG CV: ${cvText}
        LỘ TRÌNH SỰ NGHIỆP: ${roadmapText || 'Chưa có lộ trình cụ thể, hãy dựa trên CV.'}
        
        Yêu cầu kết quả trả về bằng định dạng JSON là một mảng các đối tượng:
        [
          {
            "title": "Tên dự án ấn tượng",
            "description": "Mô tả ngắn gọn về bài toán dự án giải quyết",
            "techStack": ["Công nghệ 1", "Công nghệ 2"],
            "relevance": "Tại sao dự án này lại quan trọng cho sự nghiệp của ứng viên?",
            "userStories": ["Người dùng có thể làm gì 1", "Người dùng có thể làm gì 2"],
            "steps": ["Bước thực hiện 1", "Bước thực hiện 2", "Bước thực hiện 3"]
          }
        ]
        
        Ngôn ngữ: Tiếng Việt.
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsedProjects = JSON.parse(text);
      
      setProjects(parsedProjects);
      localStorage.setItem(`last_portfolio_suggestions_${username}`, JSON.stringify(parsedProjects));
      setSelectedProject(null);
    } catch (error: any) {
      console.error(error);
      alert(`Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateBlueprint = async (project: ProjectSuggestion) => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) return;

    setBlueprintLoading(true);
    setShowBlueprint(true);
    
    try {
      const modelType = localStorage.getItem('lexiai_model') || 'flash';
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = await resolveGeminiModel(apiKey, modelType === 'pro' ? 'pro' : 'flash');
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' }
      });

      const prompt = `
        Hãy tạo một bản thiết kế kỹ thuật (Technical Blueprint) chi tiết cho dự án sau đây:
        Tên dự án: ${project.title}
        Mô tả: ${project.description}
        Tech Stack: ${project.techStack.join(', ')}
        
        Yêu cầu kết quả trả về bằng định dạng JSON:
        {
          "structure": "Sơ đồ thư mục dạng text tree (VD: /src\\n  /components...)",
          "setupCommands": ["Lệnh cài đặt 1", "Lệnh cài đặt 2"],
          "databaseSchema": "Mô tả schema hoặc mã SQL/Prisma (nếu dự án cần DB)",
          "keySnippets": [
            {
              "filename": "Tên file (VD: UserAuth.tsx)",
              "code": "Mã nguồn minh họa cho tính năng cốt lõi",
              "explanation": "Giải thích ngắn gọn logic"
            }
          ]
        }
        
        Ngôn ngữ: Tiếng Việt.
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      setBlueprint(JSON.parse(text));
    } catch (error: any) {
      console.error(error);
      alert(`Lỗi khi tạo blueprint: ${error.message}`);
    } finally {
      setBlueprintLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const downloadBlueprint = () => {
    if (!blueprint || !selectedProject) return;

    const content = `
# BẢN THIẾT KẾ KỸ THUẬT: ${selectedProject.title}
Mô tả: ${selectedProject.description}
Tech Stack: ${selectedProject.techStack.join(', ')}

## 1. LỆNH CÀI ĐẶT
${blueprint.setupCommands.map(cmd => `$ ${cmd}`).join('\n')}

## 2. CẤU TRÚC THƯ MỤC GỢI Ý
\`\`\`
${blueprint.structure}
\`\`\`

## 3. THIẾT KẾ CƠ SỞ DỮ LIỆU
${blueprint.databaseSchema || 'N/A'}

## 4. ĐOẠN MÃ QUAN TRỌNG
${blueprint.keySnippets.map(snippet => `
### File: ${snippet.filename}
*Giải thích: ${snippet.explanation}*
\`\`\`
${snippet.code}
\`\`\`
`).join('\n')}

---
Tạo bởi LEXIAI - AI Career Assistant
    `.trim();

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Blueprint_${selectedProject.title.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!mounted) return null;

  return (
    <div className="bg-background text-foreground pt-32 pb-32 px-8">
      <Navbar />
      <main className="max-w-6xl mx-auto space-y-12">
        <header className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-2">
            <Layers size={32} />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-gradient">Xây dựng Portfolio Thực chiến</h1>
          <p className="text-muted-foreground max-w-2xl text-lg">AI phân tích lỗ hổng kỹ năng để gợi ý những dự án giúp bạn bứt phá sự nghiệp.</p>
          
          {projects.length > 0 && !loading && (
            <button 
              onClick={generateProjects}
              className="mt-4 flex items-center gap-2 text-sm font-bold text-accent hover:underline"
            >
              <RefreshCw size={14} /> Làm mới gợi ý
            </button>
          )}
        </header>

        {projects.length === 0 && !loading ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto glass p-12 text-center space-y-8"
          >
            <div className="space-y-4">
              <Sparkles size={48} className="text-accent mx-auto animate-pulse" />
              <h2 className="text-2xl font-bold">Sẵn sàng để "đắp" thêm kinh nghiệm?</h2>
              <p className="text-muted-foreground">Chúng tôi sẽ dựa vào CV và Lộ trình của bạn để thiết kế những dự án mang tính thực chiến cao nhất.</p>
            </div>
            <button 
              onClick={generateProjects}
              className="w-full py-5 premium-gradient rounded-2xl font-bold text-xl shadow-xl hover-glow transition-all flex items-center justify-center gap-3"
            >
              <Rocket size={24} /> Bắt đầu tạo ý tưởng dự án
            </button>
          </motion.div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-8">
            <div className="relative w-24 h-24">
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-4 border-t-accent border-r-transparent border-b-white/10 border-l-transparent"
              />
              <div className="absolute inset-4 rounded-full bg-accent/20 flex items-center justify-center">
                <Code2 size={24} className="text-accent animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Đang thiết kế dự án...</h2>
              <p className="text-muted-foreground animate-pulse">AI đang tính toán các bài toán phù hợp với Roadmap của bạn.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Project List */}
            <div className="lg:col-span-5 space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground mb-4">Dự án được đề xuất</h3>
              {projects.map((project, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setSelectedProject(project)}
                  className={`glass p-6 cursor-pointer transition-all border-l-4 ${
                    selectedProject?.title === project.title 
                    ? 'border-l-accent bg-accent/5' 
                    : 'border-l-transparent hover:border-l-accent/50'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-2">
                      <h4 className="font-bold text-lg leading-tight">{project.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {project.techStack.slice(0, 3).map((tech, i) => (
                          <span key={i} className="text-[10px] font-bold px-2 py-0.5 bg-white/5 border border-white/10 rounded-full">
                            {tech}
                          </span>
                        ))}
                        {project.techStack.length > 3 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 opacity-50">+{project.techStack.length - 3}</span>
                        )}
                      </div>
                    </div>
                    <div className={`p-2 rounded-lg ${selectedProject?.title === project.title ? 'bg-accent text-white' : 'bg-white/5'}`}>
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </motion.div>
              ))}

              <div className="glass p-6 bg-accent/5 border-accent/20">
                <h4 className="font-bold flex items-center gap-2 text-accent mb-2">
                  <Zap size={18} /> Tại sao cần Portfolio?
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Nhà tuyển dụng luôn ưu tiên những ứng viên có dự án thực tế. Việc xây dựng dự án theo lộ trình giúp bạn vừa học vừa hành, đồng thời có sản phẩm cụ thể để trình bày trong buổi phỏng vấn.
                </p>
              </div>
            </div>

            {/* Project Details */}
            <div className="lg:col-span-7">
              <AnimatePresence mode="wait">
                {selectedProject ? (
                  <motion.div
                    key={selectedProject.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="glass p-10 space-y-10 min-h-[600px] border-accent/20 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Rocket size={120} />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-widest">
                        <Code2 size={14} /> Gợi ý dự án chi tiết
                      </div>
                      <h2 className="text-4xl font-black text-gradient">{selectedProject.title}</h2>
                      <p className="text-muted-foreground text-lg">{selectedProject.description}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h4 className="font-bold flex items-center gap-2"><Cpu size={18} className="text-accent" /> Công nghệ sử dụng</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedProject.techStack.map((tech, i) => (
                            <span key={i} className="px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-xl text-xs font-bold text-accent">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-bold flex items-center gap-2"><Briefcase size={18} className="text-accent" /> Giá trị sự nghiệp</h4>
                        <p className="text-sm text-zinc-400 italic leading-relaxed">{selectedProject.relevance}</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="font-bold flex items-center gap-2"><ListChecks size={18} className="text-accent" /> Tính năng chính (User Stories)</h4>
                        <div className="grid grid-cols-1 gap-3">
                          {selectedProject.userStories.map((story, i) => (
                            <div key={i} className="flex gap-3 items-start bg-white/5 p-4 rounded-xl border border-white/10">
                              <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                                <div className="w-2 h-2 rounded-full bg-accent" />
                              </div>
                              <span className="text-sm">{story}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-bold flex items-center gap-2"><BookOpen size={18} className="text-accent" /> Các bước triển khai</h4>
                        <div className="space-y-4 relative pl-8 before:content-[''] before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-accent/20">
                          {selectedProject.steps.map((step, i) => (
                            <div key={i} className="relative">
                              <div className="absolute -left-8 top-1 w-4 h-4 rounded-full bg-background border-2 border-accent z-10" />
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-accent uppercase tracking-tighter">Bước {i + 1}</span>
                                <p className="text-sm text-foreground">{step}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-white/10 flex justify-end">
                      <button 
                        onClick={() => generateBlueprint(selectedProject)}
                        className="flex items-center gap-2 px-8 py-4 premium-gradient rounded-2xl font-bold text-lg shadow-xl hover-glow transition-all group"
                      >
                        Bắt đầu ngay <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 glass p-10 border-dashed border-2">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <ArrowRight size={32} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold">Chọn một dự án</h4>
                      <p className="text-muted-foreground max-w-xs mx-auto">Chọn danh sách bên trái để xem chi tiết lộ trình thực hiện dự án đó.</p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* Technical Blueprint Overlay */}
      <AnimatePresence>
        {showBlueprint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-background border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowBlueprint(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-all z-10"
              >
                <X size={24} />
              </button>

              <div className="p-10 border-b border-white/5 premium-gradient">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Terminal className="text-white" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Bản thiết kế kỹ thuật</h2>
                </div>
                <p className="text-white/70 text-sm">Hướng dẫn chi tiết để bạn triển khai dự án {selectedProject?.title}.</p>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                {blueprintLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-6">
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-12 h-12 border-4 border-t-accent border-white/10 rounded-full"
                    />
                    <div className="text-center">
                      <p className="font-bold">AI đang soạn thảo Blueprint...</p>
                      <p className="text-sm text-muted-foreground">Phân tích cấu trúc thư mục và viết code minh họa.</p>
                    </div>
                  </div>
                ) : blueprint ? (
                  <>
                    {/* Setup Commands */}
                    <section className="space-y-4">
                      <h3 className="text-lg font-bold flex items-center gap-2"><Terminal size={20} className="text-accent" /> Lệnh cài đặt</h3>
                      <div className="bg-muted p-4 rounded-xl border border-white/5 font-mono text-sm space-y-2 relative group">
                        {blueprint.setupCommands.map((cmd, i) => (
                          <div key={i} className="flex justify-between items-center gap-4">
                            <span className="text-accent">$ {cmd}</span>
                            <button 
                              onClick={() => handleCopy(cmd, i)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
                            >
                              {copiedIndex === i ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Folder Structure */}
                    <section className="space-y-4">
                      <h3 className="text-lg font-bold flex items-center gap-2"><FolderTree size={20} className="text-accent" /> Cấu trúc thư mục gợi ý</h3>
                      <pre className="bg-zinc-950 p-6 rounded-xl border border-white/5 font-mono text-xs leading-relaxed text-zinc-300 overflow-x-auto">
                        {blueprint.structure}
                      </pre>
                    </section>

                    {/* Database Schema */}
                    {blueprint.databaseSchema && (
                      <section className="space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2"><Database size={20} className="text-accent" /> Thiết kế Cơ sở dữ liệu</h3>
                        <pre className="bg-zinc-950 p-6 rounded-xl border border-white/5 font-mono text-xs leading-relaxed text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                          {blueprint.databaseSchema}
                        </pre>
                      </section>
                    )}

                    {/* Key Code Snippets */}
                    <section className="space-y-6">
                      <h3 className="text-lg font-bold flex items-center gap-2"><FileCode size={20} className="text-accent" /> Đoạn mã quan trọng</h3>
                      {blueprint.keySnippets.map((snippet, i) => (
                        <div key={i} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-foreground">{snippet.filename}</span>
                              <span className="text-xs text-muted-foreground">{snippet.explanation}</span>
                            </div>
                            <button 
                              onClick={() => handleCopy(snippet.code, i + 100)}
                              className="p-2 hover:bg-white/10 rounded-lg transition-all"
                            >
                              {copiedIndex === i + 100 ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                          </div>
                          <pre className="bg-zinc-950 p-6 rounded-xl border border-white/5 font-mono text-[11px] leading-relaxed text-zinc-300 overflow-x-auto">
                            {snippet.code}
                          </pre>
                        </div>
                      ))}
                    </section>
                  </>
                ) : null}
              </div>

              <div className="p-8 bg-muted/50 border-t border-white/5 flex justify-end gap-4">
                <button 
                  onClick={() => setShowBlueprint(false)}
                  className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all"
                >
                  Đóng
                </button>
                <button 
                  onClick={downloadBlueprint}
                  className="px-8 py-3 premium-gradient rounded-xl font-bold shadow-lg hover-glow transition-all flex items-center gap-2"
                >
                  <Download size={18} /> Tải file Markdown (.md)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PortfolioPage() {
  const [userKey, setUserKey] = useState<string | null>(null);

  useEffect(() => {
    setUserKey(localStorage.getItem('username') || 'guest');
  }, []);

  if (userKey === null) return null;

  return (
    <PortfolioContent key={userKey} />
  );
}
