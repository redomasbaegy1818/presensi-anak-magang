import type {
  FaceDetectionResult,
  FaceRegistrationResult,
  FaceVerificationResult,
} from '../types/domain.ts';
import { apiRequest } from './apiClient.ts';

function buildImageFormData(imageBlob: Blob): FormData {
  const formData = new FormData();
  formData.append('image', imageBlob, 'frame.jpg');
  return formData;
}

export function detectFaceFrame(imageBlob: Blob): Promise<FaceDetectionResult> {
  return apiRequest<FaceDetectionResult>('/face/detect', {
    method: 'POST',
    body: buildImageFormData(imageBlob),
  });
}

export function registerParticipantFaceFrame(
  imageBlob: Blob,
): Promise<FaceRegistrationResult> {
  return apiRequest<FaceRegistrationResult>('/participant/face/register', {
    method: 'POST',
    body: buildImageFormData(imageBlob),
  });
}

export function verifyParticipantFaceFrame(
  imageBlob: Blob,
): Promise<FaceVerificationResult> {
  return apiRequest<FaceVerificationResult>('/participant/face/verify', {
    method: 'POST',
    body: buildImageFormData(imageBlob),
  });
}
