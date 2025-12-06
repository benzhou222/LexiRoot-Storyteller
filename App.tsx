
import React, { useState, useCallback, useEffect } from 'react';
import { generateWords, generateWordDetails, generateSingleWord, generateWordsByRoot } from './services/geminiService';
import { WordData, AppSettings } from './types';
import { WordCard } from './components/WordCard';
import { DetailModal } from './components/DetailModal';
import { HistorySidebar } from './components/HistorySidebar';
import { RootSidebar } from './components/RootSidebar';
import { SettingsModal } from './components/SettingsModal';

// Unique ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

const DEFAULT_SETTINGS: AppSettings = {
  useLocal: false,
  localBaseUrl: 'http://localhost:11434/v1',
  localModel: '',
  useCustomGemini: false,
  geminiApiKey: ''
};

export default function App() {
  const [currentWords, setCurrentWords] = useState<WordData[]>([]);
  const [history, setHistory] = useState<WordData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sidebar Tab State
  const [activeSidebarTab, setActiveSidebarTab] = useState<'history' | 'roots'>('history');

  // Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('appSettings');
        if (stored) {
            try {
                // Merge with default to ensure new fields (like custom Gemini) exist
                return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }
    }
    return DEFAULT_SETTINGS;
  });

  // Persist settings
  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
  }, [settings]);

  // Mobile sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage or system preference
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('theme');
        if (stored) return stored === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Apply dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Load initial words on mount
  useEffect(() => {
    // Only fetch if we have no words on screen
    if (currentWords.length === 0 && !loading) {
       handleGenerate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      // Get list of words in history for deduplication
      const historyWords = history.map(h => h.word);
      
      const newRawWords = await generateWords(historyWords, settings);
      
      const newWords: WordData[] = newRawWords.map(w => ({
        ...w,
        id: generateId(),
        isLoadingDetails: false
      }));

      setCurrentWords(newWords);
      
    } catch (error) {
      console.error("Failed to generate words", error);
      alert("Something went wrong while consulting the library. Check your settings or connection.");
    } finally {
      setLoading(false);
    }
  }, [history, loading, settings]);

  const handleRootSelect = useCallback(async (root: string) => {
    if (loading) return;
    setLoading(true);
    // Close mobile sidebar if open
    setIsSidebarOpen(false);

    try {
        const newRawWords = await generateWordsByRoot(root, settings);
        
        const newWords: WordData[] = newRawWords.map(w => ({
            ...w,
            id: generateId(),
            isLoadingDetails: false
        }));

        setCurrentWords(newWords);
    } catch (error) {
        console.error("Failed to generate words by root", error);
        alert(`Could not find words for root "${root}".`);
    } finally {
        setLoading(false);
    }
  }, [loading, settings]);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || loading) return;

    setLoading(true);
    setIsSearching(true);
    try {
        const rawWord = await generateSingleWord(searchQuery.trim(), settings);
        
        const newWord: WordData = {
            ...rawWord,
            id: generateId(),
            isLoadingDetails: false
        };

        setCurrentWords([newWord]);
        setSearchQuery(''); // Clear search
    } catch (error) {
        console.error("Failed to search word", error);
        alert("Could not find or analyze that word. Please try again.");
    } finally {
        setLoading(false);
        setIsSearching(false);
    }
  }, [searchQuery, loading, settings]);

  const handleCardClick = useCallback(async (id: string) => {
    // 1. Find the word object
    let word = history.find(w => w.id === id);
    const isNewToHistory = !word;

    // If not in history, find it in the current generated batch
    if (!word) {
      word = currentWords.find(w => w.id === id);
    }

    if (!word) return;

    // 2. Add to history if it's new
    if (isNewToHistory) {
        setHistory(prev => {
            if (prev.some(p => p.id === id)) return prev;
            return [...prev, word!];
        });
    }

    setSelectedWordId(id);

    // 3. Generate details (story/image) if missing
    if (!word.story || !word.imageUrl) {
      setHistory(prev => {
        return prev.map(w => w.id === id ? { ...w, isLoadingDetails: true } : w);
      });

      try {
        const details = await generateWordDetails(word, settings);
        
        setHistory(prev => {
          return prev.map(w => w.id === id ? {
            ...w,
            story: details.story,
            imageUrl: details.imageBase64,
            isLoadingDetails: false
          } : w);
        });
      } catch (error) {
        console.error("Error generating details", error);
        setHistory(prev => {
          return prev.map(w => w.id === id ? { 
              ...w, 
              isLoadingDetails: false, 
              story: "Sorry, the story was lost in translation." 
          } : w);
        });
      }
    }
  }, [history, currentWords, settings]);

  const handleUpdateWord = useCallback((id: string, updates: Partial<WordData>) => {
    setHistory(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  }, []);

  // Derived selected word object
  const selectedWord = history.find(w => w.id === selectedWordId);
  const displayWords = currentWords.map(cw => history.find(h => h.id === cw.id) || cw);

  // Reusable sidebar container
  const SidebarContent = () => (
    <div className="h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col w-full md:w-64 lg:w-72 shrink-0 transition-colors duration-300">
        <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button 
                onClick={() => setActiveSidebarTab('history')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeSidebarTab === 'history' 
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
                History
            </button>
            <button 
                onClick={() => setActiveSidebarTab('roots')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeSidebarTab === 'roots' 
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
                Roots
            </button>
        </div>

        {activeSidebarTab === 'history' ? (
            <HistorySidebar 
                history={history} 
                onSelect={(id) => { handleCardClick(id); if (window.innerWidth < 768) setIsSidebarOpen(false); }} 
                currentIds={currentWords.map(w => w.id)} 
            />
        ) : (
            <RootSidebar 
                onSelectRoot={handleRootSelect}
                isLoading={loading}
            />
        )}
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-300">
      {/* Sidebar - Desktop */}
      <div className="hidden md:block h-full shadow-lg z-10">
        <SidebarContent />
      </div>

      {/* Sidebar - Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 z-50 animate-in slide-in-from-left duration-200 shadow-2xl">
                <SidebarContent />
            </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sm:p-6 flex flex-wrap md:flex-nowrap items-center justify-between z-20 shadow-sm transition-colors duration-300 gap-4">
          
          {/* Group 1: Logo & Menu (Order 1) */}
          <div className="flex items-center gap-3 order-1">
             <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-500 dark:text-slate-400">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                 </svg>
             </button>
             <div>
                 <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                     LexiRoot
                 </h1>
             </div>
          </div>

          {/* Group 2: Settings & Actions (Order 2 on Mobile to sit next to Logo, Order 3 on Desktop) */}
          <div className="flex items-center gap-3 justify-end order-2 md:order-3">
             {/* Settings Button */}
             <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Settings"
             >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
             </button>

             {/* Dark Mode Toggle */}
             <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Toggle Dark Mode"
             >
                {isDarkMode ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                    </svg>
                )}
             </button>
          </div>
          
          {/* Group 3: Search Bar (Order 3 on Mobile [new line], Order 2 on Desktop) */}
          <div className="w-full md:flex-1 max-w-xl mx-auto md:px-6 order-3 md:order-2">
             <form onSubmit={handleSearch} className="relative group w-full">
                <div className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none transition-colors ${isSearching ? 'text-indigo-500' : 'text-slate-400 group-focus-within:text-indigo-500'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                </div>
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={isSearching}
                    placeholder={isSearching ? "Creating word card..." : "Search any English word..."}
                    className={`block w-full rounded-full border py-2.5 pl-10 pr-12 text-sm leading-5 outline-none transition-all shadow-sm ${
                        isSearching 
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 placeholder-indigo-400/70' 
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    }`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                    {isSearching ? (
                         <svg className="animate-spin h-5 w-5 text-indigo-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                    ) : (
                        <button 
                            type="submit"
                            disabled={!searchQuery.trim() || loading}
                            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>
             </form>
          </div>
        </header>
        
        {/* Floating FAB for generating new words (Visible on all screens) */}
        <button
            onClick={handleGenerate}
            disabled={loading}
            title="Generate New Words"
            className={`absolute bottom-8 right-8 z-30 p-4 rounded-full shadow-lg text-white transition-all transform hover:scale-105 active:scale-95 ${
                loading 
                ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
            }`}
        >
             {loading ? (
                <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                </svg>
            )}
        </button>

        {/* Card Grid */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/50 dark:bg-slate-950 transition-colors duration-300">
            {displayWords.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center h-3/4 text-slate-400 dark:text-slate-500">
                    <p className="text-lg mb-4">Ready to expand your lexicon?</p>
                    <button onClick={handleGenerate} className="text-indigo-500 hover:underline">Start Generating</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto pb-24">
                    {loading && displayWords.length === 0 ? (
                         // Skeleton Loading State
                         Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 h-64 animate-pulse border border-slate-100 dark:border-slate-700">
                                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-6"></div>
                                <div className="space-y-2">
                                    <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded"></div>
                                    <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded"></div>
                                </div>
                            </div>
                         ))
                    ) : (
                        displayWords.map((word) => (
                            <div key={word.id} className="animate-in fade-in zoom-in-50 duration-500">
                                <WordCard 
                                    data={word} 
                                    settings={settings}
                                    onClick={handleCardClick} 
                                />
                            </div>
                        ))
                    )}
                </div>
            )}
        </main>
      </div>

      {/* Detail Modal */}
      {selectedWord && (
        <DetailModal 
            wordData={selectedWord} 
            settings={settings}
            onClose={() => setSelectedWordId(null)} 
            onUpdateWord={handleUpdateWord}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
            settings={settings}
            onSave={(newSettings) => setSettings(newSettings)}
            onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
