import React, { useState, useRef, useEffect, useMemo } from 'react';
import { generateKPIsFromJobDescription } from './services/geminiService';
import { getLibrary, saveToLibrary, deleteFromLibrary, updateLibraryItem } from './services/libraryServiceCloud';
import { parseCSVLine } from './services/sheetService';
import { KPI, LibraryEntry } from './types';
import { Dashboard } from './components/Dashboard';
import { TokenHistory } from './components/TokenHistory';
import { TokenDisplay } from './components/TokenDisplay';
import { BuyTokenModal } from './components/BuyTokenModal';
import { useTokens, getTotalTokens } from './services/tokenServiceCloud';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Auth/Login';
import { LibraryView } from './components/LibraryView';
import { CSVGuide } from './components/CSVGuide';
import { BulkUploadModal } from './components/BulkUploadModal';
import { ProfileModal } from './components/Profile/ProfileModal';
import { ProfileDropdown } from './components/Profile/ProfileDropdown';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { LandingPage } from './components/LandingPage';
import { Bot, Search, Loader2, Database, Upload, FileText, X, BookOpen, RefreshCw, Info, FileSpreadsheet, LogOut, History, ArrowRight, User, Shield } from 'lucide-react';

enum AppMode {
  AI_GENERATOR = 'AI Generator',
  MY_LIBRARY = 'My Library',
  TOKEN_HISTORY = 'Token History',
  ADMIN_DASHBOARD = 'Admin Dashboard'
}

// Helper to get current route from hash
const getRouteFromHash = (): AppMode => {
  const hash = window.location.hash.slice(1); // Remove #
  switch (hash) {
    case '/library':
      return AppMode.MY_LIBRARY;
    case '/history':
      return AppMode.TOKEN_HISTORY;
    case '/admin':
      return AppMode.ADMIN_DASHBOARD;
    default:
      return AppMode.AI_GENERATOR;
  }
};

// Helper to set hash from mode
const setHashFromMode = (mode: AppMode) => {
  switch (mode) {
    case AppMode.MY_LIBRARY:
      window.location.hash = '#/library';
      break;
    case AppMode.TOKEN_HISTORY:
      window.location.hash = '#/history';
      break;
    case AppMode.ADMIN_DASHBOARD:
      window.location.hash = '#/admin';
      break;
    default:
      window.location.hash = '#/';
      break;
  }
};

function AppContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [mode, setMode] = useState<AppMode>(getRouteFromHash());

  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>(''); // For batch progress
  const [showBuyTokenModal, setShowBuyTokenModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; itemId: string | null; itemName: string }>({
    isOpen: false,
    itemId: null,
    itemName: ''
  });

  // KPI Data State
  const [masterKpis, setMasterKpis] = useState<KPI[]>([]); // All data from sheet
  const [kpis, setKpis] = useState<KPI[]>([]); // Displayed/Filtered data
  const [currentLibraryId, setCurrentLibraryId] = useState<string | null>(null); // Track loaded library item

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [language, setLanguage] = useState<'id' | 'en'>('id');

  // AI State
  const [jobInput, setJobInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentJobTitle, setCurrentJobTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Library State
  const [libraryItems, setLibraryItems] = useState<LibraryEntry[]>([]);

  // Listen to hash changes
  useEffect(() => {
    const handleHashChange = () => {
      setMode(getRouteFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash when mode changes programmatically
  const changeMode = (newMode: AppMode) => {
    setMode(newMode);
    setHashFromMode(newMode);
  };



  // Token Hook
  const { total: totalTokens, spendTokens, refresh: refreshTokens } = useTokens();

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is admin
    const checkRole = async () => {
      try {
        // We can re-use the function from tokenServiceCloud as it fetches the record
        const { getTokenState } = await import('./services/tokenServiceCloud');
        const state = await getTokenState();
        setIsAdmin(state.role === 'admin');
      } catch (e) {
        console.error(e);
      }
    };
    checkRole();
  }, [user, refreshTokens]);


  // Load library when navigating to library page
  useEffect(() => {
    const loadLibrary = async () => {
      if (mode === AppMode.MY_LIBRARY) {
        const items = await getLibrary();
        setLibraryItems(items);
      }
    };
    loadLibrary();
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

    // Check Tokens (Read directly from storage to ensure latest state)
    const currentTotalTokens = await getTotalTokens();

    if (currentTotalTokens <= 0) {
      setShowBuyTokenModal(true);
      return;
    }

    setLoading(true);
    setLoadingStatus('Menganalisis permintaan...');
    setError(null);
    setSuccessMessage(null);
    setKpis([]);
    setMasterKpis([]); // Clear master in AI mode
    setCurrentLibraryId(null); // Clear library ID as this is a new generation

    try {
      // Special handling for CSV files (Batch Processing)
      if (selectedFile && selectedFile.name.endsWith('.csv')) {
        const text = await selectedFile.text();
        const lines = text.split('\n').filter(l => l.trim() !== '');

        // 1. Group tasks by Role
        const roleTasks: Record<string, string[]> = {};

        for (let i = 1; i < lines.length; i++) { // Skip header
          const cols = parseCSVLine(lines[i]);
          if (cols.length >= 2) {
            const r = cols[0]?.replace(/^"|"$/g, '').trim();
            const t = cols[1]?.replace(/^"|"$/g, '').trim();
            if (r && t) {
              if (!roleTasks[r]) {
                roleTasks[r] = [];
              }
              roleTasks[r].push(t);
            }
          }
        }

        const roles = Object.keys(roleTasks);

        if (roles.length === 0) {
          setError("CSV tidak memiliki data yang valid. Pastikan format: Role, Tugas");
          setLoading(false);
          return;
        }

        // 2. Process each Role sequentially
        let remainingTokens = currentTotalTokens;
        const totalRoles = roles.length;
        let processedCount = 0;

        for (let i = 0; i < totalRoles; i++) {
          const role = roles[i];
          const tasks = roleTasks[role];

          // Check remaining tokens
          if (remainingTokens <= 0) {
            setError(`Token habis setelah memproses ${processedCount} dari ${totalRoles} peran. Sisanya tidak diproses.`);
            break;
          }

          setLoadingStatus(`Memproses Role ${i + 1}/${totalRoles}: ${role} (${tasks.length} tugas)...`);

          // Construct a rich job description from the tasks
          const combinedJobDescription = `Role: ${role}\n\nTugas dan Tanggung Jawab:\n${tasks.map(t => `- ${t}`).join('\n')}`;

          try {
            // Generate KPIs for this role
            const roleKPIs = await generateKPIsFromJobDescription(combinedJobDescription, null, false, remainingTokens, language);

            // Add Role metadata to KPIs if not present (optional, but good for context)
            const kpisWithRole = roleKPIs.map(k => ({ ...k, role: role }));

            // Deduct tokens (1 per role)
            const cost = 1;
            await spendTokens(cost);
            refreshTokens();
            remainingTokens -= cost;

            // Update State incrementally
            setKpis(prev => [...prev, ...kpisWithRole]);
            setMasterKpis(prev => [...prev, ...kpisWithRole]);
            processedCount++;

          } catch (err) {
            console.error(`Error processing role ${role}:`, err);
            // Continue to next role instead of stopping everything
            setError(prev => prev ? `${prev}\nGagal memproses ${role}.` : `Gagal memproses ${role}.`);
          }
        }

        setCurrentJobTitle(`Batch Import (${processedCount} Roles)`);
        setSuccessMessage(`Batch processing selesai! Berhasil memproses ${processedCount} dari ${totalRoles} peran.`);
        setTimeout(() => setSuccessMessage(null), 5000);
      }
      // Standard PDF/Text Handling (Single Request)
      else {
        let fileData: { base64: string; mimeType: string } | undefined = undefined;
        if (selectedFile) {
          if (selectedFile.type === 'application/pdf') {
            setLoadingStatus('Membaca file PDF...');
            const base64 = await fileToBase64(selectedFile);
            fileData = { base64, mimeType: selectedFile.type };
          } else if (selectedFile.type === 'text/plain') {
            setLoadingStatus('Membaca file teks...');
            const textContent = await selectedFile.text();
            // Convert text to base64 for consistency
            const base64 = btoa(textContent);
            fileData = { base64, mimeType: selectedFile.type };
          }
        }

        setLoadingStatus('Menghasilkan KPI...');
        const finalJobInput = jobInput.trim() || 'Analisis dari file yang diunggah';

        if (selectedFile) {
          setCurrentJobTitle(selectedFile.name);
        } else {
          setCurrentJobTitle(jobInput || "Generated Result");
        }

        const onProgress = (partialKpis: KPI[]) => {
          setKpis(partialKpis);
          setMasterKpis(partialKpis);
          setLoadingStatus(`Menghasilkan KPI (${partialKpis.length} item)...`);
        };

        const result = await generateKPIsFromJobDescription(finalJobInput, fileData, false, 20, language, onProgress);

        // Deduct Tokens (1 Token per request, regardless of KPI count)
        const cost = 1;
        await spendTokens(cost);
        refreshTokens();

        if (cost > currentTotalTokens) {
          // Should not happen if AI respects limit, but just in case
          alert(`Peringatan: Token habis.`);
        }

        setKpis(result);
        setMasterKpis(result);
      }

    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat generate KPI.");
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  };

  const handleSaveToLibrary = async (kpisToSave: KPI[]) => {
    if (!currentJobTitle) return;

    try {
      await saveToLibrary({
        id: crypto.randomUUID(),
        jobTitle: currentJobTitle,
        kpis: kpisToSave,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      setSuccessMessage(`Berhasil menyimpan ${kpisToSave.length} KPI untuk "${currentJobTitle}" ke My Library.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Gagal menyimpan ke library.");
    }
  };

  const handleLoadLibraryItem = (item: LibraryEntry) => {
    setKpis(item.kpis);
    setMasterKpis(item.kpis);
    setCurrentJobTitle(item.jobTitle);
    setJobInput(item.jobTitle); // Update input field context
    setCurrentLibraryId(item.id); // Set current library ID
    changeMode(AppMode.AI_GENERATOR); // Navigate to generator view
    window.scrollTo(0, 0);
  };

  const handleDeleteLibraryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const itemToDelete = libraryItems.find(item => item.id === id);
    if (!itemToDelete) return;

    setDeleteConfirmation({ isOpen: true, itemId: id, itemName: itemToDelete.jobTitle });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.itemId) return;

    try {
      await deleteFromLibrary(deleteConfirmation.itemId);
      const updated = await getLibrary();
      setLibraryItems(updated);
      setSuccessMessage('Koleksi KPI berhasil dihapus.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setError(error.message || 'Gagal menghapus koleksi KPI.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setDeleteConfirmation({ isOpen: false, itemId: null, itemName: '' });
    }
  };

  const handleUpdateKPI = async (updatedKpi: KPI) => {
    // 1. Update local state
    const updatedKpis = kpis.map(k => k.id === updatedKpi.id ? updatedKpi : k);
    setKpis(updatedKpis);
    setMasterKpis(updatedKpis);

    // 2. If viewing a saved library item, update it in the cloud
    if (currentLibraryId) {
      try {
        await updateLibraryItem(currentLibraryId, updatedKpis);
        // Optional: Show a subtle success indicator or toast
        console.log('Library item updated in cloud');
      } catch (err) {
        console.error('Failed to update library item:', err);
        setError("Gagal menyimpan perubahan ke library.");
      }
    }
  };



  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo / Title Area */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => changeMode(AppMode.AI_GENERATOR)}>
              <div className="bg-brand-600 p-1.5 rounded-lg group-hover:bg-brand-700 transition-colors">
                <Database className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Library <span className="text-brand-600">KPI</span>
              </h1>
            </div>
          </div>

          {/* Navigation Area */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Scrollable Buttons */}
            <div className="flex gap-2 sm:gap-3 overflow-x-auto items-center no-scrollbar">
              <TokenDisplay />
              <button
                onClick={() => changeMode(AppMode.AI_GENERATOR)}
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${mode === AppMode.AI_GENERATOR ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Bot className="w-4 h-4" />
                <span className="hidden sm:inline">Generator</span>
                <span className="sm:hidden">AI</span>
              </button>
              <button
                onClick={() => changeMode(AppMode.MY_LIBRARY)}
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${mode === AppMode.MY_LIBRARY ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">My Library</span>
                <span className="sm:hidden">Lib</span>
              </button>
              <button
                onClick={() => changeMode(AppMode.TOKEN_HISTORY)}
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${mode === AppMode.TOKEN_HISTORY ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
                <span className="sm:hidden">Hist</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => changeMode(AppMode.ADMIN_DASHBOARD)}
                  className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${mode === AppMode.ADMIN_DASHBOARD ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                  <span className="sm:hidden">Adm</span>
                </button>
              )}
            </div>

            {/* Profile Dropdown (Fixed) */}
            <div className="pl-2 border-l border-slate-200 ml-1 flex-shrink-0">
              <ProfileDropdown onOpenProfile={() => setShowProfileModal(true)} />
            </div>
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
              Masukkan Job Description, Role, atau upload dokumen JD (PDF/TXT/CSV), dan AI akan merancang struktur KPI lengkap.
            </p>

            <form onSubmit={handleGenerate} className="max-w-2xl mx-auto">
              {/* Unified Card Container */}
              <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden">

                {/* Textarea Section */}
                <div className="relative p-4">
                  <textarea
                    value={jobInput}
                    onChange={(e) => setJobInput(e.target.value)}
                    placeholder="Contoh: Marketing Manager, bertanggung jawab untuk..."
                    className="w-full h-32 px-4 py-3 text-slate-700 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 focus:bg-white transition-all resize-none"
                  />

                  {/* Language Selector - Bottom Right of Textarea */}
                  <div className="absolute bottom-7 right-7">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as 'id' | 'en')}
                      className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm font-medium cursor-pointer hover:bg-slate-50"
                    >
                      <option value="id">🇮🇩 Indonesia</option>
                      <option value="en">🇺🇸 English</option>
                    </select>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-200"></div>

                {/* File Upload Section */}
                <div className="p-4 bg-slate-50/50">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {selectedFile ? (
                        <>
                          <div className="bg-white p-2 rounded-lg shadow-sm text-brand-600 flex-shrink-0">
                            {selectedFile.name.endsWith('.csv') ?
                              <FileSpreadsheet className="w-5 h-5" /> :
                              <FileText className="w-5 h-5" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{selectedFile.name}</p>
                            <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                          </div>
                          <button
                            type="button"
                            onClick={clearFile}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-lg flex-shrink-0"
                            title="Hapus file"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          <p className="text-sm text-slate-500 flex-1">
                            Upload JD: PDF, TXT, atau CSV (Format: Role, Tugas)
                          </p>
                          <label className="cursor-pointer flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 px-4 py-2 rounded-lg transition-colors bg-white border border-brand-200 hover:bg-brand-50 flex-shrink-0">
                            <Upload className="w-4 h-4" />
                            <span>Upload</span>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".pdf,.txt,.csv,application/pdf,text/plain,text/csv,application/vnd.ms-excel"
                              className="hidden"
                              onChange={handleFileChange}
                            />
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-200"></div>

                {/* Generate Button Section */}
                <div className="p-4">
                  <button
                    type="submit"
                    disabled={loading || (!jobInput && !selectedFile)}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3.5 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 hover:shadow-brand-600/30 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm font-normal opacity-90">{loadingStatus || 'Processing...'}</span>
                      </div>
                    ) : (
                      <>
                        <Bot className="w-5 h-5" />
                        <span>Generate KPI Library</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* CSV Upload Guide */}
            <CSVGuide onOpenModal={() => setShowBulkUploadModal(true)} />
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <LibraryView
              items={libraryItems}
              onLoad={handleLoadLibraryItem}
              onDelete={handleDeleteLibraryItem}
            />
          </div>
        )}

        {/* --- TOKEN HISTORY MODE --- */}
        {mode === AppMode.TOKEN_HISTORY && (
          <TokenHistory />
        )}

        {/* --- ADMIN MODE --- */}
        {mode === AppMode.ADMIN_DASHBOARD && isAdmin && (
          <AdminDashboard />
        )}



        {/* --- AI GENERATOR DASHBOARD --- */}
        {/* Render dashboard even if loading is true, to show incremental results */}
        {mode === AppMode.AI_GENERATOR && (kpis.length > 0 || loading) && (
          <Dashboard
            kpis={kpis}
            jobTitle={currentJobTitle || 'Draft'}
            onSaveToLibrary={handleSaveToLibrary}
            onUpdateKPI={handleUpdateKPI}
            onJobTitleChange={(newTitle) => setCurrentJobTitle(newTitle)}
          />
        )}
      </main>

      {/* Global Modals */}
      <BuyTokenModal isOpen={showBuyTokenModal} onClose={() => setShowBuyTokenModal(false)} />
      <BulkUploadModal isOpen={showBulkUploadModal} onClose={() => setShowBulkUploadModal(false)} />
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <ConfirmDeleteModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, itemId: null, itemName: '' })}
        onConfirm={confirmDelete}
        itemName={deleteConfirmation.itemName}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  );
}

function AppWithAuth() {
  const { user, loading: authLoading } = useAuth();
  const [currentHash, setCurrentHash] = React.useState(window.location.hash.slice(1) || '/');

  // Listen to hash changes
  React.useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash.slice(1) || '/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Redirect logged-in users away from login page
  React.useEffect(() => {
    if (!authLoading && user && currentHash === '/login') {
      window.location.hash = '#/';
    }
  }, [user, authLoading, currentHash]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  // If user is logged in, always show main app
  if (user) {
    return <AppContent />;
  }

  // User not logged in - route based on hash
  if (currentHash === '/login') {
    return <Login />;
  }

  // Default: show landing page
  return <LandingPage onNavigateToLogin={() => window.location.hash = '#/login'} />;
}

export default App;