'use client';

import React, { useState } from 'react';

interface APIConfigModalProps {
  onClose: () => void;
  onSave: (key: string) => void;
}

export default function APIConfigModal({ onClose, onSave }: APIConfigModalProps) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (key.length < 20) {
      setError('Vui lòng nhập Gemini API Key hợp lệ.');
      return;
    }
    localStorage.setItem('gemini_api_key', key);
    onSave(key);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
      <div className="w-full max-w-md bg-background border border-black/10 dark:border-white/10 p-8 shadow-2xl relative rounded-3xl max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          ✕
        </button>
        
        <h2 className="text-2xl font-bold mb-2 text-foreground">Cấu hình API</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Nhập <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-accent underline font-bold">Google Gemini API Key</a> để bắt đầu. 
          Khóa được lưu cục bộ và bảo mật.
        </p>

        <div className="mb-6 rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 aspect-video flex items-center justify-center">
          <video 
            className="w-full h-full object-cover"
            controls
            playsInline
          >
            <source src="/huong_dan_key.mp4" type="video/mp4" />
            Trình duyệt của bạn không hỗ trợ xem video.
          </video>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-muted-foreground">
              Khóa API Gemini
            </label>
            <input 
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-input border border-black/5 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            />
            {error && <p className="text-red-500 text-[10px] font-bold mt-2 uppercase">{error}</p>}
          </div>

          <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
            <p className="text-xs text-accent font-medium leading-relaxed">
              💡 <b>Mẹo:</b> Bạn có thể lấy khóa miễn phí cho Gemini Flash và Pro từ Google AI Studio.
            </p>
          </div>

          <button 
            onClick={handleSave}
            className="w-full py-4 premium-gradient text-white rounded-xl font-bold hover-glow transition-all shadow-lg shadow-accent/20"
          >
            Lưu và kết nối
          </button>
        </div>
      </div>
    </div>
  );
}
