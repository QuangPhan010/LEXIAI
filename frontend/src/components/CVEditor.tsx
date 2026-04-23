'use client';

import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { motion, AnimatePresence } from 'framer-motion';
import { Bold, Italic, List, ListOrdered, Download, Save, Undo, Redo, Sparkles, RefreshCw, Sun, Moon, Layout, FileText as FileIcon } from 'lucide-react';
import { useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { resolveGeminiModel } from '@/lib/geminiModel';

interface CVEditorProps {
  initialContent: string;
}

export default function CVEditor({ initialContent }: CVEditorProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [template, setTemplate] = useState<'dark' | 'light' | 'modern'>('dark');
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Bắt đầu chỉnh sửa CV của bạn...',
      }),
    ],
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'focus:outline-none prose max-w-none min-h-[500px] p-8 transition-all duration-300',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    
    const isDark = template === 'dark';
    editor.setOptions({
      editorProps: {
        attributes: {
          class: `focus:outline-none prose max-w-none min-h-[500px] p-8 transition-all duration-300 ${
            isDark ? 'prose-invert text-zinc-100' : 'text-zinc-900'
          }`,
        },
      },
    });
  }, [template, editor]);

  const handleAiOptimize = async () => {
    if (!editor || isOptimizing) return;

    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      alert("Vui lòng cài đặt API Key.");
      return;
    }

    const currentContent = editor.getText();
    if (!currentContent || currentContent.length < 50) {
      alert("Nội dung quá ngắn để tối ưu.");
      return;
    }

    setIsOptimizing(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = await resolveGeminiModel(apiKey, 'pro');
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = `
        Bạn là một chuyên gia viết CV chuyên nghiệp. 
        Hãy tối ưu hóa nội dung CV sau đây để làm nổi bật thành tựu, sử dụng các động từ mạnh (action verbs) và bổ sung các số liệu định lượng giả định nếu cần thiết để tăng tính thuyết phục.
        Giữ cấu trúc mạch lạc, chuyên nghiệp. 
        Chỉ trả về nội dung CV đã được tối ưu bằng tiếng Việt, không thêm lời dẫn.
        
        NỘI DUNG CV HIỆN TẠI:
        ${currentContent}
      `;

      const result = await model.generateContent(prompt);
      const optimizedText = result.response.text();
      
      // Update editor with HTML structure if possible, or just text
      // For simplicity, we replace everything
      editor.commands.setContent(optimizedText);
    } catch (error) {
      console.error("Lỗi tối ưu AI:", error);
      alert("Không thể tối ưu bằng AI lúc này.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const exportToPDF = async () => {
    if (!editor) return;
    const element = document.querySelector('.tiptap') as HTMLElement;
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: template === 'dark' ? '#09090b' : '#ffffff',
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          const el = clonedDoc.querySelector('.tiptap') as HTMLElement;
          if (el) {
            el.style.color = template === 'dark' ? '#ffffff' : '#000000';
            el.style.padding = '20px';
            const allElements = clonedDoc.getElementsByTagName('*');
            for (let i = 0; i < allElements.length; i++) {
              const item = allElements[i] as HTMLElement;
              const style = window.getComputedStyle(item);
              if (style.color.includes('lab') || style.color.includes('oklch')) {
                item.style.color = template === 'dark' ? '#ffffff' : '#000000';
              }
              if (style.backgroundColor.includes('lab') || style.backgroundColor.includes('oklch')) {
                item.style.backgroundColor = 'transparent';
              }
            }
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`LexiAI_CV_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error("Lỗi xuất PDF:", error);
      alert("Không thể xuất PDF.");
    }
  };

  if (!editor) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass border-white/10 overflow-hidden flex flex-col h-full"
    >
      {/* Toolbar */}
      <div className="bg-white/5 border-b border-white/10 p-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-white/10 transition-all ${editor.isActive('bold') ? 'text-accent bg-accent/10' : 'text-zinc-400'}`}
          >
            <Bold size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-white/10 transition-all ${editor.isActive('italic') ? 'text-accent bg-accent/10' : 'text-zinc-400'}`}
          >
            <Italic size={18} />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-white/10 transition-all ${editor.isActive('bulletList') ? 'text-accent bg-accent/10' : 'text-zinc-400'}`}
          >
            <List size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-white/10 transition-all ${editor.isActive('orderedList') ? 'text-accent bg-accent/10' : 'text-zinc-400'}`}
          >
            <ListOrdered size={18} />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button
            onClick={() => editor.chain().focus().undo().run()}
            className="p-2 rounded hover:bg-white/10 text-zinc-400"
          >
            <Undo size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            className="p-2 rounded hover:bg-white/10 text-zinc-400"
          >
            <Redo size={18} />
          </button>
          
          <div className="w-px h-4 bg-white/10 mx-2" />
          
          <button
            onClick={handleAiOptimize}
            disabled={isOptimizing}
            className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg text-accent text-xs font-bold hover:bg-accent/20 transition-all disabled:opacity-50"
          >
            {isOptimizing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {isOptimizing ? 'Đang tối ưu...' : 'Tối ưu bằng AI'}
          </button>
          
          <div className="w-px h-4 bg-white/10 mx-2" />
          
          <div className="flex items-center bg-white/5 rounded-lg p-1 gap-1">
            <button 
              onClick={() => setTemplate('dark')}
              className={`p-1.5 rounded transition-all ${template === 'dark' ? 'bg-accent/20 text-accent' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Giao diện Tối"
            >
              <Moon size={14} />
            </button>
            <button 
              onClick={() => setTemplate('light')}
              className={`p-1.5 rounded transition-all ${template === 'light' ? 'bg-accent/20 text-accent' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Giao diện Sáng (Khuyên dùng cho ATS)"
            >
              <Sun size={14} />
            </button>
            <button 
              onClick={() => setTemplate('modern')}
              className={`p-1.5 rounded transition-all ${template === 'modern' ? 'bg-accent/20 text-accent' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Giao diện Hiện đại"
            >
              <Layout size={14} />
            </button>
          </div>
        </div>

        <button
          onClick={exportToPDF}
          className="flex items-center gap-2 px-4 py-2 premium-gradient rounded-lg text-sm font-bold shadow-lg hover-glow transition-all"
        >
          <Download size={16} /> Xuất PDF
        </button>
      </div>

      {/* Editor Content */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar transition-all duration-500 ${
        template === 'dark' ? 'bg-zinc-950/30' : 
        template === 'light' ? 'bg-white' : 
        'bg-slate-50'
      }`}>
        <div className={template !== 'dark' ? 'editor-light' : ''}>
          <EditorContent editor={editor} className={
            template === 'modern' ? 'font-serif' : ''
          } />
        </div>
      </div>
    </motion.div>
  );
}
