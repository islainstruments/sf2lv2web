import { SoundFontMetadata, ConversionJob } from '../types';

const API_BASE = 'http://localhost:4000/api';

interface UploadResponse {
  jobId: string;
  metadata: SoundFontMetadata;
}

export async function uploadSoundFont(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  return response.json();
}

export async function getConversionStatus(jobId: string): Promise<ConversionJob> {
  const response = await fetch(`${API_BASE}/status/${jobId}`);

  if (!response.ok) {
    throw new Error('Failed to get conversion status');
  }

  return response.json();
} 