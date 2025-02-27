import React, { useState } from 'react';
import { SoundFontMetadata, Preset, Synthetizer, PresetWithGlobals } from '../types';
import PianoKeyboard from './PianoKeyboard';
import '../styles/SoundFontPreview.css';
import '../styles/PresetList.css';

// CC number mapping
const CC_DEFAULTS = {
    74: 127,    // Filter Cutoff (brightness)
    71: 0,      // Filter Resonance (timbre)
    73: 0,      // Attack Time
    75: 64,     // Decay Time
    70: 64,     // Sustain Level
    72: 64      // Release Time
};

interface SoundFontPreviewProps {
    metadata: SoundFontMetadata;
    soundFontData: ArrayBuffer;
    synth: Synthetizer;
}

const SoundFontPreview: React.FC<SoundFontPreviewProps> = ({ metadata, soundFontData, synth }) => {
    const [selectedPreset, setSelectedPreset] = useState<PresetWithGlobals | null>(null);

    const handlePresetClick = (preset: PresetWithGlobals) => {
        if (!synth) return;
        
        // Set the preset in the synth
        synth.programChange(0, preset.program);
        synth.controllerChange(0, 0, preset.bank);
        setSelectedPreset(preset);

        // Handle filter parameters for older soundfonts
        if (preset.globalValues?.cutoff === undefined) {
            synth.controllerChange(0, 74, 127); // Set cutoff fully open
        }
        if (preset.globalValues?.resonance === undefined) {
            synth.controllerChange(0, 71, 0);   // Set resonance to 0
        }

        // Handle envelope parameters
        if (preset.globalValues?.attack === undefined) {
            synth.controllerChange(0, 73, 0);   // Set attack to 0
        }
        if (preset.globalValues?.decay === undefined) {
            synth.controllerChange(0, 75, 0);   // Set decay to 0
        }
        if (preset.globalValues?.sustain === undefined) {
            synth.controllerChange(0, 70, 0);   // Set sustain to 0
        }
        if (preset.globalValues?.release === undefined) {
            synth.controllerChange(0, 72, 0);   // Set release to 0
        }
    };

    // Split presets into four roughly equal columns
    const splitIntoColumns = (presets: Preset[]) => {
        const columnSize = Math.ceil(presets.length / 4);
        return [
            presets.slice(0, columnSize),
            presets.slice(columnSize, columnSize * 2),
            presets.slice(columnSize * 2, columnSize * 3),
            presets.slice(columnSize * 3)
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
            <h2 className="soundfont-title">{displayMetadata.name}</h2>

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
                                <div className="col">BNK:PRG</div>
                                <div className="col">Name</div>
                            </div>
                            <div className="presets-list">
                                {column.map((preset) => (
                                    <div
                                        key={`${preset.bank}-${preset.program}`}
                                        className={`preset-row ${selectedPreset === preset ? 'selected' : ''}`}
                                        onClick={() => handlePresetClick(preset as PresetWithGlobals)}
                                    >
                                        <div className="col">{`${preset.bank}:${preset.program}`}</div>
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