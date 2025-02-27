import { BasicPreset, Synthetizer } from 'spessasynth_lib';

// Conversion status type
export type ConversionStatus = 
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'validating'
  | 'building'
  | 'packaging'
  | 'ready'
  | 'complete'
  | 'failed'
  | 'error';

// Basic types for SoundFont metadata
export interface SoundFontMetadata {
  version: {
    major: number;
    minor: number;
  };
  name: string;
  date: string;
  comment: string;
  tools: string;
  presets: PresetWithGlobals[];
}

// Re-export SpessaSynth types we use
export type { BasicPreset as Preset, Synthetizer }; 

export interface PresetGlobalValues {
    // Filter
    cutoff?: number;      // CC 74
    resonance?: number;   // CC 71
    
    // Envelope
    attack?: number;      // CC 73
    decay?: number;       // CC 75
    sustain?: number;     // CC 70
    release?: number;     // CC 72
}

export interface PresetWithGlobals extends BasicPreset {
    globalValues: PresetGlobalValues;
} 