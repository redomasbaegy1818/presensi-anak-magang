import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CameraCaptureFrame,
  type CameraUiState,
} from '../components/camera/index.ts';
import { Alert, Badge, Button } from '../components/ui/index.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';

export default function AttendancePage() {
  usePageTitle('Presensi Harian');
  const navigate = useNavigate();
  const [cameraState, setCameraState] = useState<CameraUiState>('permission');

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

      <Alert tone="info" title="Catatan Fase Struktur">
        Verifikasi wajah SCRFD dan penyimpanan presensi ke database belum aktif. Tombol ambil gambar saat ini mengarahkan ke struktur halaman hasil presensi.
      </Alert>

      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/peserta/hasil-presensi')}
        >
          Lihat Struktur Hasil Presensi
        </Button>
      </div>
    </div>
  );
}
