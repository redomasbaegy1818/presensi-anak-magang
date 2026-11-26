import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CameraCaptureFrame,
  type CameraUiState,
} from '../components/camera/index.ts';
import { Alert, Button } from '../components/ui/index.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { useWebcam } from '../hooks/useWebcam.ts';
import { ApiError } from '../services/apiClient.ts';
import { detectFaceFrame } from '../services/faceService.ts';
import type { FaceBoundingBox, FaceDetectionResult } from '../types/domain.ts';

export default function FaceRegistrationPage() {
  usePageTitle('Pendaftaran Wajah');
  const navigate = useNavigate();
  const {
    videoRef,
    webcamStatus,
    cameraError,
    startCamera,
    captureFrameBlob,
  } = useWebcam();

  const [detectionState, setDetectionState] = useState<
    'idle' | 'detecting' | 'success' | 'no_face' | 'multiple_faces' | 'low_quality' | 'failed'
  >('idle');
  const [statusMessage, setStatusMessage] = useState<string | undefined>(undefined);
  const [detectedBox, setDetectedBox] = useState<FaceBoundingBox | null>(null);

  const uiState: CameraUiState = (() => {
    if (webcamStatus === 'permission') return 'permission';
    if (webcamStatus === 'loading') return 'loading';
    if (webcamStatus === 'unavailable') return 'unavailable';
    if (detectionState === 'idle') return 'ready';
    return detectionState;
  })();

  const handleRequestPermission = () => {
    setDetectionState('idle');
    setStatusMessage(undefined);
    setDetectedBox(null);
    void startCamera();
  };

  const applyDetectionResult = (result: FaceDetectionResult) => {
    setDetectedBox(result.bbox);
    setStatusMessage(result.message);

    switch (result.status) {
      case 'face_detected':
        setDetectionState('success');
        break;
      case 'no_face':
        setDetectionState('no_face');
        break;
      case 'multiple_faces':
        setDetectionState('multiple_faces');
        break;
      case 'low_quality':
        setDetectionState('low_quality');
        break;
    }
  };

  const handleCaptureAndDetect = async () => {
    setDetectionState('detecting');
    setStatusMessage(undefined);
    setDetectedBox(null);

    try {
      const frameBlob = await captureFrameBlob();
      const result = await detectFaceFrame(frameBlob);
      applyDetectionResult(result);
    } catch (error) {
      setDetectedBox(null);
      setDetectionState('failed');
      if (error instanceof ApiError) {
        setStatusMessage(error.message);
      } else {
        setStatusMessage(
          'Pemeriksaan posisi wajah belum berhasil diproses. Silakan coba lagi.',
        );
      }
    }
  };

  const handleRetry = () => {
    setDetectionState('idle');
    setStatusMessage(undefined);
    setDetectedBox(null);
  };

  const previewElement =
    webcamStatus === 'ready' ? (
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover -scale-x-100"
        />
        {detectedBox && (
          <div
            aria-hidden="true"
            style={{
              left: `${(1 - detectedBox.x - detectedBox.width) * 100}%`,
              top: `${detectedBox.y * 100}%`,
              width: `${detectedBox.width * 100}%`,
              height: `${detectedBox.height * 100}%`,
            }}
            className="pointer-events-none absolute border-2 border-[var(--color-success)] rounded-[var(--radius-sm)]"
          />
        )}
      </div>
    ) : (
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="hidden"
      />
    );

  return (
    <div className="space-y-4">
      <Alert tone="info" title="Panduan Pengambilan Wajah">
        Posisikan wajah di dalam area kamera dengan pencahayaan merata, lepas
        masker, dan pastikan hanya satu wajah yang terlihat.
      </Alert>

      <CameraCaptureFrame
        state={uiState}
        statusMessage={
          webcamStatus === 'unavailable'
            ? (cameraError ?? undefined)
            : statusMessage
        }
        captureLabel="Periksa Posisi Wajah"
        onRequestPermission={handleRequestPermission}
        onCapture={() => {
          void handleCaptureAndDetect();
        }}
        onRetry={handleRetry}
        previewSlot={previewElement}
        footerNote="Tahap ini memeriksa keberadaan dan kejelasan posisi wajah. Penyimpanan profil wajah aktif pada tahap berikutnya."
      />

      <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {detectionState === 'success'
            ? 'Posisi dan kualitas wajah siap untuk tahap verifikasi identitas.'
            : 'Aktifkan kamera lalu tekan Periksa Posisi Wajah untuk menguji deteksi.'}
        </p>
        <div className="flex items-center gap-2">
          <Link
            to="/peserta/profil"
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:underline px-2"
          >
            Lihat Profil
          </Link>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate('/peserta/presensi')}
          >
            Ke Halaman Presensi
          </Button>
        </div>
      </div>
    </div>
  );
}
