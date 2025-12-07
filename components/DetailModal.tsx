
import React, { useState, useEffect, useRef } from 'react';
import { WordData, AppSettings } from '../types';
import { generateStoryAudio, generatePronunciation } from '../services/geminiService';
import { downloadAudio, createAudioUrl, playAudioData } from '../services/audioUtils';

interface DetailModalProps {
  wordData: WordData;
  settings: AppSettings;
  onClose: () => void;
  onUpdateWord: (id: string, updates: Partial<WordData>) => void;
  isOnline: boolean;
}

export const DetailModal: React.FC<DetailModalProps> = ({ wordData, settings, onClose, onUpdateWord, isOnline }) => {
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlayingWord, setIsPlayingWord] = useState(false);
  const [isDownloadingWord, setIsDownloadingWord] = useState(false);
  const [pronunciationBase64, setPronunciationBase64] = useState<string | null>(null);
  
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Editable Story State
  const [storyText, setStoryText] = useState(wordData.story || '');

  useEffect(() => {
    setStoryText(wordData.story || '');
  }, [wordData.story]);

  // Clean up URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Create URL from existing story audio data on mount or when data changes
  useEffect(() => {
    if (wordData.storyAudioBase64) {
      const url = createAudioUrl(wordData.storyAudioBase64);
      setAudioUrl(url);
    }
  }, [wordData.storyAudioBase64]);

  const fetchPronunciationIfNeeded = async (): Promise<string | null> => {
    if (pronunciationBase64) return pronunciationBase64;
    if (!isOnline) {
        alert("Internet connection required.");
        return null;
    }
    try {
        const base64 = await generatePronunciation(wordData.word, settings);
        setPronunciationBase64(base64);
        return base64;
    } catch (e) {
        console.error("Failed to fetch pronunciation", e);
        return null;
    }
  };

  const handlePlayWord = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOnline) {
        alert("Internet connection required.");
        return;
    }
    if (isPlayingWord) return;
    
    setIsPlayingWord(true);
    const base64 = await fetchPronunciationIfNeeded();
    if (base64) {
        await playAudioData(base64);
    }
    setIsPlayingWord(false);
  };

  const handleDownloadPronunciation = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOnline) {
        alert("Internet connection required.");
        return;
    }
    if (isDownloadingWord) return;

    setIsDownloadingWord(true);
    const base64 = await fetchPronunciationIfNeeded();
    if (base64) {
        downloadAudio(base64, `${wordData.word}_pronunciation.wav`);
    }
    setIsDownloadingWord(false);
  };

  const handleStoryBlur = () => {
      // Save changes when user leaves the text area
      if (storyText !== wordData.story) {
          onUpdateWord(wordData.id, { story: storyText });
      }
  };

  const handleGenerateAudio = async () => {
    if (!isOnline) {
        alert("Internet connection required to generate audio.");
        return;
    }
    if (!storyText) return;

    setIsGeneratingAudio(true);
    try {
        // Use the current edited text for audio generation
        const base64 = await generateStoryAudio(storyText, settings);
        // Save both the audio and the (potentially) updated text to be safe
        onUpdateWord(wordData.id, { 
            storyAudioBase64: base64,
            story: storyText 
        });
    } catch (error) {
        console.error("Failed to generate audio", error);
        alert("Could not generate audio at this time.");
    } finally {
        setIsGeneratingAudio(false);
    }
  };

  const handleDownloadStory = () => {
    if (wordData.storyAudioBase64) {
      downloadAudio(wordData.storyAudioBase64, `${wordData.word}_story.wav`);
    }
  };

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 ring-1 ring-slate-900/5 dark:ring-white/10"
        onClick={handleContentClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mr-2">{wordData.word}</h2>
              
              <div className="flex items-center bg-slate-100 dark:bg-slate-700/50 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                <button
                    onClick={handlePlayWord}
                    disabled={!isOnline}
                    className={`flex items-center gap-2 px-2 py-1 transition-colors rounded ${
                        !isOnline 
                        ? 'text-slate-400 cursor-not-allowed opacity-50' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                    } ${isPlayingWord ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : ''}`}
                    title={isOnline ? "Play pronunciation" : "Online connection required"}
                >
                    <span className="font-mono text-lg">/{wordData.phonetic}/</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                        <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.061z" />
                    </svg>
                </button>
                <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                <button
                  onClick={handleDownloadPronunciation}
                  disabled={isDownloadingWord || !isOnline}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded disabled:opacity-50"
                  title={isOnline ? "Download Pronunciation" : "Online connection required"}
                >
                  {isDownloadingWord ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 serif italic">{wordData.meaning}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto custom-scroll p-6 space-y-8">
          
          {/* Loading State or Content */}
          {wordData.isLoadingDetails ? (
             isOnline ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-900 dark:border-t-indigo-500 rounded-full animate-spin"></div>
                  <p className="text-slate-500 dark:text-slate-400 animate-pulse">Weaving a story and painting a scene...</p>
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-amber-500 mb-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M12 18.75a9.75 9.75 0 005.982-2.106m.335-9.362A9.719 9.719 0 0012 5.25c-5.385 0-9.75 4.365-9.75 9.75 0 1.25.24 2.446.685 3.55" />
                    </svg>
                    <p className="text-slate-600 dark:text-slate-300 font-medium">Connection Lost</p>
                    <p className="text-slate-400 dark:text-slate-500 text-sm">Cannot generate story details while offline.</p>
                </div>
             )
          ) : (
            <>
              {/* Roots Recap */}
              <div className="flex flex-wrap gap-2 justify-center pb-2">
                 {wordData.roots.map((r, i) => (
                    <span key={i} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                        {r.part}: {r.meaning}
                    </span>
                 ))}
              </div>

              <div className="flex flex-col md:flex-row gap-8 items-start">
                 {/* Image */}
                 <div className="w-full md:w-1/2 flex-shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 relative group">
                        {wordData.imageUrl ? (
                           <img 
                            src={`data:image/png;base64,${wordData.imageUrl}`} 
                            alt={wordData.word}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                           />
                        ) : (
                           <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-4 text-center">
                               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-2 opacity-50">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                               </svg>
                               <span className="text-sm">{wordData.story ? "Image unavailable" : (isOnline ? "Generating..." : "Image not generated")}</span>
                           </div>
                        )}
                    </div>
                 </div>

                 {/* Story */}
                 <div className="w-full md:w-1/2 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
                        <h3 className="text-sm font-bold text-indigo-400 dark:text-indigo-400 uppercase tracking-widest mb-4">Story</h3>
                        {wordData.story ? (
                            <textarea
                                value={storyText}
                                onChange={(e) => setStoryText(e.target.value)}
                                onBlur={handleStoryBlur}
                                className="w-full min-h-[300px] bg-transparent serif text-slate-700 dark:text-slate-200 leading-8 text-lg border-0 focus:ring-0 resize-none p-0 outline-none placeholder-slate-400"
                                spellCheck={false}
                            />
                        ) : (
                            <div className="min-h-[300px] flex items-center justify-center text-slate-400 italic">
                                {isOnline ? "Story not available" : "Connect to internet to generate story"}
                            </div>
                        )}
                    </div>
                    
                    {/* Audio Controls */}
                    <div className="flex flex-col gap-3">
                        {wordData.storyAudioBase64 && audioUrl ? (
                           <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in">
                               <audio 
                                 ref={audioRef} 
                                 controls 
                                 src={audioUrl} 
                                 className="h-10 flex-1 rounded-full"
                               />
                               <button
                                  onClick={handleGenerateAudio}
                                  disabled={isGeneratingAudio || !isOnline}
                                  className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors disabled:opacity-50"
                                  title={isOnline ? "Regenerate Audio" : "Online required"}
                               >
                                    {isGeneratingAudio ? (
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                        </svg>
                                    )}
                               </button>
                               <button
                                  onClick={handleDownloadStory}
                                  className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                  title="Download Audio"
                               >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                  </svg>
                               </button>
                           </div>
                        ) : (
                           <button
                              onClick={handleGenerateAudio}
                              disabled={isGeneratingAudio || !storyText || !isOnline}
                              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-slate-400"
                              title={!isOnline ? "Online connection required" : "Generate Audio"}
                           >
                                {isGeneratingAudio ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Reading Story...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                        </svg>
                                        <span>{!isOnline ? 'Offline' : 'Read Aloud'}</span>
                                    </>
                                )}
                           </button>
                        )}
                    </div>
                 </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
