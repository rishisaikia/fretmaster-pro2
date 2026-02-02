import React, { useState } from 'react';
import { ViewState } from './types';
import MetronomeView from './components/MetronomeView';
import LibraryView from './components/LibraryView';
import TrainerView from './components/TrainerView';
import HistoryView from './components/HistoryView';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.METRONOME);
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const renderView = () => {
    switch (view) {
      case ViewState.METRONOME: return <MetronomeView />;
      case ViewState.LIBRARY: return <LibraryView />;
      case ViewState.TRAINER: return <TrainerView />;
      case ViewState.HISTORY: return <HistoryView />;
      default: return <MetronomeView />;
    }
  };

  const getTitle = () => {
    switch (view) {
      case ViewState.METRONOME: return 'Precision Metronome';
      case ViewState.LIBRARY: return 'Chord Library';
      case ViewState.TRAINER: return 'Change Trainer';
      case ViewState.HISTORY: return 'Practice History';
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-background transition-colors duration-300 shadow-2xl relative">
      {/* Header */}
      <header className="flex items-center justify-between p-4 z-20 bg-background/95 backdrop-blur-md sticky top-0 transition-colors duration-300 border-b border-gray-800/20">
        <div className="size-10"></div>
        <h1 className="text-lg font-bold tracking-tight text-txt transition-colors">{getTitle()}</h1>
        <button onClick={toggleTheme} className="size-10 flex items-center justify-center rounded-full hover:bg-gray-500/10 transition-colors">
          <span className="material-symbols-outlined text-gray-400">{isDark ? 'light_mode' : 'dark_mode'}</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {renderView()}
      </main>

      {/* Bottom Nav */}
      <nav className="h-20 bg-card border-t border-gray-800 flex justify-around items-center px-2 pb-2 z-30 shrink-0">
        <button
          onClick={() => setView(ViewState.METRONOME)}
          className={`flex flex-col items-center justify-center w-16 gap-1 group transition-colors ${view === ViewState.METRONOME ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <span className={`material-symbols-outlined text-[26px] ${view === ViewState.METRONOME ? 'fill-current' : ''}`}>timer</span>
          <span className="text-[10px] font-medium">Metronome</span>
        </button>
        <button
          onClick={() => setView(ViewState.LIBRARY)}
          className={`flex flex-col items-center justify-center w-16 gap-1 group transition-colors ${view === ViewState.LIBRARY ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <span className={`material-symbols-outlined text-[26px] ${view === ViewState.LIBRARY ? 'fill-current' : ''}`}>library_music</span>
          <span className="text-[10px] font-medium">Library</span>
        </button>
        <button
          onClick={() => setView(ViewState.TRAINER)}
          className={`flex flex-col items-center justify-center w-16 gap-1 group transition-colors ${view === ViewState.TRAINER ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <span className={`material-symbols-outlined text-[26px] ${view === ViewState.TRAINER ? 'fill-current' : ''}`}>graphic_eq</span>
          <span className="text-[10px] font-medium">Trainer</span>
        </button>
        <button
          onClick={() => setView(ViewState.HISTORY)}
          className={`flex flex-col items-center justify-center w-16 gap-1 group transition-colors ${view === ViewState.HISTORY ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <span className={`material-symbols-outlined text-[26px] ${view === ViewState.HISTORY ? 'fill-current' : ''}`}>history</span>
          <span className="text-[10px] font-medium">History</span>
        </button>
      </nav>
    </div>
  );
};

export default App;