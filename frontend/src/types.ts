import { BasicPreset, Synthetizer } from 'spessasynth_lib';

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
  presets: BasicPreset[];
}

// Re-export SpessaSynth types we use
export type { BasicPreset as Preset, Synthetizer }; 