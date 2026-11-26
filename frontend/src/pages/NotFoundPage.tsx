import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle.ts';

export default function NotFoundPage() {
  usePageTitle('Halaman Tidak Ditemukan');

  return (
    <div className="min-h-dvh bg-[var(--color-bg-page)] flex items-center justify-center px-4">
      <main className="w-full max-w-md bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 text-center space-y-3">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Alamat yang Anda tuju tidak tersedia atau telah dipindahkan.
        </p>
        <div className="pt-2">
          <Link
            to="/masuk"
            className="inline-flex items-center justify-center min-h-10 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)]"
          >
            Kembali ke Halaman Masuk
          </Link>
        </div>
      </main>
    </div>
  );
}
