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
import { PdfPage, OutputFormat, AppState } from './types';

// Thư viện global từ CDN
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
    const initWorker = () => {
      if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      } else {
        setTimeout(initWorker, 500);
      }
    };
    initWorker();
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
      alert('Vui lòng chọn file PDF.');
      return;
    }
    
    if (typeof pdfjsLib === 'undefined') {
      alert('Đang tải thư viện xử lý PDF...');
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
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
          
          const dataUrl = canvas.toDataURL(state.format, state.quality);
          loadedPages.push({
            index: i,
            dataUrl,
            width: viewport.width,
            height: viewport.height,
            selected: true
          });
        }
        
        if (i % 3 === 0 || i === numPages) {
          setState(prev => ({ ...prev, pages: [...loadedPages] }));
        }
      }
      
      setState(prev => ({ ...prev, isProcessing: false }));
    } catch (error) {
      console.error('Lỗi PDF:', error);
      alert('Không thể chuyển đổi file PDF.');
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const downloadAllPdf = async () => {
    const selectedPages = state.pages.filter(p => p.selected);
    if (selectedPages.length === 0) return;

    if (selectedPages.length === 1) {
      const link = document.createElement('a');
      link.href = selectedPages[0].dataUrl;
      link.download = `${state.fileName}_Trang_${selectedPages[0].index}.${state.format === OutputFormat.PNG ? 'png' : 'jpg'}`;
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
      link.download = `${state.fileName}.zip`;
      link.click();
    } catch (err) {
      alert('Lỗi tạo file nén.');
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
            title: String(data.data.title || 'TikTok Content'),
            author: String(data.data.author?.nickname || 'Unknown'),
            cover: data.data.cover
          });
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
              { quality: 'Video MP4', url: `https://api.vve.pw/api/button/mp4/${vidId}`, type: 'video' },
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

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfd] text-slate-900">
      <header className="bg-white/90 backdrop-blur-md border-b sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg"><Layers size={22} /></div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-none">NHUTCODER <span className="text-indigo-600">TOOL</span></h1>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Converter Toolbox</p>
            </div>
          </div>

          <nav className="flex items-center bg-slate-100 p-1 rounded-xl">
            {(['pdf', 'tiktok', 'youtube'] as AppMode[]).map(tabId => (
              <button 
                key={tabId}
                onClick={() => { setMode(tabId); setResult(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === tabId ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              >
                {tabId === 'pdf' && <FileText size={18} />}
                {tabId === 'tiktok' && <Video size={18} />}
                {tabId === 'youtube' && <Youtube size={18} />}
                <span className="hidden md:inline uppercase">{tabId}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-12">
        {mode === 'pdf' ? (
          state.pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-black uppercase mb-6">
                  <ShieldCheck size={14} /> Bảo mật & Không AI
                </div>
                <h2 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">Chuyển PDF Sang Ảnh</h2>
                <p className="text-slate-500 max-w-lg mx-auto font-medium">Xử lý trực tiếp tại máy của bạn. Tuyệt đối không tải file lên máy chủ.</p>
              </div>

              <div 
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); if(e.dataTransfer.files[0]) processPdf(e.dataTransfer.files[0]); }}
                className={`w-full max-w-2xl border-4 border-dashed rounded-[2.5rem] p-16 flex flex-col items-center justify-center cursor-pointer transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && processPdf(e.target.files[0])} />
                <div className="bg-indigo-50 p-6 rounded-3xl text-indigo-600 mb-6">
                  {state.isProcessing ? <Loader2 size={48} className="animate-spin" /> : <FileUp size={48} />}
                </div>
                <p className="text-xl font-bold">{state.isProcessing ? 'Đang trích xuất...' : 'Chọn file hoặc Kéo PDF vào đây'}</p>
              </div>
            </div>
          ) : (
            <div>
              <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-600 p-3 rounded-xl text-white"><FileText size={24} /></div>
                  <div>
                    <h3 className="text-lg font-bold truncate max-w-[200px]">{String(state.fileName)}.pdf</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase">{state.pages.length} trang đã sẵn sàng</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-slate-50 p-1 rounded-xl flex">
                    <button onClick={() => setState(s => ({ ...s, format: OutputFormat.PNG }))} className={`px-4 py-1.5 rounded-lg text-xs font-black ${state.format === OutputFormat.PNG ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>PNG</button>
                    <button onClick={() => setState(s => ({ ...s, format: OutputFormat.JPG }))} className={`px-4 py-1.5 rounded-lg text-xs font-black ${state.format === OutputFormat.JPG ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>JPG</button>
                  </div>
                  <button onClick={downloadAllPdf} disabled={isZipping} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2">
                    {isZipping ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} TẢI ZIP
                  </button>
                  <button onClick={resetPdfState} className="p-3 bg-red-50 text-red-500 rounded-xl"><Trash2 size={20} /></button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {state.pages.map((page) => (
                  <div key={page.index} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg transition-all">
                    <div className="aspect-[3/4] relative bg-slate-50">
                      <img src={page.dataUrl} className="w-full h-full object-contain p-3" alt={`Trang ${page.index}`} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                         <button onClick={() => { const link = document.createElement('a'); link.href = page.dataUrl; link.download = `${state.fileName}_P${page.index}.${state.format === OutputFormat.PNG ? 'png' : 'jpg'}`; link.click(); }} className="p-4 bg-white text-indigo-600 rounded-full shadow-lg transition-transform hover:scale-110"><Download size={24} /></button>
                      </div>
                    </div>
                    <div className="p-4 flex justify-between font-bold text-slate-700"><span>Trang {Number(page.index)}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center">
             <div className="text-center mb-10">
                <h2 className="text-4xl font-black text-slate-900 mb-2 uppercase">Media Downloader</h2>
                <p className="text-slate-500">Tải video/ảnh từ TikTok và nội dung từ YouTube.</p>
              </div>
              <form onSubmit={handleMediaDownload} className="w-full max-w-2xl mb-10">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400"><LinkIcon size={20} /></div>
                  <input type="url" placeholder="Dán link tại đây..." className="block w-full pl-12 pr-32 py-5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 outline-none font-medium" value={inputUrl} onChange={(e) => setInputUrl(e.target.value)} required />
                  <button type="submit" disabled={loading} className="absolute right-2.5 top-2.5 bottom-2.5 bg-indigo-600 text-white px-6 rounded-xl hover:bg-indigo-700 font-bold disabled:opacity-50">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Xử Lý'}
                  </button>
                </div>
              </form>
              {result && (
                <div className="w-full max-w-4xl bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden animate-in fade-in duration-500">
                  <div className="p-8 flex flex-col md:flex-row gap-8">
                    <div className="w-full md:w-[280px] shrink-0 aspect-video md:aspect-[9/16] bg-slate-100 rounded-2xl overflow-hidden relative">
                      {result.cover && <img src={result.cover} className="w-full h-full object-cover" alt="Thumbnail" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-4">{String(result.title || 'Nội dung Media')}</h3>
                      <div className="space-y-3">
                        {mode === 'tiktok' && result.images && result.images.length > 0 ? (
                          <button onClick={async () => { setIsZipping(true); try { const zip = new JSZip(); for(let i=0; i<result.images!.length; i++) { const resp = await fetch(result.images![i]); const blob = await resp.blob(); zip.file(`image_${i+1}.jpg`, blob); } const content = await zip.generateAsync({type:'blob'}); const a = document.createElement('a'); a.href = URL.createObjectURL(content); a.download = 'tiktok_images.zip'; a.click(); } finally { setIsZipping(false); } }} className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                            <FolderArchive size={20} /> TẢI ZIP {Number(result.images.length)} ẢNH
                          </button>
                        ) : result.url && (
                          <a href={result.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors"><Download size={20} /> TẢI VIDEO</a>
                        )}
                        {mode === 'youtube' && result.formats?.map((f, i) => (
                          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-between px-6 py-4 rounded-xl font-bold transition-transform hover:-translate-y-0.5 ${f.type === 'video' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-indigo-600'}`}>
                            <div className="flex items-center gap-3">{f.type === 'video' ? <Monitor size={20} /> : <Music size={20} />} <span>{String(f.quality)}</span></div>
                            <ExternalLink size={18} />
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
      <footer className="bg-white border-t border-slate-100 py-8 text-center font-bold text-slate-400 uppercase tracking-widest text-[10px]">© 2024 NHUTCODER TOOLBOX</footer>
    </div>
  );
};

export default App;