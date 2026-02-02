export interface ChordPosition {
  frets: number[]; // 6 strings, -1 for muted, 0 for open
  fingers: number[]; // 0 for none, 1-4 for fingers
  baseFret: number;
  barres?: number[]; // frets that are barred
}

export interface Chord {
  id: string;
  key: string;
  suffix: string;
  name: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  type: 'open' | 'barre' | 'power';
  positions: ChordPosition[];
}

export interface PracticeSession {
  id: string;
  date: string;
  chordA: string;
  chordB: string;
  bpm: number; // speed equivalent
  count: number;
  durationSeconds: number;
}

export enum ViewState {
  METRONOME = 'METRONOME',
  LIBRARY = 'LIBRARY',
  TRAINER = 'TRAINER',
  HISTORY = 'HISTORY'
}

export type TimeSignature = '4/4' | '3/4' | '6/8' | '2/4';