import React from 'react';
import { ConversionStatus as Status } from '../types';
import '../styles/ConversionStatus.css';

interface ConversionStatusProps {
  status: Status;
  progress: number;
  error?: string;
  onRetry?: () => void;
  onCreatePlugin?: () => void;
  onDownload?: () => void;
  pluginUrl?: string;
}

const statusMessages: Record<Status, string> = {
  idle: 'Ready to create LV2 plugin',
  uploading: 'Uploading SoundFont file...',
  processing: 'Processing SoundFont file...',
  validating: 'Validating file format...',
  building: 'Building LV2 plugin...',
  packaging: 'Packaging plugin files...',
  ready: 'Ready to create LV2 plugin',
  complete: 'Plugin ready for download!',
  failed: 'Build process failed',
  error: 'Conversion failed'
};

export function ConversionStatus({ 
  status, 
  progress, 
  error, 
  onRetry,
  onCreatePlugin,
  onDownload,
  pluginUrl 
}: ConversionStatusProps) {
  const isProcessing = ['uploading', 'validating', 'building', 'packaging'].includes(status);
  const showProgress = isProcessing;
  const showCreateButton = status === 'ready';
  const showDownloadButton = status === 'complete' && pluginUrl;
  // Show browse button when we're showing Create or Download buttons
  const showBrowseButton = (showCreateButton || showDownloadButton) && onRetry;

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

      {showProgress && (
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <p className="error-message">{error}</p>}

      <div className="action-buttons-container">
        {showBrowseButton && (
          <button 
            className="action-button browse"
            onClick={onRetry}
          >
            Browse New SoundFont
          </button>
        )}

        {showCreateButton && onCreatePlugin && (
          <button 
            className="action-button"
            onClick={onCreatePlugin}
          >
            Create LV2 Plugin
          </button>
        )}
      </div>

      {showDownloadButton && onDownload && (
        <button 
          className="action-button download"
          onClick={onDownload}
        >
          Download Plugin
        </button>
      )}
    </div>
  );
} 