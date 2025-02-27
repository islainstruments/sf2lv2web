import { useState, useEffect } from 'react';
import { ConversionStatus } from '../types';

interface JobStatus {
  id: string;
  status: ConversionStatus;
  error?: string;
  output?: string;
}

export function useJobStatus(jobId?: string) {
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>();
  const [pluginUrl, setPluginUrl] = useState<string>();

  useEffect(() => {
    if (!jobId) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/upload/status/${jobId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch job status');
        }
        
        const data: JobStatus = await response.json();
        setStatus(data.status);
        setError(data.error);

        // Calculate progress based on status
        switch (data.status) {
          case 'uploading':
            setProgress(25);
            break;
          case 'validating':
            setProgress(50);
            break;
          case 'building':
            setProgress(75);
            break;
          case 'packaging':
            setProgress(90);
            break;
          case 'complete':
            setProgress(100);
            // When complete, set the plugin URL
            if (data.output) {
              setPluginUrl(`/api/download/${jobId}`);
            }
            break;
          case 'error':
            setProgress(0);
            break;
          default:
            setProgress(0);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
        setStatus('error');
      }
    };

    // Poll every 2 seconds while job is in progress
    const interval = setInterval(() => {
      if (['complete', 'error'].includes(status)) {
        clearInterval(interval);
        return;
      }
      pollStatus();
    }, 2000);

    // Initial poll
    pollStatus();

    return () => clearInterval(interval);
  }, [jobId, status]);

  const handleRetry = async () => {
    if (!jobId) return;
    setStatus('uploading');
    setError(undefined);
    setProgress(0);
  };

  return {
    status,
    progress,
    error,
    pluginUrl,
    retry: handleRetry
  };
} 