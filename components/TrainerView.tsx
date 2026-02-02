import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CHORD_DB } from '../constants';
import { StrumDetector } from '../services/audioService';
import { RecommendationService, Recommendation, TARGET_BPM_BARRE, TARGET_BPM_OPEN } from '../services/recommendationService';
import { HistoryService } from '../services/historyService';

const TrainerView: React.FC = () => {
    // Session State
    const [isActive, setIsActive] = useState(false);
    const [listening, setListening] = useState(false);
    const [count, setCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);

    // Config State
    const [chordA, setChordA] = useState('C');
    const [chordB, setChordB] = useState('G');

    // Modal State
    const [showReview, setShowReview] = useState(false);
    const [reviewCount, setReviewCount] = useState(0);

    // Reffing
    const detectorRef = useRef<StrumDetector | null>(null);
    const timerRef = useRef<number | null>(null);

    // Derived State
    const targetBpm = useMemo(() => {
        return RecommendationService.getTargetBpm(chordA, chordB);
    }, [chordA, chordB]);

    const recommendations = useMemo(() => {
        return RecommendationService.getRecommendations();
    }, [chordA, chordB]); // Update when selection changes? Maybe just on mount or history change. For now fine.

    useEffect(() => {
        return () => {
            if (detectorRef.current) detectorRef.current.stop();
            if (timerRef.current) window.clearInterval(timerRef.current);
        };
    }, []);

    // Timer Logic
    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = window.setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        finishSession();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (!isActive && timerRef.current) {
            window.clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current);
        };
    }, [isActive]);

    const startSession = async () => {
        setCount(0);
        setTimeLeft(60);
        setIsActive(true);
        setListening(true);

        if (!detectorRef.current) {
            detectorRef.current = new StrumDetector();
        }
        await detectorRef.current.start(() => {
            setCount(prev => prev + 1);
        });
    };

    const finishSession = () => {
        if (detectorRef.current) detectorRef.current.stop();
        setIsActive(false);
        setListening(false);
        // Show Modal
        setReviewCount(count); // In a real app we'd use 'count' from state but let's grab it safely
        // Wait for state update to settle if needed, but here simple sync set is fine as detected count is stable
        setShowReview(true);
    };

    // Since 'count' state might be stale inside finishSession closure if not careful, 
    // let's rely on effect or just pass it? 'count' updates trigger render, so finishSession closing over 'count' 
    // depends on when it's defined. 
    // Better idea: use a ref for count or just update reviewCount in an effect when showReview becomes true.
    useEffect(() => {
        if (showReview) {
            setReviewCount(count);
        }
    }, [showReview]);


    const saveSession = () => {
        const duration = 60 - timeLeft; // Should be 60 if ran fully, or partial if stopped early
        const actualDuration = duration < 5 ? 60 : duration; // Default to 60 if glitch

        const calculatedBpm = Math.round((reviewCount / actualDuration) * 60);

        HistoryService.addSession({
            date: new Date().toISOString().split('T')[0],
            chordA,
            chordB,
            count: reviewCount,
            bpm: calculatedBpm,
            durationSeconds: Math.round(actualDuration)
        });

        setShowReview(false);
        setCount(0);
        setTimeLeft(60);
        // User stays on screen to pick next pair
    };

    const handleRecommendationClick = (rec: Recommendation) => {
        setChordA(rec.chordA.id);
        setChordB(rec.chordB.id);
    };

    const { openChords, barreChords, otherChords } = useMemo(() => {
        const open = CHORD_DB.filter(c => c.type === 'open');
        const barre = CHORD_DB.filter(c => c.type === 'barre');
        const other = CHORD_DB.filter(c => c.type !== 'open' && c.type !== 'barre');
        const sorter = (a: any, b: any) => a.name.localeCompare(b.name);
        return {
            openChords: open.sort(sorter),
            barreChords: barre.sort(sorter),
            otherChords: other.sort(sorter)
        };
    }, []);

    const renderChordOptions = () => (
        <>
            <optgroup label="Open Chords" className="bg-card text-txt font-bold">
                {openChords.map(c => <option key={c.id} value={c.id} className="bg-card text-txt font-normal">{c.name}</option>)}
            </optgroup>
            <optgroup label="Barre Chords" className="bg-card text-txt font-bold">
                {barreChords.map(c => <option key={c.id} value={c.id} className="bg-card text-txt font-normal">{c.name}</option>)}
            </optgroup>
            {otherChords.length > 0 && (
                <optgroup label="Other Chords" className="bg-card text-txt font-bold">
                    {otherChords.map(c => <option key={c.id} value={c.id} className="bg-card text-txt font-normal">{c.name}</option>)}
                </optgroup>
            )}
        </>
    );

    return (
        <div className="flex-1 flex flex-col px-6 py-6 h-full relative overflow-hidden">

            {/* Review Modal */}
            {showReview && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-card border border-gray-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-txt mb-2">Session Complete!</h2>
                        <p className="text-gray-500 text-sm mb-6">Review your results before saving.</p>

                        <div className="mb-6 text-center">
                            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Detected Changes</span>
                            <div className="flex items-center justify-center gap-4 mt-2">
                                <button onClick={() => setReviewCount(Math.max(0, reviewCount - 1))} className="size-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-txt hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">
                                    <span className="material-symbols-outlined">remove</span>
                                </button>
                                <span className="text-5xl font-bold text-txt w-24 text-center">{reviewCount}</span>
                                <button onClick={() => setReviewCount(reviewCount + 1)} className="size-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-txt hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">
                                    <span className="material-symbols-outlined">add</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowReview(false)}
                                className="flex-1 py-4 rounded-xl font-bold text-gray-400 hover:bg-gray-800 transition-colors"
                            >
                                Discard
                            </button>
                            <button
                                onClick={saveSession}
                                className="flex-1 py-4 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-primary/90 transition-colors"
                            >
                                Save Session
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Recommendations */}
            {!isActive && (
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Suggested For You</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                        {recommendations.map((rec, i) => (
                            <button
                                key={i}
                                onClick={() => handleRecommendationClick(rec)}
                                className="shrink-0 bg-card border border-gray-800 hover:border-primary/50 transition-colors rounded-xl p-3 flex flex-col items-start min-w-[140px] group"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold text-txt group-hover:text-primary transition-colors">{rec.chordA.name}</span>
                                    <span className="material-symbols-outlined text-xs text-gray-600">sync_alt</span>
                                    <span className="text-sm font-bold text-txt group-hover:text-primary transition-colors">{rec.chordB.name}</span>
                                </div>
                                <span className="text-[10px] text-gray-500 font-medium">{rec.reason}</span>
                                {rec.isMastered && (
                                    <span className="mt-1 text-[10px] text-green-500 font-bold flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[10px]">check_circle</span> Mastered
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Config / Target */}
            <div className={`transition-all duration-500 ease-in-out ${isActive ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Target Chords</span>
                    <div className="flex items-center gap-2 px-3 py-1 bg-card border border-gray-700 shadow-sm rounded-full">
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Target</span>
                        <span className="text-xs font-bold text-primary">{targetBpm} BPM</span>
                    </div>
                </div>
                <div className="flex gap-4 items-stretch mb-8">
                    <div className="flex-1 min-w-0">
                        <select
                            value={chordA}
                            onChange={(e) => setChordA(e.target.value)}
                            className="w-full bg-card border border-gray-700 rounded-xl p-4 text-xl font-bold appearance-none outline-none focus:border-primary truncate text-txt"
                        >
                            {renderChordOptions()}
                        </select>
                    </div>
                    <div className="flex items-center text-gray-600 shrink-0">
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <select
                            value={chordB}
                            onChange={(e) => setChordB(e.target.value)}
                            className="w-full bg-card border border-gray-700 rounded-xl p-4 text-xl font-bold appearance-none outline-none focus:border-primary truncate text-txt"
                        >
                            {renderChordOptions()}
                        </select>
                    </div>
                </div>
            </div>

            {/* Active View */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
                {isActive && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none animate-pulse"></div>
                )}

                <div className="z-10 flex flex-col items-center">
                    <span className="text-[140px] font-bold leading-none tracking-tighter text-txt drop-shadow-2xl">
                        {count}
                    </span>
                    <span className="text-gray-400 font-medium tracking-[0.3em] mt-4 uppercase">Repetitions</span>
                </div>

                {/* Timer Display */}
                {isActive && (
                    <div className="mt-8">
                        <div className="text-2xl font-bold text-white font-mono bg-gray-900/50 px-6 py-2 rounded-full border border-gray-700">
                            00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                        </div>
                    </div>
                )}

                {listening && !isActive && (
                    <p className="text-gray-500 mt-4">Preparing...</p>
                )}
            </div>

            {/* Control */}
            <div className="mt-auto">
                <button
                    onClick={isActive ? finishSession : startSession}
                    className={`w-full h-16 rounded-xl flex items-center justify-center gap-3 text-lg font-bold tracking-wide transition-all ${isActive
                        ? 'bg-card border border-gray-700 text-white hover:bg-gray-800'
                        : 'bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary/90'
                        }`}
                >
                    {isActive ? (
                        <>
                            <span className="material-symbols-outlined">stop_circle</span>
                            Stop & Review
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">play_arrow</span>
                            Start Training
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default TrainerView;