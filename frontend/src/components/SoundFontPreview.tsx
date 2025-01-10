import React, { useState } from 'react';
import { SoundFontMetadata, Preset, Synthetizer } from '../types';
import PianoKeyboard from './PianoKeyboard';
import '../styles/SoundFontPreview.css';

interface SoundFontPreviewProps {
  metadata: SoundFontMetadata;
  soundFontData: ArrayBuffer;
  synth: Synthetizer;
}

const SoundFontPreview: React.FC<SoundFontPreviewProps> = ({ metadata, soundFontData, synth }) => {
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);

  const handlePresetClick = (preset: Preset) => {
    setSelectedPreset(preset);
    synth.resetControllers();  // Reset all controllers
    synth.programChange(0, preset.program); // Channel 0, program number
    synth.controllerChange(0, 0, preset.bank); // Channel 0, controller 0 (bank select), bank number
  };

  // Split presets into three roughly equal columns
  const splitIntoColumns = (presets: Preset[]) => {
    const columnSize = Math.ceil(presets.length / 3);
    return [
      presets.slice(0, columnSize),
      presets.slice(columnSize, columnSize * 2),
      presets.slice(columnSize * 2)
    ];
  };

  // Filter out EOP marker and sort presets
  const filteredPresets = metadata.presets
    .filter(preset => preset.presetName !== 'EOP')
    .sort((a, b) => (a.bank * 1000 + a.program) - (b.bank * 1000 + b.program));

  const presetColumns = splitIntoColumns(filteredPresets);

  // Default metadata values if not provided
  const displayMetadata = {
    name: metadata.name || 'Unknown SoundFont',
    version: metadata.version || { major: 2, minor: 1 },
    date: metadata.date || 'Unknown',
    comment: metadata.comment || 'No comment available',
    tools: metadata.tools || 'Unknown'
  };

  return (
    <div className="soundfont-preview">
      <div className="metadata-section">
        <h2>SoundFont Information</h2>
        <div className="metadata-details">
          <div>Name: {displayMetadata.name}</div>
          <div>Version: {displayMetadata.version.major}.{displayMetadata.version.minor}</div>
          <div>Date: {displayMetadata.date}</div>
          <div>Comment: {displayMetadata.comment}</div>
          <div>Tools: {displayMetadata.tools}</div>
        </div>
      </div>

      <div className="keyboard-section">
        <PianoKeyboard 
          synth={synth}
          selectedPreset={selectedPreset}
        />
      </div>

      <div className="presets-section">
        <h3>Presets</h3>
        <div className="presets-grid">
          {presetColumns.map((column, columnIndex) => (
            <div key={columnIndex} className="preset-column">
              <div className="presets-header">
                <div className="col">Bank</div>
                <div className="col">Preset</div>
                <div className="col">Name</div>
              </div>
              <div className="presets-list">
                {column.map((preset) => (
                  <div
                    key={`${preset.bank}-${preset.program}`}
                    className={`preset-row ${selectedPreset === preset ? 'selected' : ''}`}
                    onClick={() => handlePresetClick(preset)}
                  >
                    <div className="col">{preset.bank}</div>
                    <div className="col">{preset.program}</div>
                    <div className="col name-col">{preset.presetName}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SoundFontPreview; 