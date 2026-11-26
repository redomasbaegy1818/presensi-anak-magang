import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CameraCaptureFrame,
  WebcamPreview,
  type CameraUiState,
} from '../components/camera/index.ts';
import { Alert, Badge, Button, EmptyState } from '../components/ui/index.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { useWebcam } from '../hooks/useWebcam.ts';
import { ApiError } from '../services/apiClient.ts';
import { verifyParticipantFaceFrame } from '../services/faceService.ts';
import type {
  FaceBoundingBox,
  FaceVerificationResult,
} from '../types/domain.ts';

export default function AttendancePage() {
  usePageTitle('Presensi Harian');
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    videoRef,
    webcamStatus,
    cameraError,
    startCamera,
    captureFrameBlob,
  } = useWebcam();

  const [flowState, setFlowState] = useState<
    | 'idle'
    | 'verifying'
    | 'success'
    | 'failed'
    | 'no_face'
    | 'multiple_faces'
    | 'low_quality'
  >('idle');
  const [statusTitle, setStatusTitle] = useState<string | undefined>(undefined);
  const [statusMessage, setStatusMessage] = useState<string | undefined>(undefined);
  const [detectedBox, setDetectedBox] = useState<FaceBoundingBox | null>(null);
  const [lastMatched, setLastMatched] = useState<boolean>(true);

  const faceRegistered = Boolean(user?.participant?.faceRegistered);

  if (!faceRegistered) {
    return (
      <div className="space-y-4">
        <Alert tone="warning" title="Pendaftaran Wajah Diperlukan">
          Presensi belum diaktifkan karena data wajah Anda belum didaftarkan.
          Selesaikan pendaftaran wajah terlebih dahulu agar sistem dapat memverifikasi identitas Anda.
        </Alert>

        <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-5">
          <EmptyState
            title="Data wajah belum terdaftar"
            description="Setelah pendaftaran akun peserta selesai, lanjutkan ke tahap pendaftaran wajah untuk mengaktifkan verifikasi presensi."
            action={
              <Button
                size="lg"
                onClick={() => navigate('/peserta/daftar-wajah')}
              >
                Lanjutkan ke Pendaftaran Wajah
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const uiState: CameraUiState = (() => {
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

  const applyVerificationOutcome = (result: FaceVerificationResult) => {
    setDetectedBox(result.bbox);
    setStatusMessage(result.message);
    setLastMatched(result.matched);

    switch (result.status) {
      case 'verified':
        setFlowState('success');
        setStatusTitle('Verifikasi wajah berhasil');
        break;
      case 'not_verified':
        setFlowState('failed');
        setStatusTitle('Wajah tidak sesuai');
        break;
      case 'unknown_participant':
        setFlowState('failed');
        setStatusTitle('Data wajah tidak ditemukan');
        break;
      case 'no_face':
        setFlowState('no_face');
        setStatusTitle(undefined);
        break;
      case 'multiple_faces':
        setFlowState('multiple_faces');
        setStatusTitle(undefined);
        break;
      case 'insufficient_quality':
        setFlowState('low_quality');
        setStatusTitle(undefined);
        break;
    }
  };

  const handleVerify = async () => {
    setFlowState('verifying');
    setStatusTitle('Memverifikasi identitas wajah...');
    setStatusMessage('Sistem sedang mencocokkan wajah dengan profil terdaftar.');
    setDetectedBox(null);

    try {
      const frameBlob = await captureFrameBlob();
      const result = await verifyParticipantFaceFrame(frameBlob);
      applyVerificationOutcome(result);
    } catch (error) {
      setDetectedBox(null);
      setLastMatched(false);
      setFlowState('failed');
      setStatusTitle('Verifikasi belum dapat diproses');
      if (error instanceof ApiError) {
        setStatusMessage(error.message);
      } else {
        setStatusMessage(
          'Terjadi kendala saat memverifikasi wajah. Periksa koneksi Anda lalu coba lagi.',
        );
      }
    }
  };

  const handleRetry = () => {
    setFlowState('idle');
    setStatusTitle(undefined);
    setStatusMessage(undefined);
    setDetectedBox(null);
    setLastMatched(true);
  };

  return (
    <div className="space-y-4">
      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs text-[var(--color-text-muted)]">Mode Pengujian Verifikasi</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              Verifikasi Identitas Wajah
            </span>
            <Badge tone={flowState === 'success' ? 'success' : 'neutral'}>
              {flowState === 'success' ? 'Terverifikasi' : 'Siap Diverifikasi'}
            </Badge>
          </div>
        </div>
        <Link
          to="/peserta/daftar-wajah"
          className="text-xs font-medium text-[var(--color-accent-text)] hover:underline"
        >
          Perbarui Data Wajah
        </Link>
      </section>

      <CameraCaptureFrame
        state={uiState}
        statusTitle={statusTitle}
        statusMessage={
          webcamStatus === 'unavailable'
            ? (cameraError ?? undefined)
            : statusMessage
        }
        captureLabel="Verifikasi Wajah"
        onRequestPermission={handleRequestPermission}
        onCapture={() => {
          void handleVerify();
        }}
        onRetry={handleRetry}
        previewSlot={
          <WebcamPreview
            videoRef={videoRef}
            webcamStatus={webcamStatus}
            detectedBox={detectedBox}
            boxTone={lastMatched ? 'success' : 'danger'}
          />
        }
      />

      <Alert tone="info" title="Catatan Tahap Implementasi">
        Verifikasi identitas wajah sudah aktif. Pencatatan presensi masuk dan pulang
        ke jadwal kerja kantor akan diaktifkan pada fase berikutnya.
      </Alert>
    </div>
  );
}
