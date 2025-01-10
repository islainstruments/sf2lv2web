import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Synthetizer, loadSoundFont } from 'spessasynth_lib';
import SoundFontPreview from './SoundFontPreview';
import { ConversionStatus } from './ConversionStatus';
import { SoundFontMetadata } from '../types';
import '../styles/FileUpload.css';

const FileUpload: React.FC = () => {
  const [metadata, setMetadata] = useState<SoundFontMetadata | null>(null);
  const [soundFontData, setSoundFontData] = useState<ArrayBuffer | null>(null);
  const [synth, setSynth] = useState<Synthetizer | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'validating' | 'building' | 'packaging' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    if (!file.name.toLowerCase().endsWith('.sf2')) {
      setError('Please upload a .sf2 file');
      return;
    }

    try {
      setStatus('uploading');
      setProgress(0);
      setError(null);

      // Read the file as ArrayBuffer for playback
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (e.target?.result instanceof ArrayBuffer) {
          setSoundFontData(e.target.result);
          
          // Parse soundfont to get presets
          const soundFont = loadSoundFont(e.target.result);
          
          // Initialize SpessaSynth
          const ctx = new AudioContext();
          await ctx.audioWorklet.addModule('/node_modules/spessasynth_lib/synthetizer/worklet_processor.min.js');
          const synthInstance = new Synthetizer(ctx.destination, e.target.result);
          setSynth(synthInstance);
          
          // Create metadata with presets from parsed soundfont
          const soundFontMetadata: SoundFontMetadata = {
            version: { major: 2, minor: 1 }, // Default SoundFont version
            name: file.name.replace('.sf2', ''),
            date: new Date().toISOString(),
            comment: 'Loaded with SpessaSynth',
            tools: 'SpessaSynth',
            presets: soundFont.presets
          };
          
          setMetadata(soundFontMetadata);
          setStatus('complete');
          setProgress(100);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      setStatus('error');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/soundfont': ['.sf2'],
    },
    multiple: false
  });

  const handleRetry = () => {
    setStatus('idle');
    setError(null);
    setProgress(0);
    setMetadata(null);
    setSoundFontData(null);
    setSynth(null);
  };

  return (
    <div className="file-upload">
      {status === 'idle' ? (
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'active' : ''}`}
        >
          <input {...getInputProps()} />
          <p>Drag and drop a SoundFont file here, or click to select one</p>
          <p className="file-hint">.sf2 files only</p>
        </div>
      ) : (
        <>
          <ConversionStatus
            status={status}
            progress={progress}
            error={error || undefined}
            onRetry={handleRetry}
          />
          {metadata && soundFontData && synth && (
            <SoundFontPreview 
              metadata={metadata} 
              soundFontData={soundFontData}
              synth={synth}
            />
          )}
        </>
      )}
    </div>
  );
};

export default FileUpload; 