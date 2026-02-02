import { Chord } from './types';

// ==========================================
// CONFIGURATION (Edit these values)
// ==========================================
export const TARGET_BPM_OPEN = 100;
export const TARGET_BPM_BARRE = 80;
// ==========================================

export const CHORD_DB: Chord[] = [];

// ------------------------------------------------------------------
// CAGED SYSTEM GENERATOR
// ------------------------------------------------------------------
// Logic:
// 1. Define base shapes (E, A, D, G, C) for various qualities (Major, Minor, 7, etc).
// 2. Define the Root String for each shape (E=6, A=5, D=4, G=3, C=5).
// 3. Define the semitone offset for each key on each string.
// 4. Algorithmically pick the "Best" shape for a given Key+Quality.
//    - Prefer Open shapes (fret offset 0).
//    - Fallback to lowest fret Barre shape.

type ShapeDef = {
  frets: number[];   // Relative to "Nut". -1 = mute.
  fingers: number[]; // 0=open, 1-4 fingers.
  rootString: 6 | 5 | 4;
  baseName: string; // "E", "A", etc.
  isBarreTemplate: boolean;
};

// --- SHAPE DEFINITIONS ---
// Standard shapes assuming "0" is the nut.

const SHAPES: Record<string, ShapeDef[]> = {
  'Major': [
    { baseName: 'E', rootString: 6, isBarreTemplate: true, frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
    { baseName: 'A', rootString: 5, isBarreTemplate: true, frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 2, 3, 4, 0] }, // A-shape often barred with ring finger, but this is standard
    { baseName: 'D', rootString: 4, isBarreTemplate: false, frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
    { baseName: 'C', rootString: 5, isBarreTemplate: false, frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
    { baseName: 'G', rootString: 6, isBarreTemplate: false, frets: [3, 2, 0, 0, 0, 3], fingers: [3, 2, 0, 0, 0, 4] },
  ],
  'Minor': [
    { baseName: 'Em', rootString: 6, isBarreTemplate: true, frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
    { baseName: 'Am', rootString: 5, isBarreTemplate: true, frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
    { baseName: 'Dm', rootString: 4, isBarreTemplate: false, frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  ],
  '7': [
    { baseName: 'E7', rootString: 6, isBarreTemplate: true, frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
    { baseName: 'A7', rootString: 5, isBarreTemplate: true, frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
    { baseName: 'D7', rootString: 4, isBarreTemplate: false, frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
    { baseName: 'C7', rootString: 5, isBarreTemplate: false, frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
    { baseName: 'G7', rootString: 6, isBarreTemplate: false, frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
    { baseName: 'B7', rootString: 5, isBarreTemplate: false, frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] }, // Special open shape
  ],
  'm7': [
    { baseName: 'Em7', rootString: 6, isBarreTemplate: true, frets: [0, 2, 0, 0, 0, 0], fingers: [0, 2, 0, 0, 0, 0] }, // or [0,2,2,0,3,0]
    { baseName: 'Am7', rootString: 5, isBarreTemplate: true, frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
    { baseName: 'Dm7', rootString: 4, isBarreTemplate: false, frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1] },
  ],
  'maj7': [
    { baseName: 'Amaj7', rootString: 5, isBarreTemplate: false, frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 2, 1, 3, 0] },
    { baseName: 'Cmaj7', rootString: 5, isBarreTemplate: false, frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] },
    { baseName: 'Fmaj7', rootString: 4, isBarreTemplate: false, frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] }, // XX3210
    // Standard barre form for Maj7 is usually based on A (Root 5) or E (Root 6)
    { baseName: 'Emaj7_shape', rootString: 6, isBarreTemplate: true, frets: [0, 2, 1, 1, 0, 0], fingers: [0, 3, 1, 2, 0, 0] }, // Hard to barre, usually 4 fingers
    { baseName: 'Amaj7_shape', rootString: 5, isBarreTemplate: true, frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 3, 1, 4, 0] }
  ]
};

// Key Definitions: Semitone position on String 6 (E)
// E=0, F=1, F#=2, G=3, G#=4, A=5, A#=6, B=7, C=8, C#=9, D=10, D#=11
const ROOT_6_MAP: Record<string, number> = {
  'E': 0, 'F': 1, 'F#': 2, 'G': 3, 'G#': 4, 'A': 5, 'A#': 6, 'B': 7,
  'C': 8, 'C#': 9, 'D': 10, 'D#': 11
};

// String 5 (A) Map
// A=0, A#=1, B=2, C=3, C#=4, D=5, D#=6, E=7, F=8, F#=9, G=10, G#=11
const ROOT_5_MAP: Record<string, number> = {
  'A': 0, 'A#': 1, 'B': 2, 'C': 3, 'C#': 4, 'D': 5, 'D#': 6, 'E': 7,
  'F': 8, 'F#': 9, 'G': 10, 'G#': 11
};

// String 4 (D) Map
// D=0, D#=1, E=2, F=3, F#=4, G=5, G#=6, A=7, A#=8, B=9, C=10, C#=11
const ROOT_4_MAP: Record<string, number> = {
  'D': 0, 'D#': 1, 'E': 2, 'F': 3, 'F#': 4, 'G': 5, 'G#': 6, 'A': 7,
  'A#': 8, 'B': 9, 'C': 10, 'C#': 11
};

// --- GENERATION LOOP ---

const ALL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ALL_SUFFIXES = [
  { name: 'Major', idSuffix: '', type: 'Major' },
  { name: 'Minor', idSuffix: 'm', type: 'Minor' },
  { name: '7', idSuffix: '7', type: '7' },
  { name: 'Major 7', idSuffix: 'maj7', type: 'maj7' },
  { name: 'Minor 7', idSuffix: 'm7', type: 'm7' },
];

const generateChord = (key: string, suffixObj: any) => {
  const quality = suffixObj.type;
  const candidates = SHAPES[quality] || [];

  // Simplistic Logic:
  // 1. Check if there is a shape where RootOffset is 0 (Open Chord). If so, use it.
  // 2. If not, find the Barre Shape (E or A root) that produces the lowest fret > 0.

  let bestVariant: { frets: number[], fingers: number[], baseFret: number, type: 'open' | 'barre' } | null = null;
  let minFret = 999;

  // Check Open Candidates first
  for (const shape of candidates) {
    if (!shape.isBarreTemplate) {
      // Check if this NON-BARRE shape matches the key at open position
      // e.g. D Major Shape (Root 4). Is Key D? Yes.
      // D Major Shape (Root 4) is Key D.
      // C Major Shape (Root 5) is Key C.
      // G Major Shape (Root 6) is Key G.

      // Wait, "Non Barre Template" means it's a specific open shape like C, G, D.
      // If the Key matches the Shape's naturally produced key, perfect.
      // E.g. Shape C produces C. Shape D produces D.
      // How do we know what key a shape produces?
      // "baseName" usually tells us, e.g. "C" produces C.
      // Let's rely on regex of baseName matching Key? No.
      // Let's compute.

      // Actually, for Open Chords, we just defined specific list: C, A, G, E, D.
      // If Key is C, and we have C-shape, use it.
      // If Key is F, no F-shape open (F is barre usually, or weird Fmaj7 shape).

      // Cleaner: Check if we can transpose any shape to reach Key
      // BUT prefer Offset 0.
    }
  }

  // REVISED STRATEGY: 
  // Just iterate ALL templates (Barre or Not).
  // Calculate required offset.
  // Offset = (TargetKeyIndex - ShapeBaseKeyIndex + 12) % 12.
  // If Shape is not transposable (Open String usage), then Offset MUST be 0.
  // If Shape is Transposable (Barre), Offset can be anything.

  // We need to know the "Base Key" of each shape.
  // E-shape (Root 6) Base is E.
  // A-shape (Root 5) Base is A.
  // C-shape Base is C.
  // D-shape Base is D.
  // G-shape Base is G.

  const getBaseKey = (baseName: string): string | null => {
    // Extract root note: "Em" -> "E", "Cmaj7" -> "C"
    const m = baseName.match(/^([A-G]#?)/);
    return m ? m[1] : null;
  };

  for (const shape of candidates) {
    const shapeRoot = getBaseKey(shape.baseName);
    if (!shapeRoot) continue;

    let rootMap = ROOT_6_MAP;
    if (shape.rootString === 5) rootMap = ROOT_5_MAP;
    if (shape.rootString === 4) rootMap = ROOT_4_MAP;

    const targetVal = rootMap[key]; // e.g. C=8 (on E string)
    const shapeVal = rootMap[shapeRoot]; // e.g. E=0

    if (targetVal === undefined || shapeVal === undefined) continue;

    // Calculate shift needed
    // e.g. Target G (3), Shape E (0) -> Shift 3.
    // Target C (8), Shape E (0) -> Shift 8.
    // Target C (3), Shape A (0) -> Shift 3.

    let shift = (targetVal - shapeVal + 12) % 12;

    // Optimize: If shift > 12, wrap? (already mod 12).
    // If shift is 0, it's an Open Chord using the natural shape.

    // Constraint:
    // If !shape.isBarreTemplate AND shift !== 0, SKIP. (Can't move open D shape easily without it becoming a different weird shape or needing partial barre which we treat as "not standard").
    if (!shape.isBarreTemplate && shift !== 0) continue;

    // If it IS a barre template, we can shift.
    // Prefer lower frets.
    // Prefer Open (shift 0).

    if (shift === 0) {
      // Found an open match! Priority 1.
      bestVariant = {
        frets: shape.frets,
        fingers: shape.fingers,
        baseFret: 1,
        type: 'open'
      };
      minFret = 0;
      break; // Stop, open is best.
    } else {
      // It's a barre or moved shape.
      // Fret position = shift.
      // e.g. F (1) from E (0) -> Shift 1. BaseFret 1.
      // e.g. C (8) from E (0) -> Shift 8. BaseFret 8 (Too high?).
      // e.g. C (3) from A (0) -> Shift 3. BaseFret 3 (Better).

      // Check if we already have a better (lower fret) option
      if (shift < minFret && shift <= 12) {
        // Generate transposted frets
        // If shape.frets has -1, keep -1.
        // If shape.frets has N >= 0, new fret is N?
        // Wait, for Barre chords:
        // E shape: 0 2 2 1 0 0. BaseFret 1 (F). 
        // Conceptually, we put the capo (Index finger) at `shift`.
        // So the frets become relative to the barre?
        // Fretmaster Pro usually expects absolute frets?
        // Or `positions` object has `baseFret`.
        // `frets` array usually is relative to Nut? Or relative to BaseFret?
        // In `constants.ts` mock:
        // baseFret: 1. frets: [-1, 3, 2, 0, 1, 0].
        // If we have baseFret 3.
        // Does the renderer add baseFret?
        // Usually standard diagram logic is: Frets are visual. BaseFret tells where to draw the label.
        // But the `frets` array usually encodes the ACTUAL distance from the nut?
        // Let's check `Fretboard.tsx` logic? I cannot.
        // Let's assume standard behavior:
        // If I say BaseFret 3, and I want a dot on the "3rd fret of the guitar", 
        // If the diagram starts at 3, I should put "1" in the array?
        // USUALLY: The array contains offsets from `baseFret`.
        // e.g. A Barre at 5th.
        // BaseFret: 5.
        // Frets: [0, 2, 2, 0, 0, 0] (Relative to barre/capo).
        // YES. This is how most libraries work.
        // Let's verify with the existing "F" barre in `constants.ts`:
        // fixChord('F', [1, 3, 3, 2, 1, 1], ... baseFret: 1, isBarre: true, barreFrets: [1])
        // Here `frets` are [1, 3, 3, 2, 1, 1].
        // And `baseFret` is 1.
        // So the `frets` array matches the absolute numbers?
        // If it matched absolute, and base is 1, then visual is correct.
        // If it was relative, it would be [0, 2, 2, 1, 0, 0].
        // Given the array `[1, 3, 3, 2, 1, 1]`, and baseFret 1.
        // It seems `frets` are ABSOLUTE numbers.
        // And `baseFret` is just for label.
        // OK.

        // So:
        // NewFrets = Shape.frets.map(f => f === -1 ? -1 : f + shift)
        // Wait.
        // E Shape: 0 2 2 1 0 0.
        // F (Shift 1): 1 3 3 2 1 1. Correct.
        // So Logic: `f + shift`.

        const newFrets = shape.frets.map(f => f === -1 ? -1 : f + shift);

        // However, if baseFret gets huge (e.g. 8), we usually prefer the A-shape (3).
        // So we keep track of minFret (shift).

        minFret = shift;
        bestVariant = {
          frets: newFrets,
          fingers: shape.fingers,
          baseFret: shift, // Convention: Label the barre fret
          type: 'barre'
        };
      }
    }
  }

  // Fallback if no shape found (weird)
  if (!bestVariant) return;

  // Construct Object
  const chordId = `${key}${suffixObj.idSuffix}`.replace('#', 'sharp');
  const displayKey = key;
  const displayName = `${key} ${suffixObj.name}`;

  // Special handling for F Major Open vs Barre
  // If we generated an "Open" chord but it's actually High Fret (should be barre), careful.
  // But our logic separates Transposable vs Non-Transposable.

  CHORD_DB.push({
    id: chordId,
    key: displayKey,
    suffix: suffixObj.idSuffix,
    name: displayName,
    difficulty: bestVariant.type === 'barre' ? 'advanced' : 'basic',
    type: bestVariant.type,
    positions: [{
      baseFret: Math.max(1, bestVariant.baseFret), // If 0, show 1.
      frets: bestVariant.frets,
      fingers: bestVariant.fingers
    }]
  });
};

// --- RUN GENERATION ---
ALL_KEYS.forEach(key => {
  ALL_SUFFIXES.forEach(suf => generateChord(key, suf));
});

// Manual Fixes / Additions (Legacy support + Special Requests)
// 1. F Open
CHORD_DB.push({
  id: 'F_open', key: 'F', suffix: '', name: 'F Major (Open)',
  difficulty: 'intermediate', type: 'open',
  positions: [{ baseFret: 1, frets: [-1, -1, 3, 2, 1, 1], fingers: [0, 0, 3, 2, 1, 1] }]
});

// 2. Explicit Barres (C, D, G, A, E, Em, Am)
// My generator likely created "Open" versions for C, D, G, A, E, Em, Am.
// The user WANTS Explicit Barre versions too.
const addExplicitBarre = (key: string, suffix: string, name: string) => {
  // Force a Barre Generation (Ignore Open shapes)
  // Manually picking the "Other" shape.
  // E.g. for C (usually root 5 open), pick Root 6 (8th fret) or Root 5 (hi-octave)? 
  // Usually C Barre is A-shape at 3rd fret.

  // Let's manual-macro this to be safe as per previous request logic
  // C Major Barre -> A Shape at 3rd.
  // D Major Barre -> A Shape at 5th.
  // G Major Barre -> E Shape at 3rd.
  // A Major Barre -> E Shape at 5th.
  // E Major Barre -> A Shape at 7th.
  // Em Barre -> Am Shape at 7th.
  // Am Barre -> Em Shape at 5th.

  // I will stick to the previous hardcodes for these extras to ensure they exist.
};

// ... Wait, I can just paste the previous block for "Additional Barre Variations"
// But need to ensure IDs don't clash.
// Standard C Major will be ID 'C'. (Open).
// Barre C Major will be ID 'C_barre'.
// Correct. (Previous implementation used _barre).

// Re-adding the explicit list:
const addBarreVariation = (id: string, name: string, frets: number[], fingers: number[], baseFret: number) => {
  CHORD_DB.push({
    id: `${id}_barre`,
    key: id.replace('m', ''),
    suffix: id.endsWith('m') ? 'm' : '',
    name: `${name} (Barre)`,
    difficulty: 'advanced',
    type: 'barre',
    positions: [{ baseFret, frets, fingers }]
  });
};

addBarreVariation('C', 'C Major', [-1, 3, 5, 5, 5, 3], [0, 1, 3, 3, 3, 1], 3);
addBarreVariation('D', 'D Major', [-1, 5, 7, 7, 7, 5], [0, 1, 3, 3, 3, 1], 5);
addBarreVariation('G', 'G Major', [3, 5, 5, 4, 3, 3], [1, 3, 4, 2, 1, 1], 3);
addBarreVariation('A', 'A Major', [5, 7, 7, 6, 5, 5], [1, 3, 4, 2, 1, 1], 5);
addBarreVariation('E', 'E Major', [-1, 7, 9, 9, 9, 7], [0, 1, 3, 3, 3, 1], 7);
addBarreVariation('Am', 'A Minor', [5, 7, 7, 5, 5, 5], [1, 3, 4, 1, 1, 1], 5);
addBarreVariation('Em', 'E Minor', [-1, 7, 9, 9, 8, 7], [0, 1, 3, 4, 2, 1], 7);

// RENAME "F" to "F Major (Barre)"? 
// My generator will create "F" (Barre E-style) because F-Open doesn't exist in templates.
// So ID 'F' will be the Barre version.
// Correct.
const f = CHORD_DB.find(c => c.id === 'F');
if (f) f.name = 'F Major (Barre)';


export const INITIAL_HISTORY: any[] = [
  { id: '1', date: '2023-10-01', chordA: 'G', chordB: 'C', bpm: 35, count: 12, durationSeconds: 60 },
  { id: '2', date: '2023-10-08', chordA: 'G', chordB: 'C', bpm: 42, count: 18, durationSeconds: 60 },
  { id: '3', date: '2023-10-15', chordA: 'G', chordB: 'C', bpm: 48, count: 24, durationSeconds: 60 },
  { id: '4', date: '2023-10-22', chordA: 'G', chordB: 'C', bpm: 52, count: 28, durationSeconds: 60 },
];
