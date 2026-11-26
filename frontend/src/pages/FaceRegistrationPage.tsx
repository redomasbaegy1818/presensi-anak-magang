import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CameraCaptureFrame,
  WebcamPreview,
  type CameraUiState,
} from '../components/camera/index.ts';
import { Alert, Button } from '../components/ui/index.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { useWebcam } from '../hooks/useWebcam.ts';
import { ApiError } from '../services/apiClient.ts';
import { registerParticipantFaceFrame } from '../services/faceService.ts';
import type {
  FaceBoundingBox,
  FaceRegistrationResult,
} from '../types/domain.ts';

export default function FaceRegistrationPage() {
  usePageTitle('Pendaftaran Wajah');
  const navigate = useNavigate();
  const { user, refreshSession } = useAuth();
  const {
    videoRef,
    webcamStatus,
    cameraError,
    startCamera,
    stopCamera,
    captureFrameBlob,
  } = useWebcam();

  const [flowState, setFlowState] = useState<
    | 'idle'
    | 'detecting'
    | 'success'
    | 'no_face'
    | 'multiple_faces'
    | 'low_quality'
    | 'failed'
  >('idle');
  const [statusTitle, setStatusTitle] = useState<string | undefined>(undefined);
  const [statusMessage, setStatusMessage] = useState<string | undefined>(undefined);
  const [detectedBox, setDetectedBox] = useState<FaceBoundingBox | null>(null);

  const alreadyRegistered = Boolean(user?.participant?.faceRegistered);

  const uiState: CameraUiState = (() => {
    if (flowState === 'success') return 'success';
    if (webcamStatus === 'permission') return 'permission';
    if (webcamStatus === 'loading') return 'loading';
    if (webcamStatus === 'unavailable') return 'unavailable';
    if (flowState === 'idle') return 'ready';
    return flowState;
  })();

  const handleRequestPermission = () => {
    setFlowState('idle');
    setStatusTitle(undefined);
    setStatusMessage(undefined);
    setDetectedBox(null);
    void startCamera();
  };

  const applyOutcome = async (result: FaceRegistrationResult) => {
    setDetectedBox(result.bbox);
    setStatusMessage(result.message);

    if (result.registered) {
      setFlowState('success');
      setStatusTitle('Pendaftaran wajah berhasil');
      stopCamera();
      await refreshSession();
      return;
    }

    setStatusTitle(undefined);
    if (result.status === 'no_face') {
      setFlowState('no_face');
    } else if (result.status === 'multiple_faces') {
      setFlowState('multiple_faces');
    } else {
      setFlowState('low_quality');
    }
  };

  const handleCaptureAndRegister = async () => {
    setFlowState('detecting');
    setStatusTitle('Memproses pendaftaran wajah...');
    setStatusMessage('Tahan posisi sejenak, sistem sedang memeriksa dan menyimpan profil wajah.');
    setDetectedBox(null);

    try {
      const frameBlob = await captureFrameBlob();
      const result = await registerParticipantFaceFrame(frameBlob);
      await applyOutcome(result);
    } catch (error) {
      setDetectedBox(null);
      setFlowState('failed');
      setStatusTitle('Pendaftaran wajah belum berhasil');
      if (error instanceof ApiError) {
        setStatusMessage(error.message);
      } else {
        setStatusMessage(
          'Pendaftaran wajah gagal diproses. Periksa koneksi Anda lalu coba lagi.',
        );
      }
    }
  };

  const handleRetry = () => {
    setFlowState('idle');
    setStatusTitle(undefined);
    setStatusMessage(undefined);
    setDetectedBox(null);
    if (webcamStatus !== 'ready') {
      void startCamera();
    }
  };

  return (
    <div className="space-y-3">
      {alreadyRegistered && flowState !== 'success' && (
        <Alert tone="info" title="Wajah Sudah Terdaftar">
          Data wajah Anda sudah aktif. Anda dapat langsung melakukan presensi
          atau memperbarui foto wajah di bawah ini.
        </Alert>
      )}

      <CameraCaptureFrame
        state={uiState}
        statusTitle={statusTitle}
        statusMessage={
          webcamStatus === 'unavailable'
            ? (cameraError ?? undefined)
            : statusMessage
        }
        captureLabel={
          alreadyRegistered ? 'Perbarui Data Wajah' : 'Daftarkan Wajah Saya'
        }
        onRequestPermission={handleRequestPermission}
        onCapture={() => {
          void handleCaptureAndRegister();
        }}
        onRetry={handleRetry}
        previewSlot={
          <WebcamPreview
            videoRef={videoRef}
            webcamStatus={webcamStatus}
            detectedBox={detectedBox}
          />
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-sm">
        <Link
          to="/peserta/profil"
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:underline"
        >
          Kembali ke Profil
        </Link>
        <Button
          size="sm"
          variant={
            flowState === 'success' || alreadyRegistered
              ? 'primary'
              : 'secondary'
          }
          onClick={() => navigate('/peserta/presensi')}
        >
          Ke Halaman Presensi
        </Button>
      </div>
    </div>
  );
}
