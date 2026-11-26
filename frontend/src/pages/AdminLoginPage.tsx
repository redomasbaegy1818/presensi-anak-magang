import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../components/ui/index.ts';
import { LoginForm } from '../forms/LoginForm.tsx';
import { usePageTitle } from '../hooks/usePageTitle.ts';

export default function AdminLoginPage() {
  usePageTitle('Masuk Admin');
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
              Portal Admin — Magang Presensi
            </h1>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Masuk untuk mengelola peserta, memantau presensi harian, dan menyusun laporan.
          </p>
        </header>

        <main className="bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 sm:p-6 space-y-5">
          <LoginForm
            identifierLabel="Email atau Username Admin"
            identifierPlaceholder="admin@kantor.id"
            submitLabel="Masuk ke Dashboard Admin"
            onSubmit={() => navigate('/admin/dashboard')}
          />

          <Alert tone="info" title="Tahap Struktur Aplikasi">
            Autentikasi admin akan dihubungkan pada fase backend auth. Mengirim formulir akan membuka kerangka dashboard admin.
          </Alert>

          <div className="pt-3 border-t border-[var(--color-bg-subtle)] text-sm">
            <Link
              to="/masuk"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:underline"
            >
              Kembali ke Portal Peserta
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
