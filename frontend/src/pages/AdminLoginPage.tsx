import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, BrandLogo, Button, LoadingState } from '../components/ui/index.ts';
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
  const { user, status, sessionError, refreshSession, loginAdmin } = useAuth();

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
      await loginAdmin(values.identifier, values.password, values.rememberMe);
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
    <div className="min-h-dvh bg-gradient-to-b from-[#f8f9fb] to-[#eef1f5] flex flex-col justify-center px-4 py-8">
      <div className="w-full max-w-md mx-auto space-y-5 animate-panel-enter">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <BrandLogo size="lg" />
            <div>
              <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent-text)]">
                Portal Administrator
              </span>
              <h1 className="text-xl font-semibold text-[var(--color-text-primary)] leading-tight">
                Presensi Magang
              </h1>
            </div>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Masuk untuk mengelola peserta, memantau presensi harian, dan menyusun laporan.
          </p>
        </header>

        <main className="bg-white border border-[var(--color-border)] border-t-3 border-t-[var(--color-accent)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5 sm:p-6 space-y-4">
          {errorMessage ? (
            <Alert tone="danger" title="Gagal Masuk">
              {errorMessage}
            </Alert>
          ) : status === 'error' && sessionError ? (
            <Alert
              tone="warning"
              title="Koneksi Server Terganggu"
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void refreshSession()}
                >
                  Coba Lagi
                </Button>
              }
            >
              {sessionError}
            </Alert>
          ) : (
            notice && (
              <Alert tone={notice.tone} title={notice.title}>
                {notice.message}
              </Alert>
            )
          )}

          <LoginForm
            identifierLabel="Username / Email"
            identifierPlaceholder="Username atau email admin"
            passwordLabel="Password"
            passwordPlaceholder="Password"
            submitLabel="Masuk"
            forgotPasswordHref="/lupa-password?portal=admin"
            rememberStorageKey="mp_remember_admin"
            loading={submitting}
            onSubmit={handleSubmit}
          />

          <div className="pt-4 border-t border-[var(--color-bg-subtle)] text-center text-sm">
            <p className="text-[var(--color-text-secondary)]">
              Bukan admin?{' '}
              <Link
                to="/masuk"
                className="font-semibold text-[var(--color-accent-text)] hover:underline"
              >
                Masuk Portal Peserta
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
