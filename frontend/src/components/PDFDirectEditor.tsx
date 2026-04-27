'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Download, X, Zap, ChevronLeft, ChevronRight, Search, Edit3 } from 'lucide-react';

// Initialize PDF.js worker using local file in public folder
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface Suggestion {
  text: string;
  problem: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
}

interface PDFDirectEditorProps {
  file: File;
  suggestions: Suggestion[];
  onClose: () => void;
}

interface TextMarker {
  id: number;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  suggestion: Suggestion;
  isApplied: boolean;
}

export default function PDFDirectEditor({ file, suggestions, onClose }: PDFDirectEditorProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [markers, setMarkers] = useState<TextMarker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<TextMarker | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [modifiedPdfBytes, setModifiedPdfBytes] = useState<Uint8Array | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load PDF and map suggestions
  useEffect(() => {
    const loadPdf = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        
        // Initial mapping of suggestions
        await mapSuggestions(pdf, suggestions);
      } catch (error) {
        console.error("Error loading PDF:", error);
      } finally {
        setIsProcessing(false);
      }
    };

    loadPdf();
  }, [file, suggestions]);

  // Re-render canvas when page changes
  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage);
    }
  }, [currentPage, pdfDoc, markers]);

  const mapSuggestions = async (pdf: pdfjsLib.PDFDocumentProxy, suggestions: Suggestion[]) => {
    const foundMarkers: TextMarker[] = [];
    let idCounter = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.5 }); // Use a standard scale for mapping

      suggestions.forEach((sug) => {
        // Simple string matching for now. In a real app, we'd use fuzzy matching or semantic search
        const searchText = sug.text.toLowerCase().trim();
        
        // Find text items that contain our target text
        // This is a simplified approach; multi-line text is trickier
        textContent.items.forEach((item: any) => {
          if ('str' in item && item.str.toLowerCase().includes(searchText)) {
            const [scaleX, skewX, skewY, scaleY, tx, ty] = item.transform;
            
            // Convert PDF coordinates to viewport coordinates
            const [x, y] = viewport.convertToViewportPoint(tx, ty);
            
            foundMarkers.push({
              id: idCounter++,
              pageIndex: i,
              x: x,
              y: y - (item.height * viewport.scale), // Adjust Y to be top-left
              width: item.width * viewport.scale,
              height: item.height * viewport.scale,
              suggestion: sug,
              isApplied: false
            });
          }
        });
      });
    }

    setMarkers(foundMarkers);
  };

  const renderPage = async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    };

    await page.render(renderContext).promise;
  };

  const applySuggestion = async (marker: TextMarker) => {
    setIsProcessing(true);
    try {
      const existingPdfBytes = modifiedPdfBytes || await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
      // Need to register fontkit for custom fonts if needed, but for now StandardFonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const pages = pdfDoc.getPages();
      const targetPage = pages[marker.pageIndex - 1];
      const { height: pageHeight } = targetPage.getSize();

      // In pdf-lib, (0,0) is bottom-left
      // Our marker coordinates are from PDF.js viewport (top-left)
      // Need to convert carefully.
      
      // Let's get the original PDF units, not viewport units
      const pdfPage = await (await pdfjsLib.getDocument({ data: existingPdfBytes }).promise).getPage(marker.pageIndex);
      const pdfViewport = pdfPage.getViewport({ scale: 1 }); // 1:1 scale
      
      // Map marker suggestion text back to PDF coordinates
      // This is the tricky part - mapping viewport coords back to PDF units
      const scale = 1.5; // Our rendering scale
      const pdfX = marker.x / scale;
      const pdfY = pageHeight - (marker.y / scale) - (marker.height / scale);

      // 1. Draw white box to cover old text
      targetPage.drawRectangle({
        x: pdfX,
        y: pdfY,
        width: marker.width / scale,
        height: marker.height / scale,
        color: rgb(1, 1, 1),
      });

      // 2. Draw new text
      targetPage.drawText(marker.suggestion.suggestion, {
        x: pdfX,
        y: pdfY + 2, // Minor adjustment
        size: (marker.height / scale) * 0.8,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.4), // Dark blue for modified text
      });

      const pdfBytes = await pdfDoc.save();
      setModifiedPdfBytes(pdfBytes);
      
      // Update local markers
      setMarkers(prev => prev.map(m => m.id === marker.id ? { ...m, isApplied: true } : m));
      setSelectedMarker(null);
      
      // Re-load pdfjsDoc from modified bytes to update preview
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const newPdf = await loadingTask.promise;
      setPdfDoc(newPdf);

    } catch (error) {
      console.error("Error applying suggestion:", error);
      alert("Lỗi khi áp dụng thay đổi.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!modifiedPdfBytes) return;
    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LexiAI_Edited_${file.name}`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-zinc-950/90 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
            <X size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold">Chỉnh sửa trực tiếp trên PDF</h2>
            <p className="text-xs text-zinc-500">Tìm thấy {markers.length} vị trí có thể tối ưu</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownload}
            disabled={!modifiedPdfBytes}
            className="flex items-center gap-2 px-4 py-2 premium-gradient rounded-lg text-sm font-bold shadow-lg hover-glow transition-all disabled:opacity-50"
          >
            <Download size={16} /> Tải file đã sửa
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Suggestions */}
        <div className="w-80 border-r border-white/10 bg-black/10 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Gợi ý từ AI</h3>
          {markers.map((marker) => (
            <motion.div
              key={marker.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                setCurrentPage(marker.pageIndex);
                setSelectedMarker(marker);
              }}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedMarker?.id === marker.id 
                  ? 'bg-accent/10 border-accent shadow-lg shadow-accent/10' 
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              } ${marker.isApplied ? 'opacity-50 grayscale' : ''}`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                  marker.suggestion.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                  marker.suggestion.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {marker.suggestion.severity}
                </span>
                {marker.isApplied && <Zap size={14} className="text-accent" />}
              </div>
              <p className="text-xs text-zinc-400 line-clamp-2 mb-2 italic">"{marker.suggestion.text}"</p>
              <p className="text-sm font-bold text-zinc-100">{marker.suggestion.suggestion}</p>
            </motion.div>
          ))}
          {markers.length === 0 && !isProcessing && (
            <div className="text-center py-10 opacity-50">
              <Search size={32} className="mx-auto mb-2" />
              <p className="text-sm">Không tìm thấy vị trí khớp chính xác trên PDF.</p>
            </div>
          )}
        </div>

        {/* PDF Viewer Area */}
        <div className="flex-1 relative bg-zinc-900 overflow-auto flex flex-col items-center p-8 custom-scrollbar">
          <div className="relative inline-block" ref={containerRef}>
            <canvas ref={canvasRef} className="shadow-2xl rounded-sm" />
            
            {/* Markers Layer */}
            {markers.filter(m => m.pageIndex === currentPage).map(marker => (
              <motion.div
                key={marker.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSelectedMarker(marker)}
                className={`absolute cursor-pointer rounded-sm border-2 transition-all ${
                  selectedMarker?.id === marker.id 
                    ? 'border-accent bg-accent/20 ring-4 ring-accent/10' 
                    : marker.isApplied ? 'border-green-500/50 bg-green-500/10' : 'border-accent/40 bg-accent/5 hover:border-accent'
                }`}
                style={{
                  left: marker.x,
                  top: marker.y,
                  width: marker.width,
                  height: marker.height
                }}
              >
                {!marker.isApplied && (
                  <div className="absolute -top-6 -right-6 w-12 h-12 flex items-center justify-center">
                    <div className="w-3 h-3 bg-accent rounded-full animate-ping" />
                    <div className="absolute w-2 h-2 bg-accent rounded-full" />
                  </div>
                )}
              </motion.div>
            ))}

            {/* Selection Popup */}
            <AnimatePresence>
              {selectedMarker && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute z-20 bg-zinc-900 border border-white/10 p-4 rounded-xl shadow-2xl w-64"
                  style={{
                    left: selectedMarker.x + selectedMarker.width / 2,
                    top: selectedMarker.y + selectedMarker.height + 10,
                    transform: 'translateX(-50%)'
                  }}
                >
                  <h4 className="text-xs font-bold uppercase text-zinc-500 mb-2">Thay thế bằng:</h4>
                  <p className="text-sm font-bold text-zinc-100 mb-4">{selectedMarker.suggestion.suggestion}</p>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => applySuggestion(selectedMarker)}
                      disabled={isProcessing || selectedMarker.isApplied}
                      className="flex-1 py-2 bg-accent text-white rounded-lg text-xs font-bold hover:bg-accent/90 transition-all disabled:opacity-50"
                    >
                      {selectedMarker.isApplied ? 'Đã áp dụng' : 'Áp dụng ngay'}
                    </button>
                    <button
                      onClick={() => setSelectedMarker(null)}
                      className="px-3 py-2 bg-white/5 text-zinc-400 rounded-lg text-xs hover:bg-white/10 transition-all"
                    >
                      Hủy
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-4 z-50">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-1 hover:bg-white/10 rounded-full disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-xs font-bold">
              Trang {currentPage} / {numPages}
            </span>
            <button 
              disabled={currentPage === numPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-1 hover:bg-white/10 rounded-full disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-t-accent border-white/10 rounded-full animate-spin mb-4" />
          <p className="text-sm font-bold animate-pulse">Đang xử lý PDF...</p>
        </div>
      )}
    </div>
  );
}
