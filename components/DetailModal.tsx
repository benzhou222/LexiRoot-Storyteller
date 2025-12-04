
import React, { useState, useEffect, useRef } from 'react';
import { WordData, AppSettings } from '../types';
import { generateStoryAudio, generatePronunciation } from '../services/geminiService';
import { downloadAudio, createAudioUrl, playAudioData } from '../services/audioUtils';

interface DetailModalProps {
  wordData: WordData;
  settings: AppSettings;
  onClose: () => void;
  onUpdateWord: (id: string, updates: Partial<WordData>) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ wordData, settings, onClose, onUpdateWord }) => {
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlayingWord, setIsPlayingWord] = useState(false);
  const [isDownloadingWord, setIsDownloadingWord] = useState(false);
  const [pronunciationBase64, setPronunciationBase64] = useState<string | null>(null);
  
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    if (isDownloadingWord) return;

    setIsDownloadingWord(true);
    const base64 = await fetchPronunciationIfNeeded();
    if (base64) {
        downloadAudio(base64, `${wordData.word}_pronunciation.wav`);
    }
    setIsDownloadingWord(false);
  };

  const handleGenerateAudio = async () => {
    if (!wordData.story) return;
    setIsGeneratingAudio(true);
    try {
        const base64 = await generateStoryAudio(wordData.story, settings);
        onUpdateWord(wordData.id, { storyAudioBase64: base64 });
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

  // Prevent click propagation from the modal content to the backdrop
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 ring-1 ring-slate-900/5 dark:ring-white/10"
        onClick={handleContentClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mr-2">{wordData.word}</h2>
              
              <div className="flex items-center bg-slate-100 dark:bg-slate-700/50 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                <button
                    onClick={handlePlayWord}
                    className={`flex items-center gap-2 px-2 py-1 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded ${isPlayingWord ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : ''}`}
                    title="Play pronunciation"
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
                  disabled={isDownloadingWord}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded disabled:opacity-50"
                  title="Download Pronunciation"
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
        <div className="overflow-y-auto custom-scroll p-6 space-y-6">
          
          {/* Loading State or Content */}
          {wordData.isLoadingDetails ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-900 dark:border-t-indigo-500 rounded-full animate-spin"></div>
              <p className="text-slate-500 dark:text-slate-400 animate-pulse">Weaving a story and painting a picture...</p>
            </div>
          ) : (
            <>
               {/* Illustration */}
               {wordData.imageUrl && (
                <div className="w-full h-64 sm:h-80 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner flex items-center justify-center relative group">
                  <img 
                    src={`data:image/png;base64,${wordData.imageUrl}`} 
                    alt={`Illustration for ${wordData.word}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-md">
                    Generated by Gemini
                  </div>
                </div>
              )}

              {/* Roots Recap */}
              <div className="flex flex-wrap gap-2 justify-center">
                 {wordData.roots.map((r, i) => (
                    <span key={i} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                        {r.part}: {r.meaning}
                    </span>
                 ))}
              </div>

              {/* Story */}
              {wordData.story && (
                <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-6 rounded-xl border border-indigo-100/50 dark:border-indigo-800/50">
                  <h3 className="text-indigo-900 dark:text-indigo-300 font-semibold mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
                    </svg>
                    Memory Story
                  </h3>
                  <p className="serif text-slate-800 dark:text-slate-200 leading-7 text-lg mb-4">
                    {wordData.story}
                  </p>
                  
                  {/* Audio Controls */}
                  <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-800/50">
                    {wordData.storyAudioBase64 && audioUrl ? (
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <audio 
                          ref={audioRef} 
                          controls 
                          src={audioUrl} 
                          className="h-10 w-full sm:w-64 rounded-full"
                        />
                        <button
                          onClick={handleDownloadStory}
                          className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
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
                        disabled={isGeneratingAudio}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-70 disabled:cursor-wait shadow-sm"
                      >
                         {isGeneratingAudio ? (
                            <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Reading...</span>
                            </>
                         ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                </svg>
                                <span>Read Story Aloud</span>
                            </>
                         )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
