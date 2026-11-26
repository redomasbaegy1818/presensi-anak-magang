import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, LoadingState } from '../components/ui/index.ts';
import { LoginForm, type LoginFormValues } from '../forms/LoginForm.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { ApiError } from '../services/apiClient.ts';

type AuthNoticeType = 'unauthorized' | 'expired' | 'forbidden' | 'logged_out';

interface LoginLocationState {
  authNotice?: AuthNoticeType;
  from?: string;
}

const NOTICE_CONTENT: Record<
  AuthNoticeType,
  { tone: 'warning' | 'danger' | 'success'; title: string; message: string }
> = {
  unauthorized: {
    tone: 'warning',
    title: 'Akses Dibatasi',
    message: 'Silakan masuk terlebih dahulu untuk mengakses portal admin.',
  },
  expired: {
    tone: 'warning',
    title: 'Sesi Berakhir',
    message: 'Sesi login Anda telah berakhir atau tidak valid. Silakan masuk kembali.',
  },
  forbidden: {
    tone: 'danger',
    title: 'Akses Ditolak',
    message: 'Akun Anda tidak memiliki hak akses administrator.',
  },
  logged_out: {
    tone: 'success',
    title: 'Berhasil Keluar',
    message: 'Anda telah keluar dari portal admin.',
  },
};

export default function AdminLoginPage() {
  usePageTitle('Masuk Admin');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, status, loginAdmin } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const locationState = (location.state as LoginLocationState | null) ?? null;
  const notice = locationState?.authNotice
    ? NOTICE_CONTENT[locationState.authNotice]
    : null;

  if (status === 'loading') {
    return (
      <div className="min-h-dvh bg-[var(--color-bg-page)] flex items-center justify-center px-4">
        <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] px-8 py-4">
          <LoadingState label="Memeriksa sesi..." />
        </div>
      </div>
    );
  }

  if (status === 'authenticated' && user?.role === 'ADMIN') {
    const target = locationState?.from || '/admin/dashboard';
    return <Navigate to={target} replace />;
  }

  const handleSubmit = async (values: LoginFormValues) => {
    setErrorMessage(null);
    setSubmitting(true);

    try {
      await loginAdmin(values.identifier, values.password);
      const destination =
        locationState?.from && locationState.from.startsWith('/admin')
          ? locationState.from
          : '/admin/dashboard';
      navigate(destination, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'Tidak dapat terhubung ke server. Periksa jaringan atau pastikan backend sedang berjalan.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

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

        <main className="bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 sm:p-6 space-y-4">
          {errorMessage ? (
            <Alert tone="danger" title="Gagal Masuk">
              {errorMessage}
            </Alert>
          ) : (
            notice && (
              <Alert tone={notice.tone} title={notice.title}>
                {notice.message}
              </Alert>
            )
          )}

          <LoginForm
            identifierLabel="Email atau Username Admin"
            identifierPlaceholder="admin@kantor.id"
            submitLabel="Masuk ke Dashboard Admin"
            loading={submitting}
            onSubmit={handleSubmit}
          />

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
