import React from 'react';
import { WordData } from '../types';

interface HistorySidebarProps {
  history: WordData[];
  onSelect: (id: string) => void;
  currentIds: string[];
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, onSelect, currentIds }) => {
  return (
    <div className="h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col w-full md:w-64 lg:w-72 shrink-0 transition-colors duration-300">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800">
        <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          History
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{history.length} words collected</p>
      </div>
      
      <div className="overflow-y-auto flex-1 custom-scroll p-3 space-y-2">
        {history.length === 0 && (
            <div className="text-center text-slate-400 dark:text-slate-500 text-sm mt-10 p-4">
                No history yet. Start exploring!
            </div>
        )}
        
        {/* Reverse mapping to show newest first */}
        {[...history].reverse().map((word) => (
          <button
            key={word.id}
            onClick={() => onSelect(word.id)}
            className={`w-full text-left p-3 rounded-lg transition-colors border ${
              currentIds.includes(word.id) 
                ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-700/50 shadow-sm' 
                : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent hover:border-slate-100 dark:hover:border-slate-700'
            }`}
          >
            <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">{word.word}</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 truncate mt-1">{word.meaning}</div>
          </button>
        ))}
      </div>
    </div>
  );
};