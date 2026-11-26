import type { FaceDetectionResult } from '../types/domain.ts';
import { apiRequest } from './apiClient.ts';

export function detectFaceFrame(imageBlob: Blob): Promise<FaceDetectionResult> {
  const formData = new FormData();
  formData.append('image', imageBlob, 'frame.jpg');

  return apiRequest<FaceDetectionResult>('/face/detect', {
    method: 'POST',
    body: formData,
  });
}
