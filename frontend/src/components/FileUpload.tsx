import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Synthetizer, loadSoundFont, BasicPreset } from 'spessasynth_lib';
import SoundFontPreview from './SoundFontPreview';
import { ConversionStatus } from './ConversionStatus';
import { SoundFontMetadata, PresetGlobalValues, ConversionStatus as Status } from '../types';
import { useJobStatus } from '../hooks/useJobStatus';
import '../styles/FileUpload.css';

const API_BASE = '/api';

function extractGlobalValues(_preset: BasicPreset): PresetGlobalValues {
    // Return empty object since we're not using these values anymore
    return {};
}

const FileUpload: React.FC = () => {
  const [metadata, setMetadata] = useState<SoundFontMetadata | null>(null);
  const [soundFontData, setSoundFontData] = useState<ArrayBuffer | null>(null);
  const [synth, setSynth] = useState<Synthetizer | null>(null);
  const [uploadStatus, setUploadStatus] = useState<Status>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | undefined>();
  const [jobId, setJobId] = useState<string>();
  const [uploadedFilePath, setUploadedFilePath] = useState<string>();
  
  // Use our job status hook for build progress
  const { status: buildStatus, progress: buildProgress, error: buildError, pluginUrl, retry: retryBuild } = useJobStatus(jobId);

  const handleFileUpload = async (file: File) => {
    try {
      setUploadStatus('uploading');
      setUploadProgress(0);
      console.log('Starting file upload...', file.name, file.size);
      
      // First read the file into memory
      const arrayBuffer = await file.arrayBuffer();
      const formData = new FormData();
      
      // Create a new Blob with the file data
      const blob = new Blob([arrayBuffer], { type: file.type });
      formData.append('file', blob, file.name);
      
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Setup upload progress handler
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            console.log(`Upload progress: ${percentComplete.toFixed(2)}% (${event.loaded}/${event.total} bytes)`);
            setUploadProgress(Math.round(percentComplete));
          }
        };

        // Setup completion handler
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('Upload completed successfully');
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              console.error('Error parsing response:', error);
              reject(new Error('Invalid response from server'));
            }
          } else {
            console.error('Upload failed:', {
              status: xhr.status,
              statusText: xhr.statusText,
              response: xhr.responseText
            });
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        };

        // Setup error handler
        xhr.onerror = () => {
          console.error('Network error during upload');
          reject(new Error('Network error during upload'));
        };

        // Setup timeout handler
        xhr.ontimeout = () => {
          console.error('Upload timed out');
          reject(new Error('Upload timed out'));
        };

        // Configure request with relative URL
        xhr.open('POST', `${API_BASE}/upload`);
        xhr.timeout = 60000; // 60 seconds timeout
        
        // Send the request
        console.log('Sending upload request...');
        xhr.send(formData);
      }).then(async (response: any) => {
        console.log('Upload successful, processing file locally...', response);
        setUploadedFilePath(response.file.path);
        setJobId(response.job.id);
        
        // Process the file locally using the arrayBuffer we already have
        try {
          setUploadStatus('processing');
          setSoundFontData(arrayBuffer);
          
          // Parse soundfont and extract global values
          const soundFont = loadSoundFont(arrayBuffer);
          const presetsWithGlobals = soundFont.presets.map(preset => ({
            ...preset,
            globalValues: extractGlobalValues(preset)
          }));
          
          // Initialize SpessaSynth
          const ctx = new AudioContext();
          await ctx.audioWorklet.addModule('/worklet_processor.min.js');
          const synthInstance = new Synthetizer(ctx.destination, arrayBuffer);
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
          setUploadStatus('ready');
          setUploadProgress(100);
        } catch (error) {
          console.error('Error processing sound font:', error);
          throw error;
        }
      });
    } catch (error) {
      console.error('Error during file upload:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload file');
      setUploadStatus('error');
      throw error;
    }
  };

  const handleCreatePlugin = async () => {
    if (!metadata || !uploadedFilePath || !jobId) return;

    try {
      const response = await fetch(`${API_BASE}/build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start build process');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Build process failed to start');
      }
    } catch (error) {
      console.error('Error starting build:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to start build');
    }
  };

  const handleDownload = () => {
    if (pluginUrl) {
      window.location.href = pluginUrl;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    if (!file.name.toLowerCase().endsWith('.sf2')) {
      setUploadError('Please upload a .sf2 file');
      return;
    }

    try {
      setUploadStatus('uploading');
      setUploadProgress(0);
      setUploadError(undefined);
      
      // Call handleFileUpload with the file
      await handleFileUpload(file);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload file');
      setUploadStatus('error');
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
    setUploadStatus('idle');
    setUploadError(undefined);
    setUploadProgress(0);
    setMetadata(null);
    setSoundFontData(null);
    setSynth(null);
    setJobId(undefined);
  };

  // Determine what to show in the conversion status area
  const showConversionStatus = uploadStatus !== 'idle';
  const conversionStatus = jobId ? buildStatus : uploadStatus;
  const conversionProgress = jobId ? buildProgress : uploadProgress;
  const conversionError = buildError || uploadError;

  console.log('Status Debug:', {
    uploadStatus,
    buildStatus,
    jobId,
    conversionStatus,
    showConversionStatus
  });

  return (
    <div className="file-upload">
      {!showConversionStatus ? (
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
            status={conversionStatus}
            progress={conversionProgress}
            error={conversionError}
            onRetry={handleRetry}
            onCreatePlugin={conversionStatus === 'ready' ? handleCreatePlugin : undefined}
            onDownload={pluginUrl ? handleDownload : undefined}
            pluginUrl={pluginUrl}
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