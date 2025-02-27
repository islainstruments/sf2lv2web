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

export type JobStatus = 
  | 'idle'
  | 'pending'
  | 'uploading'
  | 'validating'
  | 'building'
  | 'packaging'
  | 'complete'
  | 'failed'
  | 'error';

export interface Job {
  id: string;
  status: JobStatus;
  soundfontPath: string;
  pluginName: string;
  userId?: string;
  created: Date;
  updated: Date;
  error?: string;
  output?: string;
  progress?: number;
  outputPath?: string;
  metadata?: SoundFontMetadata;
} 