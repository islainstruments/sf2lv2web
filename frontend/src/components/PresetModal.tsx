import React from 'react';
import { Preset } from '../types';
import PianoKeyboard from './PianoKeyboard';
import '../styles/PresetModal.css';

interface PresetModalProps {
  preset: Preset | null;
  onClose: () => void;
  soundFontData: ArrayBuffer;
}

const PresetModal: React.FC<PresetModalProps> = ({ preset, onClose, soundFontData }) => {
  if (!preset) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="preset-modal" onClick={handleBackdropClick}>
      <div className="preset-modal-content" onClick={e => e.stopPropagation()}>
        <div className="preset-header">
          <h3>{preset.name}</h3>
          <button className="close-button" onClick={onClose}>Close</button>
        </div>
        <div className="preset-info">
          <div className="preset-info-row">
            <span className="label">Bank</span>
            <span className="value">{preset.bank}</span>
          </div>
          <div className="preset-info-row">
            <span className="label">Preset</span>
            <span className="value">{preset.presetNum}</span>
          </div>
          
          <PianoKeyboard 
            soundFontData={soundFontData}
            selectedPreset={{ bank: preset.bank, presetNum: preset.presetNum }}
          />
          
          {preset.instruments && preset.instruments.length > 0 && (
            <div className="preset-section">
              <h4>Instruments</h4>
              {preset.instruments.map((instrument, index) => (
                <div key={index} className="instrument-block">
                  <div className="instrument-header">{instrument.name}</div>
                  {instrument.samples && instrument.samples.length > 0 && (
                    <div className="sample-list">
                      {instrument.samples.map((sample, sIndex) => (
                        <div key={sIndex} className="sample-item">
                          <div className="sample-name">{sample.name}</div>
                          <div className="sample-details">
                            <span>Rate: {sample.sampleRate}Hz</span>
                            <span>Pitch: {sample.originalPitch}</span>
                            {sample.pitchCorrection !== 0 && (
                              <span>Correction: {sample.pitchCorrection}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PresetModal; 