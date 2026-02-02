import { PracticeSession } from '../types';
import { INITIAL_HISTORY } from '../constants';

const STORAGE_KEY = 'fretmaster_history';

export const HistoryService = {
  getHistory: (): PracticeSession[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
    return INITIAL_HISTORY as PracticeSession[];
  },

  addSession: (session: Omit<PracticeSession, 'id'>) => {
    const current = HistoryService.getHistory();
    const newSession: PracticeSession = {
      ...session,
      id: crypto.randomUUID(),
    };
    const updated = [...current, newSession];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },

  importCSV: (csvText: string): PracticeSession[] => {
    // Expected headers: Date,Chord A,Chord B,Count,BPM
    // Or just lenient parsing
    const lines = csvText.split('\n');
    const newSessions: PracticeSession[] = [];
    
    // Skip header if present (heuristic: checks if first line contains 'Date')
    let startIndex = 0;
    if (lines[0].toLowerCase().includes('date')) {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',');
        if (parts.length >= 5) {
            // Basic validation
            newSessions.push({
                id: crypto.randomUUID(),
                date: parts[0].trim(),
                chordA: parts[1].trim(),
                chordB: parts[2].trim(),
                count: parseInt(parts[3]) || 0,
                bpm: parseInt(parts[4]) || 0,
                durationSeconds: 60 // Default or unknown if not in CSV
            });
        }
    }

    if (newSessions.length > 0) {
        const current = HistoryService.getHistory();
        const updated = [...current, ...newSessions];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
    }
    return HistoryService.getHistory();
  }
};
