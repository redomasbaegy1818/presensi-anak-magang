import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CameraCaptureFrame,
  type CameraUiState,
} from '../components/camera/index.ts';
import { Alert, Badge, Button, EmptyState } from '../components/ui/index.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';

export default function AttendancePage() {
  usePageTitle('Presensi Harian');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cameraState, setCameraState] = useState<CameraUiState>('permission');

  const faceRegistered = Boolean(user?.participant?.faceRegistered);

  if (!faceRegistered) {
    return (
      <div className="space-y-4">
        <Alert tone="warning" title="Pendaftaran Wajah Diperlukan">
          Presensi belum diaktifkan karena data wajah Anda belum didaftarkan.
          Selesaikan pendaftaran wajah terlebih dahulu agar sistem dapat memverifikasi kehadiran Anda.
        </Alert>

        <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-5">
          <EmptyState
            title="Data wajah belum terdaftar"
            description="Setelah pendaftaran akun peserta selesai, lanjutkan ke tahap pendaftaran wajah untuk mengaktifkan presensi harian."
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

  return (
    <div className="space-y-4">
      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs text-[var(--color-text-muted)]">Status Hari Ini</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              Presensi Masuk (Check-in)
            </span>
            <Badge tone="neutral">Belum Tercatat</Badge>
          </div>
        </div>
        <Link
          to="/peserta/daftar-wajah"
          className="text-xs font-medium text-[var(--color-accent-text)] hover:underline"
        >
          Kelola Pendaftaran Wajah
        </Link>
      </section>

      <CameraCaptureFrame
        state={cameraState}
        onRequestPermission={() => setCameraState('ready')}
        onCapture={() => navigate('/peserta/hasil-presensi')}
        onRetry={() => setCameraState('ready')}
      />

      <Alert tone="info" title="Catatan Tahap Implementasi">
        Verifikasi wajah SCRFD dan penyimpanan presensi harian akan diaktifkan pada fase layanan wajah.
      </Alert>
    </div>
  );
}
