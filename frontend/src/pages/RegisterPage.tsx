import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../components/ui/index.ts';
import { ParticipantRegistrationForm } from '../forms/ParticipantRegistrationForm.tsx';
import { usePageTitle } from '../hooks/usePageTitle.ts';

export default function RegisterPage() {
  usePageTitle('Registrasi Peserta Magang');
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-[var(--color-bg-page)] px-4 py-8">
      <div className="w-full max-w-3xl mx-auto space-y-5">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block w-1.5 h-6 rounded-[2px] bg-[var(--color-accent)]"
              />
              <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
                Registrasi Peserta Magang
              </h1>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Lengkapi data diri dan periode magang sebelum melakukan pendaftaran wajah.
            </p>
          </div>

          <Link
            to="/masuk"
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:underline"
          >
            Kembali ke Halaman Masuk
          </Link>
        </header>

        <main className="bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 sm:p-6 space-y-5">
          <Alert tone="info" title="Tahap Struktur Aplikasi">
            Validasi server dan penyimpanan database akan diaktifkan pada fase berikutnya.
          </Alert>

          <ParticipantRegistrationForm
            onSubmit={() => navigate('/peserta/daftar-wajah')}
            onCancel={() => navigate('/masuk')}
          />
        </main>
      </div>
    </div>
  );
}
