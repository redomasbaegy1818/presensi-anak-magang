import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../components/ui/index.ts';
import { LoginForm } from '../forms/LoginForm.tsx';
import { usePageTitle } from '../hooks/usePageTitle.ts';

export default function LoginPage() {
  usePageTitle('Masuk Peserta');
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-[var(--color-bg-page)] flex flex-col justify-center px-4 py-8">
      <div className="w-full max-w-md mx-auto space-y-5">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block w-1.5 h-6 rounded-[2px] bg-[var(--color-accent)]"
            />
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Magang Presensi
            </h1>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Masuk menggunakan akun peserta magang untuk melakukan presensi harian.
          </p>
        </header>

        <main className="bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 sm:p-6 space-y-5">
          <LoginForm
            identifierLabel="Email Peserta"
            identifierPlaceholder="nama@contoh.id"
            submitLabel="Masuk ke Portal Peserta"
            onSubmit={() => navigate('/peserta/presensi')}
          />

          <Alert tone="info" title="Tahap Struktur Aplikasi">
            Autentikasi belum dihubungkan ke server. Mengirim formulir akan
            mengarahkan ke struktur portal peserta.
          </Alert>

          <div className="pt-3 border-t border-[var(--color-bg-subtle)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
            <Link
              to="/daftar"
              className="font-medium text-[var(--color-accent-text)] hover:underline"
            >
              Daftar peserta magang baru
            </Link>
            <Link
              to="/admin/masuk"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:underline"
            >
              Masuk sebagai Admin
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
