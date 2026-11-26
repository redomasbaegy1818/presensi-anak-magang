import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, LoadingState } from '../components/ui/index.ts';
import { LoginForm, type LoginFormValues } from '../forms/LoginForm.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { ApiError } from '../services/apiClient.ts';

type ParticipantLoginNotice = 'unauthorized' | 'logged_out';

interface LoginLocationState {
  authNotice?: ParticipantLoginNotice;
  from?: string;
}

export default function LoginPage() {
  usePageTitle('Masuk Peserta');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, status, loginParticipant } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const locationState = (location.state as LoginLocationState | null) ?? null;

  if (status === 'loading') {
    return (
      <div className="min-h-dvh bg-[var(--color-bg-page)] flex items-center justify-center px-4">
        <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] px-8 py-4">
          <LoadingState label="Memeriksa sesi..." />
        </div>
      </div>
    );
  }

  if (status === 'authenticated' && user) {
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return (
      <Navigate
        to={
          user.participant?.faceRegistered
            ? '/peserta/presensi'
            : '/peserta/daftar-wajah'
        }
        replace
      />
    );
  }

  const handleSubmit = async (values: LoginFormValues) => {
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const loggedInUser = await loginParticipant(
        values.identifier,
        values.password,
      );
      const nextRoute = loggedInUser.participant?.faceRegistered
        ? '/peserta/presensi'
        : '/peserta/daftar-wajah';
      navigate(nextRoute, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'Tidak dapat terhubung ke server. Periksa jaringan Anda lalu coba lagi.',
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
              Presensi Magang
            </h1>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Masuk menggunakan akun peserta magang untuk melakukan presensi harian.
          </p>
        </header>

        <main className="bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 sm:p-6 space-y-5">
          {errorMessage ? (
            <Alert tone="danger" title="Gagal Masuk">
              {errorMessage}
            </Alert>
          ) : locationState?.authNotice === 'unauthorized' ? (
            <Alert tone="warning" title="Akses Dibatasi">
              Silakan masuk terlebih dahulu untuk membuka portal peserta.
            </Alert>
          ) : (
            locationState?.authNotice === 'logged_out' && (
              <Alert tone="success" title="Berhasil Keluar">
                Anda telah keluar dari portal peserta.
              </Alert>
            )
          )}

          <LoginForm
            identifierLabel="Email Peserta"
            identifierPlaceholder="nama@contoh.id"
            submitLabel="Masuk ke Portal Peserta"
            loading={submitting}
            onSubmit={handleSubmit}
          />

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
