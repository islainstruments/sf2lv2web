import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Synthetizer, loadSoundFont } from 'spessasynth_lib';
import SoundFontPreview from './SoundFontPreview';
import { ConversionStatus } from './ConversionStatus';
import { SoundFontMetadata, PresetGlobalValues } from '../types';
import '../styles/FileUpload.css';

function extractGlobalValues(_preset: unknown): PresetGlobalValues {
    // Return empty object since we're not using these values anymore
    return {};
}

const FileUpload: React.FC = () => {
  const [metadata, setMetadata] = useState<SoundFontMetadata | null>(null);
  const [soundFontData, setSoundFontData] = useState<ArrayBuffer | null>(null);
  const [synth, setSynth] = useState<Synthetizer | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'validating' | 'building' | 'packaging' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    try {
      console.log('Starting file upload...');
      // Your existing upload code
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', errorText);
        throw new Error(`Upload failed: ${errorText}`);
      }

      const data = await response.json();
      console.log('Upload successful:', data);
      // Rest of your code
    } catch (error) {
      console.error('Error during file upload:', error);
      // Add user feedback here
    }
  };

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

      const reader = new FileReader();
      reader.onload = async (e) => {
        if (e.target?.result instanceof ArrayBuffer) {
          setSoundFontData(e.target.result);
          
          // Parse soundfont and extract global values
          const soundFont = loadSoundFont(e.target.result);
          const presetsWithGlobals = soundFont.presets.map(preset => ({
            ...preset,
            globalValues: extractGlobalValues(preset)
          }));
          
          // Initialize SpessaSynth
          const ctx = new AudioContext();
          await ctx.audioWorklet.addModule('/node_modules/spessasynth_lib/synthetizer/worklet_processor.min.js');
          const synthInstance = new Synthetizer(ctx.destination, e.target.result);
          setSynth(synthInstance);
          
          // Create metadata with enhanced presets
          const soundFontMetadata: SoundFontMetadata = {
            version: { major: 2, minor: 1 },
            name: file.name.replace('.sf2', ''),
            date: new Date().toISOString(),
            comment: 'Loaded with SpessaSynth',
            tools: 'SpessaSynth',
            presets: presetsWithGlobals
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