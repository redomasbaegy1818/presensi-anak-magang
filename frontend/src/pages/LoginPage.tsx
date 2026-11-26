import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, BrandLogo, Button, LoadingState } from '../components/ui/index.ts';
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
  const { user, status, sessionError, refreshSession, loginParticipant } =
    useAuth();

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
        values.rememberMe,
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
    <div className="min-h-dvh bg-gradient-to-b from-[#f8f9fb] to-[#eef1f5] flex flex-col justify-center px-4 py-8">
      <div className="w-full max-w-md mx-auto space-y-5 animate-panel-enter">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <BrandLogo size="lg" />
            <div>
              <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent-text)]">
                Portal Peserta Magang
              </span>
              <h1 className="text-xl font-semibold text-[var(--color-text-primary)] leading-tight">
                Presensi Magang
              </h1>
            </div>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Masuk menggunakan akun peserta untuk melakukan presensi harian berbasis kamera.
          </p>
        </header>

        <main className="bg-white border border-[var(--color-border)] border-t-3 border-t-[var(--color-accent)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5 sm:p-6 space-y-5">
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
            identifierLabel="Email"
            identifierPlaceholder="Email"
            passwordLabel="Password"
            passwordPlaceholder="Password"
            submitLabel="Masuk"
            forgotPasswordHref="/lupa-password"
            rememberStorageKey="mp_remember_participant"
            loading={submitting}
            onSubmit={handleSubmit}
          />

          <div className="pt-4 border-t border-[var(--color-bg-subtle)] text-center text-sm space-y-2">
            <p className="text-[var(--color-text-secondary)]">
              Belum punya akun?{' '}
              <Link
                to="/daftar"
                className="font-semibold text-[var(--color-accent-text)] hover:underline"
              >
                Daftar sekarang
              </Link>
            </p>
            <p className="text-xs">
              <Link
                to="/admin/masuk"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:underline"
              >
                Masuk sebagai Admin →
              </Link>
            </p>
          </div>
        </main>

        <div className="grid grid-cols-3 gap-2 text-center text-xs text-[var(--color-text-secondary)]">
          <div className="rounded-[var(--radius-md)] bg-white/80 border border-[var(--color-border)] px-2 py-2">
            <span className="font-semibold text-[var(--color-accent-text)]">1.</span>{' '}
            Daftar Akun
          </div>
          <div className="rounded-[var(--radius-md)] bg-white/80 border border-[var(--color-border)] px-2 py-2">
            <span className="font-semibold text-[var(--color-accent-text)]">2.</span>{' '}
            Foto Wajah
          </div>
          <div className="rounded-[var(--radius-md)] bg-white/80 border border-[var(--color-border)] px-2 py-2">
            <span className="font-semibold text-[var(--color-accent-text)]">3.</span>{' '}
            Presensi
          </div>
        </div>

        <details className="rounded-[var(--radius-md)] bg-white/90 border border-[var(--color-border)] px-4 py-3 text-xs text-[var(--color-text-secondary)]">
          <summary className="font-medium text-[var(--color-text-primary)] cursor-pointer select-none">
            Bingung cara memulai? Lihat petunjuk singkat
          </summary>
          <ol className="mt-2.5 list-decimal pl-4 space-y-1.5 leading-relaxed">
            <li>
              <strong>Peserta baru:</strong> Klik <em>Daftar peserta magang baru</em>{' '}
              dan isi biodata beserta tanggal mulai &amp; selesai magang.
            </li>
            <li>
              <strong>Pendaftaran wajah:</strong> Setelah masuk, izinkan akses kamera
              di browser lalu ambil 1 foto wajah yang jelas di tempat terang.
            </li>
            <li>
              <strong>Presensi harian:</strong> Buka menu <em>Presensi</em> setiap
              masuk dan pulang kerja untuk verifikasi wajah otomatis.
            </li>
          </ol>
        </details>
      </div>
    </div>
  );
}
