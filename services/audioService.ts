export class MetronomeEngine {
  private audioContext: AudioContext | null = null;
  private nextNoteTime: number = 0.0;
  private timerID: number | null = null;
  private isPlaying: boolean = false;
  private bpm: number = 120;
  private beatsPerBar: number = 4;
  private currentBeat: number = 0;
  private onBeatCallback: ((beat: number) => void) | null = null;
  private lookahead: number = 25.0; // ms
  private scheduleAheadTime: number = 0.1; // s

  constructor() {
    // Lazy init
  }

  public init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public setCallback(cb: (beat: number) => void) {
    this.onBeatCallback = cb;
  }

  public setBpm(bpm: number) {
    this.bpm = bpm;
  }

  public setTimeSignature(beats: number) {
    this.beatsPerBar = beats;
  }

  public start() {
    if (this.isPlaying) return;
    this.init();
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
    this.isPlaying = true;
    this.currentBeat = 0;
    this.nextNoteTime = this.audioContext!.currentTime + 0.05;
    this.scheduler();
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerID !== null) {
      window.clearTimeout(this.timerID);
      this.timerID = null;
    }
  }

  private scheduler() {
    while (this.nextNoteTime < this.audioContext!.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentBeat, this.nextNoteTime);
      this.nextNote();
    }
    if (this.isPlaying) {
      this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
    }
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.bpm;
    this.nextNoteTime += secondsPerBeat;
    this.currentBeat++;
    if (this.currentBeat >= this.beatsPerBar) {
      this.currentBeat = 0;
    }
  }

  private scheduleNote(beatNumber: number, time: number) {
    const osc = this.audioContext!.createOscillator();
    const envelope = this.audioContext!.createGain();

    osc.frequency.value = beatNumber === 0 ? 1000 : 800;
    envelope.gain.value = 1;
    envelope.gain.exponentialRampToValueAtTime(1, time + 0.001);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

    osc.connect(envelope);
    envelope.connect(this.audioContext!.destination);

    osc.start(time);
    osc.stop(time + 0.03);

    // Visual callback
    if (this.onBeatCallback) {
      // We use a simplified visual sync here. In prod, we'd use Draw callbacks via requestAnimationFrame
      // synchronized with audio time, but setTimeout is "good enough" for React state updates.
      const delay = Math.max(0, (time - this.audioContext!.currentTime) * 1000);
      setTimeout(() => {
        this.onBeatCallback!(beatNumber);
      }, delay);
    }
  }
}

export class StrumDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private onStrum: (() => void) | null = null;
  private isListening: boolean = false;
  private lastStrumTime: number = 0;
  private checkInterval: number | null = null;

  private isTriggered: boolean = false;

  async start(callback: () => void) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);

      this.analyser.fftSize = 256;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      this.onStrum = callback;
      this.isListening = true;
      this.listen();
    } catch (e) {
      console.error("Mic access denied", e);
      alert("Please enable microphone access to use the trainer.");
    }
  }

  stop() {
    this.isListening = false;
    if (this.checkInterval) cancelAnimationFrame(this.checkInterval);
    this.source?.disconnect();
    this.analyser?.disconnect();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }

  private listen() {
    if (!this.isListening || !this.analyser || !this.dataArray) return;

    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length;

    // Simple threshold detection for a "strum"
    // In a real app, this would be complex pitch detection.
    // For a prototype, checking for a volume spike (attack) is effective.
    const now = Date.now();

    // Hysteresis & Debounce
    // Trigger Threshold: 15
    // Reset Threshold: 10
    // Debounce: 300ms
    if (!this.isTriggered && average > 15 && (now - this.lastStrumTime > 300)) {
      this.lastStrumTime = now;
      this.isTriggered = true;
      if (this.onStrum) this.onStrum();
    } else if (average < 10) {
      this.isTriggered = false;
    }

    this.checkInterval = requestAnimationFrame(() => this.listen());
  }
}