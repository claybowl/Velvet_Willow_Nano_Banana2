/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface HeaderProps {
  onReset?: () => void;
  currentView?: 'studio' | 'dashboard';
  onViewChange?: (view: 'studio' | 'dashboard') => void;
}

const Header: React.FC<HeaderProps> = ({ onReset, currentView = 'studio', onViewChange }) => {
  return (
    <header className="w-full bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between z-20 relative">
      <div className="flex items-center gap-8">
        <div className="flex flex-col">
          <h1 className="font-serif text-2xl italic text-zinc-800 tracking-wide leading-tight">
            Velvet Willow
          </h1>
          <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-400 font-medium">Event Rentals &bull; Osage Hills, OK</span>
        </div>
        <div className="hidden md:flex items-center gap-1 text-xs font-semibold tracking-widest h-full pt-1">
            <span className="border-l border-zinc-200 h-4 mx-2"></span>
            <button 
              onClick={() => onViewChange?.('studio')}
              className={`transition-colors px-2 ${currentView === 'studio' ? 'text-zinc-900 border-b-2 border-zinc-900 pb-1' : 'text-zinc-400 hover:text-zinc-600 pb-1 border-b-2 border-transparent'}`}
            >
              STUDIO
            </button>
            <button 
              onClick={() => onViewChange?.('dashboard')}
              className={`transition-colors px-2 ${currentView === 'dashboard' ? 'text-zinc-900 border-b-2 border-zinc-900 pb-1' : 'text-zinc-400 hover:text-zinc-600 pb-1 border-b-2 border-transparent'}`}
            >
              DASHBOARD
            </button>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {currentView === 'studio' && (
          <button 
              onClick={onReset}
              className="hidden md:block text-xs font-semibold tracking-widest text-zinc-500 hover:text-zinc-800 uppercase transition-colors"
          >
              Clear Canvas
          </button>
        )}
        <button className="bg-zinc-900 text-white text-xs font-semibold tracking-widest px-6 py-3 rounded-full uppercase hover:bg-zinc-700 transition-colors">
            Request Quote (0)
        </button>
      </div>
    </header>
  );
};

export default Header;