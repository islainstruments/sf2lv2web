import React from 'react';
import { ConversionStatus as Status } from '../types';

interface ConversionStatusProps {
  status: Status;
  progress: number;
  error?: string;
  onRetry?: () => void;
}

const statusMessages = {
  uploading: 'Uploading SoundFont file...',
  validating: 'Validating file format...',
  building: 'Building LV2 plugin...',
  packaging: 'Packaging plugin files...',
  complete: 'Conversion complete!',
  error: 'Conversion failed',
};

export function ConversionStatus({ status, progress, error, onRetry }: ConversionStatusProps) {
  return (
    <div className="conversion-status">
      <div className="status-header">
        <h3>{statusMessages[status]}</h3>
        {status === 'error' && onRetry && (
          <button onClick={onRetry} className="retry-button">
            Try Again
          </button>
        )}
      </div>

      {status !== 'error' && status !== 'complete' && (
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <p className="error-message">{error}</p>}
    </div>
  );
} 