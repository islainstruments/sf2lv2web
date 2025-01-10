import React, { useEffect, useState, useRef } from 'react';
import { SoundFont2 } from '../lib/sfumato';
import PianoKeyboard from './PianoKeyboard';
import PresetList from './PresetList';
import { ModulatorsPanel } from './EffectsPanel';
import '../styles/SoundFontPlayer.css';

interface SoundFontPlayerProps {
  soundFontData: ArrayBuffer;
}

const SoundFontPlayer: React.FC<SoundFontPlayerProps> = ({ soundFontData }) => {
  const [soundFont, setSoundFont] = useState<SoundFont2 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPreset, setCurrentPreset] = useState<SoundFont2['presets'][0] | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  // Load soundfont using soundfont2
  useEffect(() => {
    const loadFont = async () => {
      try {
        setIsLoading(true);
        // Create a Blob URL from the data
        const data = new Uint8Array(soundFontData);
        const font = new SoundFont2(data);
        
        // Initialize with audio context
        if (audioContextRef.current) {
          await font.init(audioContextRef.current);
        }
        
        console.log('Soundfont loaded successfully');
        setSoundFont(font);
        
        // Select the first preset by default
        if (font.presets.length > 0) {
          setCurrentPreset(font.presets[0]);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load soundfont:', err);
        setIsLoading(false);
      }
    };

    loadFont();
  }, [soundFontData]);

  const handleNoteOn = (midiNote: number) => {
    if (!soundFont || !currentPreset) return;
    soundFont.selectPreset(currentPreset.header.bank, currentPreset.header.preset);
    soundFont.noteOn(midiNote, 1);
  };

  const handleNoteOff = (midiNote: number) => {
    if (!soundFont) return;
    soundFont.noteOff(midiNote);
  };

  const handleGeneratorChange = (generatorId: number, value: number) => {
    if (!currentPreset || !currentPreset.zones || currentPreset.zones.length === 0) return;

    // Update the generator value in the preset's global zone
    const globalZone = currentPreset.zones[0];
    if (globalZone.generators) {
      globalZone.generators[generatorId] = { id: generatorId, value };
    } else {
      globalZone.generators = {
        [generatorId]: { id: generatorId, value }
      };
    }
  };

  if (isLoading) {
    return <div className="loading">Loading soundfont...</div>;
  }

  return (
    <div className="soundfont-player">
      <PresetList 
        soundFont={soundFont}
        selectedPreset={currentPreset}
        onPresetSelect={setCurrentPreset}
      />
      <div className="keyboard-section">
        <ModulatorsPanel 
          soundFont={soundFont}
          selectedPreset={currentPreset}
          onGeneratorChange={handleGeneratorChange}
        />
        <PianoKeyboard 
          onNoteOn={handleNoteOn}
          onNoteOff={handleNoteOff}
        />
      </div>
    </div>
  );
};

export default SoundFontPlayer; 