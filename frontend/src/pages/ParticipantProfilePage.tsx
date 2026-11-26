import { useNavigate } from 'react-router-dom';
import { Badge, Button } from '../components/ui/index.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';

const PROFILE_FIELDS: { label: string; value: string }[] = [
  { label: 'Nama Lengkap', value: '—' },
  { label: 'NIM / NIS', value: '—' },
  { label: 'Universitas / Sekolah', value: '—' },
  { label: 'Jurusan', value: '—' },
  { label: 'Divisi', value: '—' },
  { label: 'Nomor HP', value: '—' },
  { label: 'Email', value: '—' },
  { label: 'Tanggal Mulai Magang', value: '—' },
  { label: 'Tanggal Selesai Magang', value: '—' },
];

export default function ParticipantProfilePage() {
  usePageTitle('Profil Peserta');
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-bg-subtle)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Informasi Dasar Peserta
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Data identitas dan periode magang yang terdaftar di sistem.
            </p>
          </div>
          <Badge tone="neutral">Menunggu Integrasi</Badge>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {PROFILE_FIELDS.map((field) => (
            <div key={field.label}>
              <dt className="text-xs text-[var(--color-text-muted)]">{field.label}</dt>
              <dd className="font-medium text-[var(--color-text-primary)] mt-0.5">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Status Data Wajah
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Belum terhubung ke layanan verifikasi wajah.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/peserta/daftar-wajah')}
        >
          Daftar / Perbarui Wajah
        </Button>
      </section>
    </div>
  );
}
