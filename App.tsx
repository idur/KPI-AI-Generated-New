
import React, { useState, useRef, useEffect } from 'react';
import { generateKPIsFromJobDescription } from './services/geminiService';
import { getLibrary, saveToLibrary, deleteFromLibrary } from './services/libraryService';
import { fetchPIDLibrary } from './services/sheetService';
import { KPI, LibraryEntry } from './types';
import { Dashboard } from './components/Dashboard';
import { Bot, Search, Loader2, Database, Upload, FileText, X, BookOpen, Trash2, ArrowRight, Calendar, Table, Lock, Key, RefreshCw } from 'lucide-react';

enum AppMode {
  AI_GENERATOR = 'AI Generator',
  MY_LIBRARY = 'My Library',
  PID_LIBRARY = 'PID Library'
}

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.AI_GENERATOR);
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // AI State
  const [jobInput, setJobInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentJobTitle, setCurrentJobTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Library State
  const [libraryItems, setLibraryItems] = useState<LibraryEntry[]>([]);

  // PID Library State
  const [pidPassword, setPidPassword] = useState('');
  const [isPidAuthenticated, setIsPidAuthenticated] = useState(false);
  // Removed sheetUrl state as it's now backend/service managed
  const [sheetJobFilter, setSheetJobFilter] = useState('');

  // Handle URL Routing for /pid
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/pid') {
      setMode(AppMode.PID_LIBRARY);
    }
  }, []);

  // Load library when mode changes to My Library
  useEffect(() => {
    if (mode === AppMode.MY_LIBRARY) {
      setLibraryItems(getLibrary());
    }
    // Clear KPIs when switching modes to avoid confusion, unless switching to PID and already loaded
    if (mode === AppMode.AI_GENERATOR) {
      setKpis([]);
      setCurrentJobTitle('');
    }
  }, [mode]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
         alert("File terlalu besar. Maksimum 5MB.");
         return;
      }
      setSelectedFile(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1]; 
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobInput.trim() && !selectedFile) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setKpis([]);
    
    try {
      let fileData = undefined;
      if (selectedFile) {
        const base64 = await fileToBase64(selectedFile);
        fileData = {
          base64,
          mimeType: selectedFile.type || 'application/pdf'
        };
      }

      const result = await generateKPIsFromJobDescription(jobInput, fileData);
      setKpis(result);
      setCurrentJobTitle(jobInput || selectedFile?.name || "Generated Result");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat generate KPI.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToLibrary = (kpisToSave: KPI[]) => {
    if (!currentJobTitle) return;
    
    try {
      saveToLibrary(currentJobTitle, kpisToSave);
      setSuccessMessage(`Berhasil menyimpan ${kpisToSave.length} KPI untuk "${currentJobTitle}" ke My Library.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Gagal menyimpan ke library.");
    }
  };

  const handleLoadLibraryItem = (item: LibraryEntry) => {
    setKpis(item.kpis);
    setCurrentJobTitle(item.jobTitle);
    setMode(AppMode.AI_GENERATOR); // Switch to main view to see the dashboard
    window.scrollTo(0, 0);
  };

  const handleDeleteLibraryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Apakah Anda yakin ingin menghapus koleksi KPI ini?")) {
      const updated = deleteFromLibrary(id);
      setLibraryItems(updated);
    }
  };

  // --- PID Logic ---
  
  const loadPidData = async (filter: string = '') => {
    setLoading(true);
    setError(null);
    setKpis([]);
    
    try {
      // Call the service which holds the hardcoded URL
      const data = await fetchPIDLibrary(filter);
      if (data.length === 0) {
        throw new Error("Data kosong atau tidak ditemukan.");
      }
      setKpis(data);
      setCurrentJobTitle(filter ? `PID: ${filter}` : "PID Master Library");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePidLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pidPassword === 'pid2025') {
      setIsPidAuthenticated(true);
      setError(null);
      // Auto-fetch data on successful login
      await loadPidData(sheetJobFilter);
    } else {
      setError("Password salah. Akses ditolak.");
    }
  };

  const handlePidFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPidData(sheetJobFilter);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo / Title Area */}
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setMode(AppMode.AI_GENERATOR)}>
            <div className="bg-brand-600 p-1.5 rounded-lg group-hover:bg-brand-700 transition-colors">
              <Database className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Library <span className="text-brand-600">KPI</span>
            </h1>
          </div>

          {/* Navigation Area */}
          <div className="flex gap-2 sm:gap-3 overflow-x-auto">
            <button 
              onClick={() => setMode(AppMode.AI_GENERATOR)}
              className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${mode === AppMode.AI_GENERATOR ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Generator</span>
              <span className="sm:hidden">AI</span>
            </button>
             <button 
              onClick={() => setMode(AppMode.MY_LIBRARY)}
              className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${mode === AppMode.MY_LIBRARY ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">My Library</span>
              <span className="sm:hidden">Lib</span>
            </button>
            <button 
              onClick={() => setMode(AppMode.PID_LIBRARY)}
              className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${mode === AppMode.PID_LIBRARY ? 'bg-slate-800 text-white ring-1 ring-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">PID Library</span>
              <span className="sm:hidden">PID</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contextual Success Message */}
      {successMessage && (
        <div className="fixed top-20 right-4 z-[60] bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg animate-in slide-in-from-right duration-300">
          {successMessage}
        </div>
      )}

      {/* --- AI GENERATOR MODE INPUT --- */}
      {mode === AppMode.AI_GENERATOR && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">Generate KPI Library Instan</h2>
            <p className="text-slate-600 mb-8 max-w-2xl mx-auto text-sm sm:text-base">
              Masukkan Job Description, Role, atau upload dokumen JD Anda, dan AI akan merancang struktur KPI lengkap berdasarkan Balanced Scorecard.
            </p>
            <form onSubmit={handleGenerate} className="relative max-w-lg mx-auto">
              <div className="relative z-0">
                  <input 
                  type="text" 
                  value={jobInput}
                  onChange={(e) => setJobInput(e.target.value)}
                  placeholder={selectedFile ? "Tambahkan konteks role (opsional)..." : "Contoh: Digital Marketing Manager..."}
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-t-xl rounded-b-none shadow-sm text-base sm:text-lg focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all focus:z-10 relative"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-6 h-6 z-10" />
              </div>
              
              <div className={`bg-slate-50 border-2 border-t-0 border-slate-200 rounded-b-xl p-3 flex items-center justify-between transition-colors ${selectedFile ? 'bg-brand-50 border-brand-200' : ''}`}>
                  <div className="flex items-center gap-3 pl-2 overflow-hidden">
                    {selectedFile ? (
                      <>
                        <div className="bg-white p-1.5 rounded shadow-sm text-brand-600 flex-shrink-0">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div className="text-left overflow-hidden">
                          <p className="text-sm font-medium text-slate-900 truncate max-w-[150px] sm:max-w-[200px]">{selectedFile.name}</p>
                          <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500 italic text-left truncate">
                        Opsional: Upload file JD (PDF/TXT)
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {selectedFile ? (
                      <button 
                        type="button"
                        onClick={clearFile}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-lg"
                        title="Hapus file"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    ) : (
                        <label className="cursor-pointer flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-600 hover:bg-white px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                        <Upload className="w-4 h-4" />
                        <span>Upload</span>
                        <input 
                          ref={fileInputRef}
                          type="file" 
                          accept=".pdf,.txt,application/pdf,text/plain" 
                          className="hidden" 
                          onChange={handleFileChange}
                        />
                      </label>
                    )}
                  </div>
              </div>

              <div className="mt-4">
                  <button 
                  type="submit" 
                  disabled={loading || (!jobInput && !selectedFile)}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3.5 rounded-xl font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 hover:shadow-brand-600/30"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate KPI Strategy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        {/* --- MY LIBRARY MODE --- */}
        {mode === AppMode.MY_LIBRARY && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
               <h2 className="text-xl sm:text-2xl font-bold text-slate-900">My Library</h2>
               <span className="text-slate-500 text-xs sm:text-sm bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">{libraryItems.length} Role</span>
            </div>

            {libraryItems.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Library Kosong</h3>
                <p className="text-slate-500 mb-6">Anda belum menyimpan data KPI apapun.</p>
                <button 
                  onClick={() => setMode(AppMode.AI_GENERATOR)}
                  className="text-brand-600 font-medium hover:text-brand-700 hover:underline"
                >
                  Buat KPI Baru sekarang &rarr;
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {libraryItems.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => handleLoadLibraryItem(item)}
                    className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-brand-300 transition-all cursor-pointer group relative"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <button 
                        onClick={(e) => handleDeleteLibraryItem(e, item.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-brand-600 transition-colors">{item.jobTitle}</h3>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                      <div className="flex items-center gap-1.5">
                        <Table className="w-4 h-4" />
                        <span>{item.kpis.length} KPI</span>
                      </div>
                       <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-medium text-brand-600">
                      <span>Lihat Detail</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- PID LIBRARY MODE --- */}
        {mode === AppMode.PID_LIBRARY && (
          <div className="space-y-6">
            {!isPidAuthenticated ? (
              <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200 mt-10">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                    <Lock className="w-6 h-6 text-slate-700" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Restricted Access</h2>
                  <p className="text-slate-500 mt-2">Area PID Library dilindungi password.</p>
                </div>
                <form onSubmit={handlePidLogin}>
                  <div className="mb-4 relative">
                    <input
                      type="password"
                      value={pidPassword}
                      onChange={(e) => setPidPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      placeholder="Masukkan password akses..."
                    />
                    <Key className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-slate-900 text-white font-medium py-3 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Masuk
                  </button>
                </form>
              </div>
            ) : (
              // Authenticated View
              <>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
                   <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <Table className="w-6 h-6 text-slate-700" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900">Master PID Library</h2>
                          <p className="text-sm text-slate-500">Data terhubung ke Pusat Data PID.</p>
                        </div>
                     </div>

                     {/* Simple Filter Form */}
                     <form onSubmit={handlePidFilterSubmit} className="flex gap-2 w-full sm:w-auto">
                        <input 
                          type="text" 
                          value={sheetJobFilter}
                          onChange={(e) => setSheetJobFilter(e.target.value)}
                          placeholder="Cari Jabatan/Posisi..."
                          className="flex-1 sm:w-64 px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
                        />
                        <button 
                          type="submit" 
                          disabled={loading}
                          className="px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center"
                        >
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </button>
                     </form>
                   </div>
                </div>
                
                {/* Loading Indicator */}
                {loading && (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-500">Sedang memuat data dari PID Database...</p>
                  </div>
                )}

                {/* Reuse Dashboard if data is present */}
                {!loading && kpis.length > 0 && (
                  <Dashboard 
                    kpis={kpis}
                    jobTitle={currentJobTitle}
                    onSaveToLibrary={handleSaveToLibrary}
                  />
                )}

                {/* Empty State / Error Retry */}
                {!loading && kpis.length === 0 && !error && (
                  <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500 mb-4">Data tidak ditemukan untuk filter tersebut.</p>
                    <button 
                      onClick={() => loadPidData('')}
                      className="text-sm font-medium text-slate-700 flex items-center justify-center gap-2 mx-auto hover:text-slate-900"
                    >
                      <RefreshCw className="w-4 h-4" /> Reset Filter & Reload
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* --- AI GENERATOR DASHBOARD --- */}
        {mode === AppMode.AI_GENERATOR && (
          <Dashboard 
            kpis={kpis} 
            jobTitle={currentJobTitle || 'Draft'}
            onSaveToLibrary={handleSaveToLibrary} 
          />
        )}
      </main>
    </div>
  );
}

export default App;
