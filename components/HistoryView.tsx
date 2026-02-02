import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { HistoryService } from '../services/historyService';
import { RecommendationService } from '../services/recommendationService';
import { PracticeSession } from '../types';

const HistoryView: React.FC = () => {
    const [data, setData] = useState<PracticeSession[]>([]);
    const [selectedPair, setSelectedPair] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const history = HistoryService.getHistory();
        setData(history);
        // Set default selection if empty
        if (history.length > 0 && !selectedPair) {
            const [a, b] = [history[0].chordA, history[0].chordB].sort();
            setSelectedPair(`${a}-${b}`);
        }
    }, [selectedPair]); // Added dependency to suppress linter, though logic is fine

    const uniquePairs = useMemo(() => {
        const pairs = new Set<string>();
        data.forEach(d => {
            const [a, b] = [d.chordA, d.chordB].sort();
            pairs.add(`${a}-${b}`);
        });
        return Array.from(pairs);
    }, [data]);

    const filteredData = useMemo(() => {
        if (!selectedPair) return [];
        return data.filter(d => {
            const [a, b] = [d.chordA, d.chordB].sort();
            return `${a}-${b}` === selectedPair;
        });
    }, [data, selectedPair]);

    const selectSessionPair = (chordA: string, chordB: string) => {
        const [a, b] = [chordA, chordB].sort();
        setSelectedPair(`${a}-${b}`);
        // Scroll to top to see graph
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const downloadCSV = () => {
        const headers = ['Date', 'Chord A', 'Chord B', 'Count', 'BPM'];
        const rows = data.map(d => [d.date, d.chordA, d.chordB, d.count, d.bpm].join(','));
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "guitar_practice_data.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (text) {
                const updated = HistoryService.importCSV(text);
                setData(updated);
                alert('History imported successfully!');
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    };

    const getPairLabel = (pairKey: string) => {
        if (!pairKey) return 'Select Pair';
        const [a, b] = pairKey.split('-');
        return `${a} ⇄ ${b}`;
    };

    const maxBpm = useMemo(() => {
        if (filteredData.length === 0) return 0;
        return Math.max(...filteredData.map(d => d.bpm));
    }, [filteredData]);

    return (
        <div className="flex-1 flex flex-col p-4 pb-20 overflow-y-auto">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
            />

            {/* Selector */}
            <div className="mb-6">
                <label className="text-sm font-medium text-gray-400 ml-1 block mb-2">Selected Chord Pair</label>
                <div className="relative">
                    <select
                        value={selectedPair}
                        onChange={(e) => setSelectedPair(e.target.value)}
                        className="w-full bg-card appearance-none rounded-xl border border-transparent py-4 pl-4 pr-10 text-white font-bold text-lg outline-none focus:ring-2 focus:ring-primary"
                    >
                        {uniquePairs.map(pair => (
                            <option key={pair} value={pair}>{getPairLabel(pair)}</option>
                        ))}
                        {uniquePairs.length === 0 && <option value="">No History Yet</option>}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                        <span className="material-symbols-outlined">expand_more</span>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-gray-800 mb-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-sm text-gray-400 font-medium mb-1">Max Speed</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-white">{maxBpm} <span className="text-lg text-primary">BPM</span></h3>
                        </div>
                    </div>
                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">monitoring</span>
                    </div>
                </div>

                <div className="h-48 w-full -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredData}>
                            <defs>
                                <linearGradient id="colorBpm" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#308ce8" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#308ce8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(val) => val.slice(5)} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#111921', borderColor: '#308ce8', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="bpm" stroke="#308ce8" strokeWidth={3} fillOpacity={1} fill="url(#colorBpm)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Practice Goals */}
            <div className="mb-6 bg-card rounded-2xl p-6 shadow-sm border border-gray-800">
                <h3 className="font-bold text-lg mb-4 text-txt">Practice Goals</h3>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Open Chords</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-2 text-white font-bold"
                                defaultValue={RecommendationService.getGlobalTargets().open}
                                onBlur={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val)) {
                                        const current = RecommendationService.getGlobalTargets();
                                        RecommendationService.setGlobalTargets(val, current.barre);
                                    }
                                }}
                            />
                            <span className="text-xs font-bold text-primary">BPM</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Barre Chords</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-2 text-white font-bold"
                                defaultValue={RecommendationService.getGlobalTargets().barre}
                                onBlur={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val)) {
                                        const current = RecommendationService.getGlobalTargets();
                                        RecommendationService.setGlobalTargets(current.open, val);
                                    }
                                }}
                            />
                            <span className="text-xs font-bold text-primary">BPM</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <button onClick={downloadCSV} className="flex items-center justify-center gap-2 bg-card hover:bg-gray-800 p-4 rounded-xl border border-gray-800 transition-colors group">
                    <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">download</span>
                    <span className="font-bold text-sm text-txt">Download CSV</span>
                </button>
                <button onClick={handleUploadClick} className="flex items-center justify-center gap-2 bg-card hover:bg-gray-800 p-4 rounded-xl border border-gray-800 transition-colors group">
                    <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">upload</span>
                    <span className="font-bold text-sm text-txt">Upload CSV</span>
                </button>
            </div>

            {/* List */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Recent Sessions</h3>
                    {/* <button className="text-primary text-xs font-bold">View All</button> */}
                </div>


                <div className="flex flex-col gap-3">
                    {data.slice().reverse().map((session, idx) => {
                        const isMastered = RecommendationService.isPairMastered(session.chordA, session.chordB);
                        return (
                            <div
                                key={session.id || idx}
                                onClick={() => selectSessionPair(session.chordA, session.chordB)}
                                className={`bg-card p-4 rounded-xl flex items-center justify-between border transition-colors cursor-pointer active:scale-[0.98] ${isMastered ? 'border-green-500/30' : 'border-transparent hover:border-gray-700'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`size-10 rounded-lg flex items-center justify-center ${isMastered ? 'bg-green-500/10 text-green-500' : 'bg-gray-800 text-gray-400'}`}>
                                        <span className="material-symbols-outlined">{isMastered ? 'check_circle' : 'music_note'}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-white flex items-center gap-2">
                                            {session.chordA} ⇄ {session.chordB}
                                            {isMastered && <span className="text-[10px] bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded font-bold uppercase">Mastered</span>}
                                        </p>
                                        <p className="text-xs text-gray-500">{session.date}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg">{session.bpm}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">BPM</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default HistoryView;