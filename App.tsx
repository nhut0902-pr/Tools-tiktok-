
import React, { useState, useRef, useEffect } from 'react';
import { 
  FileUp, 
  Download, 
  CheckCircle2, 
  FileText, 
  Zap, 
  Trash2, 
  Video, 
  Link as LinkIcon, 
  Play, 
  Loader2, 
  FolderArchive, 
  Youtube, 
  Music, 
  Monitor, 
  ExternalLink,
  Github,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { PdfPage, OutputFormat, AppState } from './types.ts';

// Khai báo các thư viện từ CDN
declare const pdfjsLib: any;
declare const JSZip: any;

type AppMode = 'pdf' | 'tiktok' | 'youtube';

interface MediaData {
  url?: string;
  images?: string[];
  title?: string;
  author?: string;
  cover?: string;
  id?: string;
  formats?: { quality: string; url: string; type: 'video' | 'audio' }[];
}

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('pdf');
  const [state, setState] = useState<AppState>({
    isProcessing: false,
    pages: [],
    fileName: '',
    format: OutputFormat.PNG,
    quality: 0.95,
  });
  
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MediaData | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  useEffect(() => {
    // Khởi tạo PDF.js Worker
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  }, []);

  const resetPdfState = () => {
    setState({
      isProcessing: false,
      pages: [],
      fileName: '',
      format: OutputFormat.PNG,
      quality: 0.95,
    });
  };

  const processPdf = async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      alert('Vui lòng chọn file định dạng PDF.');
      return;
    }
    
    if (typeof pdfjsLib === 'undefined') {
      alert('Đang tải thư viện xử lý PDF, vui lòng đợi trong giây lát...');
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, fileName: file.name.replace('.pdf', ''), pages: [] }));
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      const loadedPages: PdfPage[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        // Scale cao (3.0) để ảnh cực nét
        const viewport = page.getViewport({ scale: 3.0 }); 
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({ 
            canvasContext: context, 
            viewport,
            intent: 'print' // Tối ưu cho chất lượng ảnh
          }).promise;
          
          const dataUrl = canvas.toDataURL(state.format, state.quality);
          loadedPages.push({
            index: i,
            dataUrl,
            width: viewport.width,
            height: viewport.height,
            selected: true
          });
        }
        
        // Cập nhật UI theo từng đợt để không bị treo trình duyệt
        if (i % 2 === 0 || i === numPages) {
          setState(prev => ({ ...prev, pages: [...loadedPages] }));
        }
      }
      
      setState(prev => ({ ...prev, isProcessing: false }));
    } catch (error) {
      console.error('Lỗi PDF:', error);
      alert('Không thể xử lý file PDF này. File có thể bị hỏng hoặc có mật khẩu.');
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const downloadAllPdf = async () => {
    const selectedPages = state.pages.filter(p => p.selected);
    if (selectedPages.length === 0) return;

    if (selectedPages.length === 1) {
      const link = document.createElement('a');
      link.href = selectedPages[0].dataUrl;
      link.download = `${state.fileName}_P${selectedPages[0].index}.${state.format === OutputFormat.PNG ? 'png' : 'jpg'}`;
      link.click();
      return;
    }

    setIsZipping(true);
    try {
      const zip = new JSZip();
      selectedPages.forEach((page) => {
        const imgData = page.dataUrl.split(',')[1];
        const ext = state.format === OutputFormat.PNG ? 'png' : 'jpg';
        zip.file(`${state.fileName}_Trang_${page.index}.${ext}`, imgData, { base64: true });
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${state.fileName}_Photos.zip`;
      link.click();
    } catch (err) {
      alert('Lỗi khi tạo file nén.');
    } finally {
      setIsZipping(false);
    }
  };

  const handleMediaDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl) return;
    setLoading(true);
    setResult(null);
    
    try {
      if (mode === 'tiktok') {
        const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(inputUrl)}`);
        const data = await response.json();
        if (data.code === 0) {
          setResult({
            url: data.data.play,
            images: data.data.images,
            title: data.data.title,
            author: data.data.author.nickname,
            cover: data.data.cover
          });
        } else {
          alert('Link không hợp lệ hoặc không có dữ liệu.');
        }
      } else if (mode === 'youtube') {
        const vidIdMatch = inputUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([^?&/]+)/);
        const vidId = vidIdMatch?.[1];
        if (vidId) {
          setResult({
            id: vidId,
            title: "YouTube Content",
            cover: `https://img.youtube.com/vi/${vidId}/maxresdefault.jpg`,
            formats: [
              { quality: 'Video MP4 (HD)', url: `https://api.vve.pw/api/button/mp4/${vidId}`, type: 'video' },
              { quality: 'Audio MP3', url: `https://api.vve.pw/api/button/mp3/${vidId}`, type: 'audio' }
            ]
          });
        }
      }
    } catch (e) {
      alert('Lỗi kết nối API.');
    } finally {
      setLoading(false);
    }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      processPdf(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfd] text-slate-900">
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-[100] transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.location.reload()}>
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-indigo-200 shadow-xl group-hover:rotate-12 transition-transform">
              <Layers size={22} strokeWidth={2.5} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">
                NHUTCODER <span className="text-indigo-600">TOOLBOX</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Version 6.0 Stable</p>
            </div>
          </div>

          <nav className="flex items-center bg-slate-100/80 p-1.5 rounded-2xl">
            {[
              { id: 'pdf', icon: <FileText size={18} />, label: 'PDF Conv' },
              { id: 'tiktok', icon: <Video size={18} />, label: 'TikTok' },
              { id: 'youtube', icon: <Youtube size={18} />, label: 'YouTube' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => { setMode(tab.id as AppMode); setResult(null); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {tab.icon}
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-12">
        {mode === 'pdf' ? (
          state.pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-700">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-black uppercase tracking-widest mb-6 border border-emerald-100">
                  <ShieldCheck size={14} /> Private & No AI Used
                </div>
                <h2 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight">
                  Chuyển PDF <br/><span className="text-indigo-600 underline decoration-indigo-100">Sang Ảnh</span>
                </h2>
                <p className="text-lg text-slate-500 max-w-xl mx-auto font-medium">
                  Chuyển đổi từng trang PDF thành hình ảnh chất lượng cao 4K trực tiếp trong trình duyệt. <br/>Dữ liệu của bạn không bao giờ rời khỏi thiết bị.
                </p>
              </div>

              <div 
                onDragEnter={onDrag} onDragLeave={onDrag} onDragOver={onDrag} onDrop={onDrop}
                className={`w-full max-w-3xl border-4 border-dashed rounded-[3rem] p-16 md:p-24 flex flex-col items-center justify-center cursor-pointer transition-all duration-500
                  ${dragActive ? 'border-indigo-500 bg-indigo-50/50 scale-[0.98]' : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-2xl shadow-sm'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && processPdf(e.target.files[0])} />
                <div className="bg-indigo-50 p-8 rounded-[2rem] text-indigo-600 mb-8 shadow-inner">
                  {state.isProcessing ? <Loader2 size={56} className="animate-spin" /> : <FileUp size={56} />}
                </div>
                <p className="text-2xl font-black text-slate-800 mb-2">
                  {state.isProcessing ? 'Đang trích xuất...' : 'Kéo thả file PDF tại đây'}
                </p>
                <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Hoặc nhấn để chọn từ thiết bị</p>
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom-10 duration-500">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 mb-10 flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-600 p-3.5 rounded-2xl text-white shadow-lg shadow-indigo-100">
                    <FileText size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 truncate max-w-[200px] md:max-w-md">{state.fileName}.pdf</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{state.pages.length} TRANG ĐÃ SẴN SÀNG</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                  <div className="bg-slate-50 p-1.5 rounded-2xl flex items-center gap-1">
                    <button onClick={() => setState(s => ({ ...s, format: OutputFormat.PNG }))} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${state.format === OutputFormat.PNG ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>PNG</button>
                    <button onClick={() => setState(s => ({ ...s, format: OutputFormat.JPG }))} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${state.format === OutputFormat.JPG ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>JPG</button>
                  </div>
                  <button 
                    onClick={downloadAllPdf} 
                    disabled={isZipping}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all shadow-lg disabled:opacity-50"
                  >
                    {isZipping ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                    TẢI XUỐNG ZIP
                  </button>
                  <button onClick={resetPdfState} className="p-4 bg-red-50 text-red-500 hover:bg-red-100 rounded-2xl transition-all">
                    <Trash2 size={24} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {state.pages.map((page) => (
                  <div key={page.index} className="group bg-white rounded-[2rem] border border-slate-100 hover:border-indigo-300 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-2xl">
                    <div className="aspect-[3/4.2] relative bg-slate-50 overflow-hidden">
                      <img src={page.dataUrl} className="w-full h-full object-contain p-2" alt={`Trang ${page.index}`} loading="lazy" />
                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <div className="absolute bottom-4 right-4 flex gap-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                         <button 
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = page.dataUrl;
                            link.download = `${state.fileName}_Trang_${page.index}.${state.format === OutputFormat.PNG ? 'png' : 'jpg'}`;
                            link.click();
                          }}
                          className="p-3 bg-white text-indigo-600 rounded-xl shadow-xl hover:bg-indigo-600 hover:text-white transition-all"
                         >
                            <Download size={20} />
                         </button>
                      </div>
                    </div>
                    <div className="p-5 flex items-center justify-between border-t border-slate-50">
                      <span className="font-black text-slate-800">Trang {page.index}</span>
                      <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center animate-in fade-in duration-700">
             <div className="text-center mb-12">
                <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 ${mode === 'tiktok' ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}>
                  {mode === 'tiktok' ? <Zap size={14} className="fill-indigo-600" /> : <Youtube size={14} className="fill-red-600" />}
                  {mode === 'tiktok' ? 'TikTok Downloader' : 'YouTube Downloader'}
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight uppercase">
                  Tải Nội Dung <br/><span className={mode === 'tiktok' ? 'text-indigo-600 underline decoration-indigo-100' : 'text-red-600 underline decoration-red-100'}>Tự Động</span>
                </h2>
              </div>

              <form onSubmit={handleMediaDownload} className="w-full max-w-2xl mb-12">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 group-focus-within:text-indigo-600 transition-colors">
                    <LinkIcon size={24} />
                  </div>
                  <input 
                    type="url" 
                    placeholder="Dán đường dẫn (Link) tại đây..."
                    className="block w-full pl-16 pr-44 py-7 bg-white border-2 border-slate-100 rounded-3xl focus:ring-8 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none text-slate-800 font-bold text-lg shadow-xl shadow-slate-200/50"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    required
                  />
                  <button 
                    type="submit"
                    disabled={loading}
                    className="absolute right-3 top-3 bottom-3 bg-slate-900 text-white px-8 rounded-2xl hover:bg-indigo-600 transition-all font-black flex items-center gap-2 disabled:opacity-50 shadow-lg"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} className="fill-white" />}
                    <span>Xử Lý</span>
                  </button>
                </div>
              </form>

              {result && (
                <div className="w-full max-w-4xl bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                  <div className="p-8 md:p-12 flex flex-col md:flex-row gap-12">
                    <div className="w-full md:w-[320px] shrink-0 aspect-video md:aspect-[9/16] bg-slate-900 rounded-3xl overflow-hidden relative shadow-2xl group">
                      {result.cover && <img src={result.cover} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Thumbnail" />}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 className="text-3xl font-black text-slate-900 mb-6 leading-tight">
                        {result.title || 'Đã tìm thấy nội dung'}
                      </h3>
                      <p className="text-slate-400 font-bold mb-8 flex items-center gap-2">
                        <CheckCircle2 className="text-emerald-500" size={20} /> Ready to Download
                      </p>

                      <div className="space-y-4">
                        {mode === 'tiktok' && result.images && result.images.length > 0 ? (
                          <button 
                            onClick={async () => {
                              setIsZipping(true);
                              const zip = new JSZip();
                              const promises = result.images!.map(async (url, i) => {
                                const resp = await fetch(url);
                                const blob = await resp.blob();
                                zip.file(`image_${i+1}.jpg`, blob);
                              });
                              await Promise.all(promises);
                              const content = await zip.generateAsync({type:'blob'});
                              const a = document.createElement('a');
                              a.href = URL.createObjectURL(content);
                              a.download = 'tiktok_images.zip';
                              a.click();
                              setIsZipping(false);
                            }}
                            disabled={isZipping}
                            className="w-full flex items-center justify-center gap-4 bg-indigo-600 text-white py-6 rounded-3xl font-black text-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                          >
                            <FolderArchive size={24} /> TẢI ZIP ẢNH ({result.images.length})
                          </button>
                        ) : result.url && (
                          <a href={result.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-4 bg-indigo-600 text-white py-6 rounded-3xl font-black text-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
                            <Download size={24} /> TẢI VIDEO NO WATERMARK
                          </a>
                        )}

                        {mode === 'youtube' && result.formats?.map((f, i) => (
                          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-between px-8 py-6 rounded-3xl font-black text-lg transition-all shadow-md hover:-translate-y-1 ${f.type === 'video' ? 'bg-slate-900 text-white hover:bg-indigo-600' : 'bg-slate-50 text-indigo-600 border border-indigo-100'}`}>
                            <div className="flex items-center gap-4">
                              {f.type === 'video' ? <Monitor size={24} /> : <Music size={24} />}
                              <span>{f.quality}</span>
                            </div>
                            <ExternalLink size={20} />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-100 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div className="flex flex-col gap-2">
            <span className="font-black text-xl text-slate-900 tracking-tighter">NHUTCODER TOOLBOX</span>
            <p className="text-slate-400 text-sm font-medium italic">An all-in-one local toolkit for daily tasks.</p>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/nhut0902-pr" target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 rounded-2xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all">
              <Github size={24} />
            </a>
            <div className="flex items-center gap-3 bg-indigo-50 px-5 py-3 rounded-2xl border border-indigo-100">
               <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-lg font-black shadow-md">N</div>
               <div className="flex flex-col text-left">
                  <p className="font-black text-indigo-900 text-sm leading-none">NHUTCODER</p>
                  <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Premium Tools</span>
               </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
