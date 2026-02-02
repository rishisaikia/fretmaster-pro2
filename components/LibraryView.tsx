import React, { useState, useMemo } from 'react';
import { CHORD_DB } from '../constants';
import Fretboard from './Fretboard';

const LibraryView: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'open' | 'barre' | 'favorites'>('all');
    const [favorites, setFavorites] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem('fretmaster_favorites');
            return stored ? JSON.parse(stored) : [];
        } catch { return []; }
    });

    const toggleFavorite = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setFavorites(prev => {
            const next = prev.includes(id)
                ? prev.filter(f => f !== id)
                : [...prev, id];
            localStorage.setItem('fretmaster_favorites', JSON.stringify(next));
            return next;
        });
    };

    const filteredChords = useMemo(() => {
        return CHORD_DB.filter(chord => {
            const matchesSearch = chord.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = filter === 'all'
                ? true
                : filter === 'favorites'
                    ? favorites.includes(chord.id)
                    : chord.type === filter;
            return matchesSearch && matchesFilter;
        });
    }, [searchTerm, filter]);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <div className="px-4 py-2 sticky top-0 z-40 bg-dark/95 backdrop-blur-sm border-b border-gray-800">
                <div className="relative mb-3">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-gray-500">search</span>
                    </span>
                    <input
                        type="text"
                        placeholder="Search chords (e.g. Cmaj7)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-card rounded-xl border-none text-white placeholder-gray-500 focus:ring-2 focus:ring-primary outline-none"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {['All', 'Favorites', 'Open', 'Barre'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f.toLowerCase() as any)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f.toLowerCase()
                                ? 'bg-primary text-white'
                                : 'bg-card text-gray-400 hover:bg-gray-800'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-24">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {filteredChords.slice(0, 50).map((chord) => ( // Limiting render for demo performance
                        <div key={chord.id} className="bg-card rounded-2xl p-4 flex flex-col items-center gap-2 border border-transparent hover:border-primary/30 transition-all cursor-pointer group active:scale-[0.98]">
                            <div className="flex justify-between w-full items-start">
                                <h3 className="font-bold text-lg">{chord.key}<span className="text-gray-400 text-sm font-normal ml-1">{chord.suffix}</span></h3>
                                <button
                                    onClick={(e) => toggleFavorite(e, chord.id)}
                                    className={`material-symbols-outlined transition-all text-xl p-2 rounded-full ${favorites.includes(chord.id) ? 'text-red-500 hover:scale-110 active:scale-95' : 'text-gray-400 hover:text-red-500 hover:scale-110 active:scale-95'}`}
                                >
                                    {favorites.includes(chord.id) ? 'favorite' : 'favorite_border'}
                                </button>
                            </div>
                            <div className="w-24 h-28">
                                <Fretboard position={chord.positions[0]} />
                            </div>
                        </div>
                    ))}
                </div>
                {filteredChords.length === 0 && (
                    <div className="text-center text-gray-500 mt-20">No chords found.</div>
                )}
            </div>
        </div>
    );
};

export default LibraryView;