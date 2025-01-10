export interface Generator {
  operator: number;
  value: number;
  description: string;
}

export interface Sample {
  name: string;
  startAddress: number;
  endAddress: number;
  startLoopAddress: number;
  endLoopAddress: number;
  sampleRate: number;
  originalPitch: number;
  pitchCorrection: number;
  sampleLink: number;
  sampleType: number;
}

export interface Instrument {
  name: string;
  generators: Generator[];
  samples: Sample[];
}

export interface Preset {
  name: string;
  bank: number;
  presetNum: number;
  generators: Generator[];
  instruments: Instrument[];
}

export interface Zone {
  startGen: number;
  endGen: number;
}

export interface SoundFontMetadata {
  version: {
    major: number;
    minor: number;
  };
  name: string;
  date: string;
  comment: string;
  tools: string;
  presets: Preset[];
  instruments: Instrument[];
  samples: Sample[];
} 