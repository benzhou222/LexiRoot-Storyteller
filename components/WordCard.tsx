
import React, { useState } from 'react';
import { WordData, AppSettings } from '../types';
import { playWordPronunciation } from '../services/geminiService';

interface WordCardProps {
  data: WordData;
  settings: AppSettings;
  onClick: (id: string) => void;
}

export const WordCard: React.FC<WordCardProps> = ({ data, settings, onClick }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleAudioClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (isPlaying) return;
    
    setIsPlaying(true);
    await playWordPronunciation(data.word, settings);
    setIsPlaying(false);
  };

  return (
    <div 
      onClick={() => onClick(data.id)}
      className="group relative bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
      
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{data.word}</h2>
          
          {/* Invisible/Subtle Audio Button */}
          <button
            onClick={handleAudioClick}
            className={`text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-mono text-sm px-2 py-1 rounded transition-colors flex items-center gap-1 ${isPlaying ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : ''}`}
            title="Click to hear pronunciation"
          >
            <span className="opacity-70">/ {data.phonetic} /</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
              <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.061z" />
            </svg>
          </button>
        </div>
        
        <p className="text-slate-600 dark:text-slate-300 mb-6 italic serif leading-relaxed">
          {data.meaning}
        </p>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
        <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Root Breakdown</h3>
        <div className="flex flex-wrap gap-2">
          {data.roots.map((root, index) => (
            <span key={index} className="inline-flex items-center text-xs text-indigo-900 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md border border-indigo-100 dark:border-indigo-800">
              <span className="font-bold mr-1">{root.part}</span>
              <span className="text-indigo-400 dark:text-indigo-400 mx-1">•</span>
              <span className="text-indigo-700 dark:text-indigo-300 opacity-80">{root.meaning}</span>
            </span>
          ))}
        </div>
      </div>
      
      <div className="mt-4 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
         <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">Click for Story & Illustration</span>
      </div>
    </div>
  );
};
