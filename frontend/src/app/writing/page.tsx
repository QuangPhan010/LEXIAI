'use client';

import React, { useState } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Sparkles, Copy, RefreshCw, FileText, Mail, FileCheck, Check, Link, MessageSquare } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { resolveGeminiModel } from '@/lib/geminiModel';

const templates = [
  { 
    id: 'cv-rewrite', 
    name: 'Viết lại CV', 
    icon: <FileText size={18} />, 
    prompt: "Hãy viết lại gạch đầu dòng kinh nghiệm sau trong CV theo hướng nhấn mạnh thành tích và bổ sung số liệu định lượng (%, $, số cụ thể) nếu có thể. Văn phong cần ngắn gọn, chuyên nghiệp. Chỉ trả về kết quả bằng tiếng Việt. Nội dung: "
  },
  { 
    id: 'linkedin', 
    name: 'LinkedIn Profile', 
    icon: <Link size={18} />, 
    prompt: "Hãy viết một phần giới thiệu LinkedIn (About) hoặc tiêu đề (Headline) ấn tượng dựa trên thông tin sau. Làm nổi bật giá trị cốt lõi và thương hiệu cá nhân. Chỉ trả về kết quả bằng tiếng Việt. Chi tiết: "
  },
  { 
    id: 'cover-letter', 
    name: 'Thư xin việc', 
    icon: <FileCheck size={18} />, 
    prompt: "Hãy viết một thư xin việc thuyết phục dựa trên thông tin sau. Làm rõ kỹ năng nổi bật và điều chỉnh theo chuẩn ngành. Chỉ trả về kết quả bằng tiếng Việt. Chi tiết: "
  },
  { 
    id: 'email', 
    name: 'Email/Follow-up', 
    icon: <Mail size={18} />, 
    prompt: "Hãy soạn một email (xin việc, cảm ơn sau phỏng vấn, hoặc hỏi kết quả) chuyên nghiệp dựa trên bối cảnh sau. Chỉ trả về kết quả bằng tiếng Việt. Bối cảnh: "
  }
];

const tones = [
  { id: 'professional', name: 'Chuyên nghiệp', description: 'Trang trọng, chuẩn mực' },
  { id: 'confident', name: 'Tự tin', description: 'Mạnh mẽ, quyết đoán' },
  { id: 'friendly', name: 'Thân thiện', description: 'Cởi mở, gần gũi' },
  { id: 'creative', name: 'Sáng tạo', description: 'Độc đáo, mới lạ' }
];

export default function WritingAssistant() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(templates[0]);
  const [activeTone, setActiveTone] = useState(tones[0]);

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const handleGenerate = async () => {
    const apiKey = localStorage.getItem('gemini_api_key');
    const modelType = localStorage.getItem('lexiai_model') || 'flash';
    
    if (!apiKey) {
      alert("Vui lòng cài đặt API Key trên thanh điều hướng trước.");
      return;
    }

    setLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = await resolveGeminiModel(apiKey, modelType === 'pro' ? 'pro' : 'flash');
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { }
      });
      
      const fullPrompt = `${activeTemplate.prompt}${input}\n\nYêu cầu phong cách: Sử dụng tông giọng ${activeTone.name} (${activeTone.description}).\nYêu cầu ngôn ngữ: Chỉ trả về tiếng Việt, không dùng tiếng Anh trừ từ viết tắt chuyên ngành bắt buộc.`;
      
      let fullText = "";
      const result = await model.generateContentStream(fullPrompt);
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        setOutput(fullText);
      }
    } catch (error: any) {
      console.error(error);
      alert(`Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-background text-foreground pt-28 md:pt-32 pb-24 px-5 md:px-8">
      <Navbar />

      <main className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col items-center text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-gradient">Trợ lý viết bằng AI</h1>
          <p className="text-muted-foreground text-sm font-medium">Chọn mẫu và tông giọng phù hợp để Gemini tạo bản nháp tối ưu cho bạn.</p>
        </header>

        {/* Templates Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => setActiveTemplate(tpl)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                activeTemplate.id === tpl.id 
                ? 'premium-gradient border-transparent shadow-lg text-white' 
                : 'glass border-black/5 dark:border-white/10 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {tpl.icon}
              <span className="text-xs font-bold">{tpl.name}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls & Tone */}
          <div className="lg:col-span-4 space-y-6">
            <div className="glass p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <MessageSquare size={16} /> Chọn tông giọng
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {tones.map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => setActiveTone(tone)}
                    className={`flex flex-col p-3 rounded-xl border transition-all text-left ${
                      activeTone.id === tone.id 
                      ? 'bg-accent/20 border-accent text-accent' 
                      : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                  >
                    <span className="font-bold text-sm">{tone.name}</span>
                    <span className="text-[10px] opacity-80 dark:opacity-60">{tone.description}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="glass p-6">
               <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Gợi ý cách dùng</h3>
               <p className="text-xs text-zinc-500 leading-relaxed italic">
                 Dán nội dung thô, gạch đầu dòng hoặc bối cảnh cần viết. Ví dụ: "Tôi có 2 năm kinh nghiệm React, muốn xin việc tại TechCorp."
               </p>
            </div>
          </div>

          {/* Main Input/Output Area */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[600px]">
            {/* Input */}
            <div className="glass p-6 space-y-4 flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nội dung đầu vào</label>
                <button onClick={() => setInput('')} className="text-[10px] text-muted-foreground hover:text-accent transition-all underline">Xóa</button>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Nhập thông tin cho mẫu "${activeTemplate.name}"...`}
                className="flex-1 bg-input border border-black/5 dark:border-white/10 rounded-xl p-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none placeholder:text-muted-foreground"
              />
              <button
                onClick={handleGenerate}
                disabled={loading || !input}
                className="w-full py-4 premium-gradient rounded-xl font-bold flex items-center justify-center gap-2 hover-glow transition-all disabled:opacity-50"
              >
                {loading ? <RefreshCw size={20} className="animate-spin" /> : <Sparkles size={20} />}
                {loading ? 'AI đang viết...' : 'Tạo nội dung'}
              </button>
            </div>

            {/* Output */}
            <div className="glass p-6 space-y-4 flex flex-col border-accent/20">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-accent">Kết quả từ AI</label>
                {output && (
                  <button onClick={copyToClipboard} className="flex items-center gap-1.5 text-[10px] text-zinc-300 hover:text-white transition-all bg-white/5 px-2 py-1 rounded">
                    {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    {copied ? 'Đã sao chép!' : 'Sao chép'}
                  </button>
                )}
              </div>
              <div className="flex-1 bg-input border border-black/5 dark:border-white/5 rounded-xl p-4 text-sm text-foreground font-medium leading-relaxed overflow-y-auto whitespace-pre-wrap custom-scrollbar">
                {output || <span className="opacity-20 italic">Kết quả sẽ hiển thị tại đây...</span>}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
