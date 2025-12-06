
import React, { useMemo, useRef } from 'react';
import { COMMON_ROOTS, CommonRoot } from '../services/rootData';

interface RootSidebarProps {
  onSelectRoot: (root: string) => void;
  isLoading: boolean;
}

export const RootSidebar: React.FC<RootSidebarProps> = ({ onSelectRoot, isLoading }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort roots alphabetically
  const sortedRoots = useMemo(() => {
    return [...COMMON_ROOTS].sort((a, b) => a.root.localeCompare(b.root));
  }, []);

  // Group roots by first letter
  const groupedRoots = useMemo(() => {
    const groups: Record<string, CommonRoot[]> = {};
    sortedRoots.forEach(item => {
      const firstLetter = item.root.charAt(0).toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(item);
    });
    return groups;
  }, [sortedRoots]);

  const letters = Object.keys(groupedRoots).sort();

  const scrollToLetter = (letter: string) => {
    const container = containerRef.current;
    if (!container) return;

    // Find the section specifically inside this container instance
    // This avoids conflicts if multiple sidebars exist in the DOM (e.g. mobile vs desktop views)
    const section = container.querySelector(`[data-letter="${letter}"]`) as HTMLElement;
    
    if (section) {
      // Calculate position relative to the container's visible area
      // offsetTop is unreliable with nested positioning, so we use coordinate geometry
      const containerRect = container.getBoundingClientRect();
      const sectionRect = section.getBoundingClientRect();
      
      // The distance from the top of the container to the top of the section
      const relativeTop = sectionRect.top - containerRect.top;
      
      // Add this distance to the current scroll position
      const targetScrollTop = container.scrollTop + relativeTop;
      
      container.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="h-full flex flex-col w-full">
      {/* Quick Navigation Bar */}
      {letters.length > 0 && (
        <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex flex-wrap gap-1 justify-center">
            {letters.map(letter => (
              <button
                key={letter}
                onClick={() => scrollToLetter(letter)}
                className="w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded-full text-slate-500 hover:text-white hover:bg-indigo-500 dark:text-slate-400 dark:hover:bg-indigo-600 transition-colors"
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Root List */}
      <div 
        ref={containerRef}
        className="overflow-y-auto flex-1 custom-scroll px-2 pt-10 pb-48 space-y-4 relative"
      >
        {letters.map(letter => (
            <div key={letter} data-letter={letter} className="relative">
                {/* Section Header */}
                <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-3 py-2 text-sm font-bold text-indigo-500 border-b border-indigo-100 dark:border-slate-800 mb-2 z-10 shadow-sm rounded-t-lg">
                    {letter}
                </div>
                
                {/* Items in this section */}
                <div className="space-y-1">
                    {groupedRoots[letter].map((item, index) => (
                        <button
                            key={`${letter}-${index}`}
                            onClick={() => onSelectRoot(item.root)}
                            disabled={isLoading}
                            className="w-full text-left p-3 rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            <div className="font-bold text-slate-700 dark:text-slate-200 text-sm font-mono group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {item.root}
                            </div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {item.meaning}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        ))}
        
        {letters.length === 0 && (
             <div className="text-center text-slate-400 dark:text-slate-500 text-sm mt-10 p-4">
                No roots found.
            </div>
        )}
      </div>
    </div>
  );
};
