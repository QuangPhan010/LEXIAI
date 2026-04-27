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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { API_BASE_URL } from '@/lib/api';
import { FileText, Calendar, Clock } from 'lucide-react';

interface ProjectSuggestion {
  title: string;
  description: string;
  toolsAndSkills: string[];
  relevance: string;
  userStories: string[];
  steps: string[];
}

interface TechnicalBlueprint {
  implementationGuide: string;
  preRequisites: string[];
  dataDesign?: string;
  keyDeliverables: {
    title: string;
    content: string;
    explanation: string;
  }[];
}

interface CVHistory {
  id: number;
  file_name: string;
  extracted_text: string;
  created_at: string;
  score: number;
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
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // CV History States
  const [cvHistory, setCvHistory] = useState<CVHistory[]>([]);
  const [selectedCV, setSelectedCV] = useState<CVHistory | null>(null);
  const [isSelectingCV, setIsSelectingCV] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchCVHistory();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const username = localStorage.getItem('username') || 'guest';
    let storageKey = `last_portfolio_suggestions_${username}`;
    
    if (selectedCV) {
      storageKey = `last_portfolio_suggestions_${username}_cv_${selectedCV.id}`;
    }

    const savedProjects = localStorage.getItem(storageKey);
    if (savedProjects) {
      try {
        setProjects(JSON.parse(savedProjects));
      } catch (e) {
        console.error("Lỗi parse dữ liệu dự án:", e);
        setProjects([]);
      }
    } else {
      setProjects([]);
    }
    setSelectedProject(null);
  }, [selectedCV, mounted]);

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
        if (data.length > 0) {
          // Default to the most recent one
          setSelectedCV(data[0]);
        }
      }
    } catch (error) {
      console.error("Lỗi tải lịch sử CV:", error);
    }
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const generateProjects = async () => {
    const username = localStorage.getItem('username') || 'guest';
    const cvText = selectedCV ? selectedCV.extracted_text : localStorage.getItem(`last_cv_text_${username}`);
    const roadmapText = localStorage.getItem(`last_roadmap_${username}`);
    const apiKey = localStorage.getItem('gemini_api_key');

    if (!cvText || !apiKey) {
      alert("Vui lòng tải lên CV (hoặc chọn CV từ lịch sử) và cấu hình API Key trước.");
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
        Bạn là một chuyên gia tư vấn sự nghiệp đa ngành. Dựa trên nội dung CV và Lộ trình sự nghiệp sau đây, hãy gợi ý 3 dự án thực hành (Portfolio Projects) phù hợp với chuyên môn của ứng viên (có thể là IT, Kế toán, Marketing, Quản trị, v.v.) để ứng viên có thể thực hiện nhằm lấp đầy các lỗ hổng kỹ năng và đạt được mục tiêu sự nghiệp.
        
        NỘI DUNG CV: ${cvText}
        LỘ TRÌNH SỰ NGHIỆP: ${roadmapText || 'Chưa có lộ trình cụ thể, hãy dựa trên CV.'}
        
        Yêu cầu kết quả trả về bằng định dạng JSON là một mảng các đối tượng:
        [
          {
            "title": "Tên dự án ấn tượng và chuyên nghiệp",
            "description": "Mô tả ngắn gọn về bài toán thực tế mà dự án giải quyết",
            "toolsAndSkills": ["Công cụ 1", "Kỹ năng 1", "Công nghệ 1"],
            "relevance": "Tại sao dự án này lại quan trọng cho sự nghiệp và giúp ích gì cho mục tiêu của ứng viên?",
            "userStories": ["Mục tiêu/Tính năng 1", "Mục tiêu/Tính năng 2"],
            "steps": ["Bước thực hiện 1", "Bước thực hiện 2", "Bước thực hiện 3"]
          }
        ]
        
        Lưu ý: Nếu ứng viên không thuộc ngành IT, hãy gợi ý các dự án mang tính nghiệp vụ chuyên môn (VD: Kế toán: báo cáo quản trị; Quản trị: tối ưu quy trình; Marketing: chiến dịch truyền thông).
        Ngôn ngữ: Tiếng Việt.
      `;

      let aiResponseText = "";
      let retries = 0;
      const maxRetries = 5;
      while (retries < maxRetries) {
        try {
          const result = await model.generateContent(prompt);
          aiResponseText = result.response.text();
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
      
      const parsedProjects = JSON.parse(aiResponseText);
      setProjects(parsedProjects);
      
      let storageKey = `last_portfolio_suggestions_${username}`;
      if (selectedCV) {
        storageKey = `last_portfolio_suggestions_${username}_cv_${selectedCV.id}`;
      }
      localStorage.setItem(storageKey, JSON.stringify(parsedProjects));
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
        Hãy tạo một bản kế hoạch triển khai chi tiết (Detailed Implementation Plan) cho dự án sau đây:
        Tên dự án: ${project.title}
        Mô tả: ${project.description}
        Công cụ & Kỹ năng: ${(project.toolsAndSkills || []).join(', ')}
        
        Yêu cầu kết quả trả về bằng định dạng JSON:
        {
          "implementationGuide": "Hướng dẫn cấu trúc/tổ chức dự án hoặc sơ đồ quy trình thực hiện",
          "preRequisites": ["Bước chuẩn bị 1", "Công cụ cần cài đặt/có sẵn 1"],
          "dataDesign": "Mô tả cách quản lý dữ liệu, các bảng tính, hoặc cơ sở dữ liệu cần thiết",
          "keyDeliverables": [
            {
              "title": "Tên thành phần (VD: File báo cáo, Đoạn mã logic, Biểu mẫu)",
              "content": "Nội dung chi tiết (Mã nguồn nếu là IT, Công thức/Mẫu nếu là ngành khác)",
              "explanation": "Giải thích vai trò của thành phần này"
            }
          ]
        }
        
        Lưu ý: 
        - Nếu là ngành IT: content là mã nguồn (Code).
        - Nếu là ngành khác (Kế toán, Kinh doanh...): content là các công thức Excel, quy trình chi tiết, hoặc mẫu văn bản.
        Ngôn ngữ: Tiếng Việt.
      `;

      let aiResponseText = "";
      let retries = 0;
      const maxRetries = 5;
      while (retries < maxRetries) {
        try {
          const result = await model.generateContent(prompt);
          aiResponseText = result.response.text();
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

      setBlueprint(JSON.parse(aiResponseText));
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

  const downloadAsMD = () => {
    if (!blueprint || !selectedProject) return;

    const content = `
# KẾ HOẠCH TRIỂN KHAI CHI TIẾT: ${selectedProject.title}
Mô tả: ${selectedProject.description}
Công cụ & Kỹ năng: ${(selectedProject.toolsAndSkills || []).join(', ')}

## 1. CÁC BƯỚC CHUẨN BỊ
${(blueprint.preRequisites || []).map(item => `- ${item}`).join('\n')}

## 2. HƯỚNG DẪN TỔ CHỨC & TRIỂN KHAI
\`\`\`
${blueprint.implementationGuide}
\`\`\`

## 3. THIẾT KẾ DỮ LIỆU & THÔNG TIN
${blueprint.dataDesign || 'N/A'}

## 4. CÁC THÀNH PHẦN CỐT LÕI
${(blueprint.keyDeliverables || []).map(item => `
### ${item.title}
*Giải thích: ${item.explanation}*
\`\`\`
${item.content}
\`\`\`
`).join('\n')}

---
Tạo bởi LEXIAI - AI Career Assistant
    `.trim();

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LexiAI_${selectedProject.title.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const downloadAsPDF = async () => {
    if (!blueprint || !selectedProject) return;
    const element = document.getElementById('blueprint-content');
    if (!element) return;

    setBlueprintLoading(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0a0a0a',
        scrollY: -window.scrollY, // Ensure capture starts from the top
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('blueprint-content');
          if (clonedElement) {
            clonedElement.style.height = 'auto';
            clonedElement.style.maxHeight = 'none';
            clonedElement.style.overflow = 'visible';
            clonedElement.style.padding = '40px';
          }
          // Fix for "oklab" unsupported color error in html2canvas
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * { 
              color: #ffffff !important;
              border-color: rgba(255, 255, 255, 0.1) !important;
              box-sizing: border-box !important;
            }
            #blueprint-content {
              background-color: #0a0a0a !important;
              width: 1000px !important; /* Force a stable width for capture */
            }
            h1, h2, h3, h4, .text-gradient { 
              color: #6366f1 !important; 
              background: none !important;
              -webkit-text-fill-color: #6366f1 !important;
            }
            .text-muted-foreground { color: #a1a1aa !important; }
            .bg-accent { background-color: #6366f1 !important; }
            .text-accent { color: #6366f1 !important; }
            .bg-muted { background-color: #1a1a1a !important; }
            pre, code { background-color: #050505 !important; border-color: #333 !important; white-space: pre-wrap !important; }
            .glass { background-color: rgba(255, 255, 255, 0.03) !important; backdrop-filter: none !important; }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pdfWidth;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Subsequent pages if content is long
      while (heightLeft > 0) {
        position -= pdfHeight; // Move the content up for the next page
        pdf.addPage();
        // Fill background for new page
        pdf.setFillColor(10, 10, 10);
        pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`LexiAI_${selectedProject.title.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("Lỗi xuất PDF:", error);
      alert("Không thể xuất PDF. Vui lòng thử lại.");
    } finally {
      setBlueprintLoading(false);
      setShowExportMenu(false);
    }
  };

  const downloadAsDOC = () => {
    if (!blueprint || !selectedProject) return;

    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Export DOC</title></head><body>
    `;
    const footer = "</body></html>";
    const content = `
      <h1>KẾ HOẠCH TRIỂN KHAI CHI TIẾT: ${selectedProject.title}</h1>
      <p><strong>Mô tả:</strong> ${selectedProject.description}</p>
      <p><strong>Công cụ & Kỹ năng:</strong> ${(selectedProject.toolsAndSkills || []).join(', ')}</p>
      
      <h2>1. CÁC BƯỚC CHUẨN BỊ</h2>
      <ul>
        ${(blueprint.preRequisites || []).map(item => `<li>${item}</li>`).join('')}
      </ul>
      
      <h2>2. HƯỚNG DẪN TỔ CHỨC & TRIỂN KHAI</h2>
      <pre style="background: #f4f4f4; padding: 10px; border: 1px solid #ddd;">${blueprint.implementationGuide}</pre>
      
      <h2>3. THIẾT KẾ DỮ LIỆU & THÔNG TIN</h2>
      <p>${blueprint.dataDesign || 'N/A'}</p>
      
      <h2>4. CÁC THÀNH PHẦN CỐT LÕI</h2>
      ${(blueprint.keyDeliverables || []).map(item => `
        <h3>${item.title}</h3>
        <p><i>Giải thích: ${item.explanation}</i></p>
        <pre style="background: #f4f4f4; padding: 10px; border: 1px solid #ddd;">${item.content}</pre>
      `).join('')}
      
      <hr/>
      <p>Tạo bởi LEXIAI - AI Career Assistant</p>
    `;

    const source = header + content + footer;
    const blob = new Blob([source], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LexiAI_${selectedProject.title.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  if (!mounted) return null;

  return (
    <div className="bg-background text-foreground pt-32 pb-32 px-8">
      <Navbar />
      <main className="max-w-6xl mx-auto space-y-12">
        <header className="max-w-4xl mx-auto text-center space-y-4 mb-20 relative">
          <div className="w-16 h-16 rounded-3xl bg-accent/10 flex items-center justify-center text-accent mx-auto mb-6">
            <Layers size={32} />
          </div>
          
          <h1 className="text-6xl font-black tracking-tighter">Xây dựng Portfolio <span className="text-gradient">Thực chiến</span></h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">AI phân tích lỗ hổng kỹ năng để gợi ý những dự án giúp bạn bứt phá sự nghiệp.</p>
          
          {projects.length > 0 && !loading && (
            <div className="flex justify-center gap-6">
              <button 
                onClick={generateProjects}
                className="flex items-center gap-2 text-xs font-bold text-accent hover:underline"
              >
                <RefreshCw size={14} /> Làm mới gợi ý
              </button>
              <button 
                onClick={() => {
                  setProjects([]);
                  setSelectedProject(null);
                }}
                className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-accent hover:underline"
              >
                <ArrowRight size={14} className="rotate-180" /> Thay đổi CV khác
              </button>
            </div>
          )}
        </header>

        {projects.length === 0 && !loading ? (
          <div className="space-y-8">
            {/* CV Selector Section */}
            {cvHistory.length > 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto glass p-6 border-accent/20"
              >
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold">Chọn CV để phân tích Portfolio</h3>
                      <p className="text-xs text-muted-foreground">Bạn có {cvHistory.length} CV trong lịch sử. Hãy chọn CV phù hợp nhất.</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-center">
                    {cvHistory.slice(0, 3).map((cv) => (
                      <button
                        key={cv.id}
                        onClick={() => setSelectedCV(cv)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                          selectedCV?.id === cv.id 
                          ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20' 
                          : 'bg-white/5 border-white/10 hover:border-accent/50'
                        }`}
                      >
                        <div className="flex flex-col items-start gap-1">
                          <span className="truncate max-w-[120px]">{cv.file_name}</span>
                          <span className="opacity-50 text-[10px] font-normal">{new Date(cv.created_at).toLocaleDateString()}</span>
                        </div>
                      </button>
                    ))}
                    {cvHistory.length > 3 && (
                      <button 
                        onClick={() => setIsSelectingCV(true)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                      >
                        Xem tất cả...
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="max-w-2xl mx-auto glass p-12 text-center space-y-8"
            >
              <div className="space-y-4">
                <Sparkles size={48} className="text-accent mx-auto animate-pulse" />
                <h2 className="text-2xl font-bold">Sẵn sàng để "đắp" thêm kinh nghiệm?</h2>
                <p className="text-muted-foreground">
                  Chúng tôi sẽ dựa vào {selectedCV ? `CV "${selectedCV.file_name}"` : 'CV'} và Lộ trình của bạn để thiết kế những dự án mang tính thực chiến cao nhất.
                </p>
              </div>
              <button 
                onClick={generateProjects}
                className="w-full py-5 premium-gradient rounded-2xl font-bold text-xl shadow-xl hover-glow transition-all flex items-center justify-center gap-3"
              >
                <Rocket size={24} /> Bắt đầu tạo ý tưởng dự án
              </button>
            </motion.div>
          </div>
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
                        {(project.toolsAndSkills || []).slice(0, 3).map((tech, i) => (
                          <span key={i} className="text-[10px] font-bold px-2 py-0.5 bg-white/5 border border-white/10 rounded-full">
                            {tech}
                          </span>
                        ))}
                        {(project.toolsAndSkills || []).length > 3 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 opacity-50">+{(project.toolsAndSkills || []).length - 3}</span>
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
                        <Rocket size={14} /> Gợi ý dự án chi tiết
                      </div>
                      <h2 className="text-4xl font-black text-gradient">{selectedProject.title}</h2>
                      <p className="text-muted-foreground text-lg">{selectedProject.description}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h4 className="font-bold flex items-center gap-2"><Sparkles size={18} className="text-accent" /> Công cụ & Kỹ năng</h4>
                        <div className="flex flex-wrap gap-2">
                          {(selectedProject.toolsAndSkills || []).map((tech, i) => (
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
                          {(selectedProject.userStories || []).map((story, i) => (
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
                          {(selectedProject.steps || []).map((step, i) => (
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

      {/* CV Selection Modal */}
      <AnimatePresence>
        {isSelectingCV && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-background/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-background border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
            >
              <button 
                onClick={() => setIsSelectingCV(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-all z-10"
              >
                <X size={24} />
              </button>

              <div className="p-8 border-b border-white/5">
                <h2 className="text-2xl font-bold">Lịch sử CV của bạn</h2>
                <p className="text-muted-foreground text-sm">Chọn một CV để làm cơ sở gợi ý Portfolio.</p>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-3 max-h-[60vh] custom-scrollbar">
                {cvHistory.map((cv) => (
                  <button
                    key={cv.id}
                    onClick={() => {
                      setSelectedCV(cv);
                      setIsSelectingCV(false);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${
                      selectedCV?.id === cv.id 
                      ? 'bg-accent/10 border-accent' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedCV?.id === cv.id ? 'bg-accent text-white' : 'bg-white/10 text-muted-foreground'}`}>
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{cv.file_name}</h4>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(cv.created_at).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Clock size={10} /> {new Date(cv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="font-bold text-accent">Điểm: {cv.score}</span>
                        </div>
                      </div>
                    </div>
                    {selectedCV?.id === cv.id && <div className="w-2 h-2 rounded-full bg-accent" />}
                  </button>
                ))}
              </div>

              <div className="p-6 bg-muted/50 border-t border-white/5 flex justify-end">
                <button 
                  onClick={() => setIsSelectingCV(false)}
                  className="px-8 py-3 premium-gradient rounded-xl font-bold transition-all"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    <Rocket className="text-white" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Kế hoạch triển khai chi tiết</h2>
                </div>
                <p className="text-white/70 text-sm">Chi tiết các bước và tài sản để bạn triển khai dự án {selectedProject?.title}.</p>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar" id="blueprint-content">
                {blueprintLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-6">
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-12 h-12 border-4 border-t-accent border-white/10 rounded-full"
                    />
                    <div className="text-center">
                      <p className="font-bold">AI đang soạn thảo kế hoạch...</p>
                      <p className="text-sm text-muted-foreground">Phân tích cấu trúc và chuẩn bị nội dung chi tiết cho bạn.</p>
                    </div>
                  </div>
                ) : blueprint ? (
                  <>
                    {/* Setup Commands */}
                    <section className="space-y-4">
                      <h3 className="text-lg font-bold flex items-center gap-2"><Rocket size={20} className="text-accent" /> Các bước chuẩn bị</h3>
                      <div className="bg-muted p-4 rounded-xl border border-white/5 font-mono text-sm space-y-2 relative group">
                        {(blueprint.preRequisites || []).map((cmd, i) => (
                          <div key={i} className="flex justify-between items-center gap-4">
                            <span className="text-accent">• {cmd}</span>
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
                      <h3 className="text-lg font-bold flex items-center gap-2"><Layers size={20} className="text-accent" /> Cấu trúc & Tổ chức</h3>
                      <pre className="bg-zinc-950 p-6 rounded-xl border border-white/5 font-mono text-xs leading-relaxed text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                        {blueprint.implementationGuide}
                      </pre>
                    </section>

                    {/* Database Schema */}
                    {blueprint.dataDesign && (
                      <section className="space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2"><Database size={20} className="text-accent" /> Thiết kế Dữ liệu & Thông tin</h3>
                        <pre className="bg-zinc-950 p-6 rounded-xl border border-white/5 font-mono text-xs leading-relaxed text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                          {blueprint.dataDesign}
                        </pre>
                      </section>
                    )}

                    {/* Key Code Snippets */}
                    <section className="space-y-6">
                      <h3 className="text-lg font-bold flex items-center gap-2"><Sparkles size={20} className="text-accent" /> Nội dung cốt lõi</h3>
                      {(blueprint.keyDeliverables || []).map((item, i) => (
                        <div key={i} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-foreground">{item.title}</span>
                              <span className="text-xs text-muted-foreground">{item.explanation}</span>
                            </div>
                            <button 
                              onClick={() => handleCopy(item.content, i + 100)}
                              className="p-2 hover:bg-white/10 rounded-lg transition-all"
                            >
                              {copiedIndex === i + 100 ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                          </div>
                          <pre className="bg-zinc-950 p-6 rounded-xl border border-white/5 font-mono text-[11px] leading-relaxed text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                            {item.content}
                          </pre>
                        </div>
                      ))}
                    </section>
                  </>
                ) : null}
              </div>

              <div className="p-8 bg-muted/50 border-t border-white/5 flex justify-end gap-4 relative">
                <button 
                  onClick={() => setShowBlueprint(false)}
                  className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all"
                >
                  Đóng
                </button>
                
                <div className="relative">
                  <button 
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="px-8 py-3 premium-gradient rounded-xl font-bold shadow-lg hover-glow transition-all flex items-center gap-2"
                  >
                    <Download size={18} /> Tải xuống bản thiết kế
                  </button>

                  <AnimatePresence>
                    {showExportMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full right-0 mb-4 w-48 glass border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50"
                      >
                        <div className="p-2 space-y-1">
                          <button 
                            onClick={downloadAsPDF}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 rounded-xl transition-all text-sm font-medium"
                          >
                            <span className="w-8 h-8 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center text-[10px] font-bold">PDF</span>
                            Adobe PDF (.pdf)
                          </button>
                          <button 
                            onClick={downloadAsDOC}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 rounded-xl transition-all text-sm font-medium"
                          >
                            <span className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center text-[10px] font-bold">DOC</span>
                            MS Word (.doc)
                          </button>
                          <button 
                            onClick={downloadAsMD}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 rounded-xl transition-all text-sm font-medium"
                          >
                            <span className="w-8 h-8 rounded-lg bg-zinc-500/20 text-zinc-400 flex items-center justify-center text-[10px] font-bold">MD</span>
                            Markdown (.md)
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
