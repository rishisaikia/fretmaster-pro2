import { CHORD_DB, TARGET_BPM_OPEN, TARGET_BPM_BARRE } from '../constants';
import { HistoryService } from './historyService';

export interface Recommendation {
    chordA: any; // Chord Object
    chordB: any; // Chord Object
    reason: string;
    level: number;
    lastBpm?: number;
    isMastered: boolean;
}

export { TARGET_BPM_OPEN, TARGET_BPM_BARRE };

// Hardcoded interesting pairs for progression
const PROGRESSION_PAIRS = [
    // Level 1: Basic Open
    ['Em', 'Am'], ['C', 'G'], ['D', 'A'], ['Am', 'C'], ['Em', 'G'],
    ['D', 'G'], ['A', 'E'], ['C', 'Dm'], ['Am', 'Dm'], ['G', 'Em'],
    // Level 2: Intermixing / Harder Open / Easy F
    ['C', 'F'], ['G', 'D'], ['A', 'D'], ['F', 'Am'], ['Dm', 'G'],
    ['E', 'Am'], ['Dm', 'A'], ['C', 'E'],
    // Level 3: Barre Chords
    ['Bm', 'F#'], ['Gm', 'Cm'], ['F', 'Bb'], ['Bm', 'Em'], ['F#', 'B']
];

export const RecommendationService = {
    // Custom Target Persistence
    getGlobalTargets: () => {
        try {
            const open = localStorage.getItem('target_open');
            const barre = localStorage.getItem('target_barre');
            return {
                open: open ? parseInt(open) : TARGET_BPM_OPEN,
                barre: barre ? parseInt(barre) : TARGET_BPM_BARRE
            };
        } catch (e) {
            return { open: TARGET_BPM_OPEN, barre: TARGET_BPM_BARRE };
        }
    },

    setGlobalTargets: (open: number, barre: number) => {
        localStorage.setItem('target_open', open.toString());
        localStorage.setItem('target_barre', barre.toString());
    },

    getTargetBpm: (chordAId: string, chordBId: string) => {
        const cA = CHORD_DB.find(c => c.id === chordAId);
        const cB = CHORD_DB.find(c => c.id === chordBId);
        const hasBarre = (cA?.type === 'barre' || cB?.type === 'barre');
        const targets = RecommendationService.getGlobalTargets();
        return hasBarre ? targets.barre : targets.open;
    },

    isPairMastered: (chordA: string, chordB: string) => {
        const history = HistoryService.getHistory();
        // Filter for this pair (agnostic)
        const pairHistory = history.filter(h => {
            const [hA, hB] = [h.chordA, h.chordB].sort();
            const [tA, tB] = [chordA, chordB].sort();
            return hA === tA && hB === tB;
        });

        if (pairHistory.length < 3) return false;

        // Check last 3 sessions
        // Sort by date/time (HistoryService usually appends, so take last 3)
        const last3 = pairHistory.slice(-3);
        const target = RecommendationService.getTargetBpm(chordA, chordB);

        return last3.every(s => s.bpm >= target);
    },

    getRecommendations: (): Recommendation[] => {
        // Logic: Find user's "Level". 
        // Level 1: < 5 mastered pairs of Level 1 list?
        // Actually simpler: Just return 5 relevant pairs.
        // - 1 pair they are working on (active history but not mastered)
        // - 2 pairs from current estimated level
        // - 1 pair "Review" (mastered)
        // - 1 pair "Challenge" (next level)

        // Identify Mastered Pairs
        const masteredPairs = new Set<string>();
        PROGRESSION_PAIRS.forEach(([a, b]) => {
            if (RecommendationService.isPairMastered(a, b)) {
                masteredPairs.add(`${a}-${b}`);
            }
        });

        const recs: Recommendation[] = [];

        // Helper to find Chord Obj
        const getChord = (id: string) => CHORD_DB.find(c => c.id === id);

        // 1. Pick something in progress (in history but not mastered)
        // Implementation omitted for brevity, let's stick to progression list for MVP

        // Select candidates from Progression Pairs that are NOT mastered
        const candidates = PROGRESSION_PAIRS.filter(([a, b]) => !masteredPairs.has(`${a}-${b}`));

        // Take top 3 candidates (assumes list is ordered by difficulty)
        candidates.slice(0, 4).forEach(([a, b]) => {
            const cA = getChord(a);
            const cB = getChord(b);
            if (cA && cB) {
                recs.push({
                    chordA: cA,
                    chordB: cB,
                    reason: 'Suggested for you',
                    level: 1, // simplified
                    isMastered: false
                });
            }
        });

        // Add one mastered for review if available
        if (masteredPairs.size > 0) {
            const [a, b] = Array.from(masteredPairs)[0].split('-');
            const cA = getChord(a);
            const cB = getChord(b);
            if (cA && cB) {
                recs.push({
                    chordA: cA,
                    chordB: cB,
                    reason: 'Review Review',
                    level: 1,
                    isMastered: true
                });
            }
        }

        // Fill if empty
        if (recs.length === 0) {
            // Fallback
            const [a, b] = ['Em', 'Am'];
            recs.push({ chordA: getChord(a)!, chordB: getChord(b)!, reason: 'Start Here', level: 1, isMastered: false });
        }

        return recs;
    }
};
