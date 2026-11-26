import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CameraCaptureFrame,
  type CameraUiState,
} from '../components/camera/index.ts';
import { Alert, Button } from '../components/ui/index.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';

export default function FaceRegistrationPage() {
  usePageTitle('Pendaftaran Wajah');
  const navigate = useNavigate();
  const [cameraState, setCameraState] = useState<CameraUiState>('permission');

  return (
    <div className="space-y-4">
      <Alert tone="info" title="Panduan Pendaftaran Wajah">
        Pastikan pencahayaan merata, lepas masker atau kacamata gelap, dan hanya ada satu wajah di depan kamera.
      </Alert>

      <CameraCaptureFrame
        state={cameraState}
        onRequestPermission={() => setCameraState('ready')}
        onCapture={() => setCameraState('success')}
        onRetry={() => setCameraState('ready')}
        footerNote="Integrasi kamera langsung dan deteksi SCRFD akan dihubungkan pada fase layanan wajah."
      />

      <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Setelah wajah terdaftar, Anda dapat langsung menuju halaman presensi harian.
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
            variant={cameraState === 'success' ? 'primary' : 'secondary'}
            onClick={() => navigate('/peserta/presensi')}
          >
            Ke Halaman Presensi
          </Button>
        </div>
      </div>
    </div>
  );
}
