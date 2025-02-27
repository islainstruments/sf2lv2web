declare module 'spessasynth_lib' {
  export interface BasicPreset {
    name: string;
    bank: number;
    presetNum: number;
    generators: Array<{
      operator: number;
      value: number;
      description: string;
    }>;
  }

  export class Synthetizer {
    constructor(destination: AudioNode, soundFontData: ArrayBuffer);
    noteOn(note: number, velocity: number): void;
    noteOff(note: number): void;
    setPreset(bank: number, preset: number): void;
    destroy(): void;
  }

  export function loadSoundFont(data: ArrayBuffer): {
    presets: BasicPreset[];
    version: { major: number; minor: number };
  };
} 