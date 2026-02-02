import React, { useState, useEffect, useRef } from 'react';
import { MetronomeEngine } from '../services/audioService';
import { TimeSignature } from '../types';

const engine = new MetronomeEngine();

const MetronomeView: React.FC = () => {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeSig, setTimeSig] = useState<TimeSignature>('4/4');
  const [activeBeat, setActiveBeat] = useState(-1);

  useEffect(() => {
    engine.setCallback((beat) => {
      setActiveBeat(beat);
    });
    return () => engine.stop();
  }, []);

  useEffect(() => {
    engine.setBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    const beats = parseInt(timeSig.split('/')[0]);
    engine.setTimeSignature(beats);
  }, [timeSig]);

  const togglePlay = () => {
    if (isPlaying) {
      engine.stop();
      setActiveBeat(-1);
    } else {
      engine.start();
    }
    setIsPlaying(!isPlaying);
  };

  const handleBpmChange = (delta: number) => {
    setBpm(prev => Math.max(30, Math.min(300, prev + delta)));
  };

  const beatsPerBar = parseInt(timeSig.split('/')[0]);

  // SVG Config
  const size = 288; // size-72
  const strokeWidth = 12;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2 - 10; // Slight padding
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex-1 flex flex-col items-center justify-between py-6 px-6 max-w-md mx-auto w-full">
      {/* Time Sig */}
      <div className="w-full bg-card p-1 rounded-xl flex border border-gray-800">
        {['4/4', '3/4', '6/8'].map((sig) => (
          <button
            key={sig}
            onClick={() => setTimeSig(sig as TimeSignature)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${timeSig === sig ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-txt'
              }`}
          >
            {sig}
          </button>
        ))}
      </div>

      {/* Main Dial */}
      <div className="relative my-8 group">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
        <div className="relative size-72 rounded-full bg-card shadow-2xl flex items-center justify-center">
          {/* SVG Ring */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox={`0 0 ${size} ${size}`}
          >
            {/* Background Track */}
            <circle
              cx={center} cy={center} r={radius}
              fill="none"
              stroke="#1f2937" /* gray-800 */
              strokeWidth={strokeWidth}
            />
            {/* Progress Indicator */}
            <circle
              cx={center} cy={center} r={radius}
              fill="none"
              stroke="#308ce8"
              strokeWidth={strokeWidth}
              strokeDasharray={`${(bpm / 300) * circumference} ${circumference}`}
              strokeLinecap="round"
              className="transition-all duration-300 ease-out"
            />
          </svg>

          <div className="flex flex-col items-center z-10">
            <span className="text-7xl font-bold tracking-tighter text-txt transition-colors">{bpm}</span>
            <span className="text-primary text-sm font-bold tracking-[0.2em] mt-2">BPM</span>
          </div>

          <div className="absolute bottom-12 w-full flex justify-center gap-12 px-12 z-20">
            <button onClick={() => handleBpmChange(-1)} className="size-12 rounded-full bg-card hover:bg-gray-200 dark:hover:bg-gray-700 text-txt flex items-center justify-center transition-colors shadow-lg border border-gray-200 dark:border-gray-700">
              <span className="material-symbols-outlined">remove</span>
            </button>
            <button onClick={() => handleBpmChange(1)} className="size-12 rounded-full bg-card hover:bg-gray-200 dark:hover:bg-gray-700 text-txt flex items-center justify-center transition-colors shadow-lg border border-gray-200 dark:border-gray-700">
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Beat Indicators */}
      <div className="flex gap-4 h-8 items-center">
        {Array.from({ length: beatsPerBar }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-75 ${activeBeat === i
              ? 'size-5 bg-primary shadow-[0_0_15px_rgba(48,140,232,0.8)] ring-2 ring-primary ring-opacity-50'
              : 'size-3 bg-gray-700'
              }`}
          />
        ))}
      </div>

      {/* Slider */}
      <div className="w-full px-4 mb-6">
        <input
          type="range"
          min="30"
          max="300"
          value={bpm}
          onChange={(e) => setBpm(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary"
        />
      </div>

      {/* Play Button */}
      <div className="w-full">
        <button
          onClick={togglePlay}
          className={`w-full h-16 rounded-2xl flex items-center justify-center gap-3 text-lg font-bold tracking-wider transition-all active:scale-[0.98] ${isPlaying ? 'bg-red-500/10 text-red-500 border border-red-500/50' : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90'
            }`}
        >
          <span className="material-symbols-outlined text-3xl">
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
          {isPlaying ? 'STOP' : 'START'}
        </button>
      </div>
    </div>
  );
};

export default MetronomeView;