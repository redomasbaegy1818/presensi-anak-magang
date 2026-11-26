import { useNavigate } from 'react-router-dom';
import { Badge, Button, SuccessState } from '../components/ui/index.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';

export default function AttendanceResultPage() {
  usePageTitle('Hasil Presensi');
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <SuccessState
        title="Struktur Halaman Hasil Presensi"
        description="Setelah integrasi backend dan verifikasi wajah aktif, ringkasan hasil check-in atau check-out peserta akan ditampilkan di sini."
      />

      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4 sm:p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Rincian Pencatatan
        </h2>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-[var(--color-text-muted)]">Jenis Presensi</dt>
            <dd className="font-medium text-[var(--color-text-primary)]">—</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-text-muted)]">Waktu Tercatat</dt>
            <dd className="font-medium tabular-nums text-[var(--color-text-primary)]">
              — WIB
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-text-muted)]">Status Kehadiran</dt>
            <dd className="pt-0.5">
              <Badge tone="neutral">Menunggu Integrasi</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-text-muted)]">Hasil Verifikasi</dt>
            <dd className="font-medium text-[var(--color-text-primary)]">—</dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => navigate('/peserta/riwayat')}
        >
          Lihat Riwayat Presensi
        </Button>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => navigate('/peserta/presensi')}
        >
          Kembali ke Presensi
        </Button>
      </div>
    </div>
  );
}
