import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Alert, Button, LoadingState, SuccessState } from '../components/ui/index.ts';
import {
  ParticipantRegistrationForm,
  type ParticipantRegistrationValues,
} from '../forms/ParticipantRegistrationForm.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { ApiError } from '../services/apiClient.ts';

export default function RegisterPage() {
  usePageTitle('Registrasi Peserta Magang');
  const navigate = useNavigate();
  const { user, status, registerParticipant } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<
    Record<string, string[]> | undefined
  >(undefined);
  const [registeredName, setRegisteredName] = useState<string | null>(null);

  if (status === 'loading') {
    return (
      <div className="min-h-dvh bg-[var(--color-bg-page)] flex items-center justify-center px-4">
        <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] px-8 py-4">
          <LoadingState label="Memeriksa sesi..." />
        </div>
      </div>
    );
  }

  if (!registeredName && status === 'authenticated' && user) {
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

  const handleSubmit = async (values: ParticipantRegistrationValues) => {
    setErrorMessage(null);
    setServerErrors(undefined);
    setSubmitting(true);

    try {
      const res = await registerParticipant(values);
      setRegisteredName(res.participant.fullName);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        setServerErrors(error.details);
      } else {
        setErrorMessage(
          'Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

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

          {!registeredName && (
            <Link
              to="/masuk"
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:underline"
            >
              Kembali ke Halaman Masuk
            </Link>
          )}
        </header>

        <main className="bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 sm:p-6 space-y-5">
          {registeredName ? (
            <SuccessState
              title="Pendaftaran Peserta Berhasil"
              description={`Akun untuk ${registeredName} telah terdaftar dengan status aktif. Langkah berikutnya adalah mendaftarkan wajah sebelum presensi dapat digunakan.`}
              action={
                <Button
                  size="lg"
                  onClick={() => navigate('/peserta/daftar-wajah', { replace: true })}
                >
                  Lanjutkan ke Pendaftaran Wajah
                </Button>
              }
            />
          ) : (
            <>
              {errorMessage && (
                <Alert tone="danger" title="Pendaftaran Belum Berhasil">
                  {errorMessage}
                </Alert>
              )}

              <ParticipantRegistrationForm
                loading={submitting}
                serverErrors={serverErrors}
                onSubmit={handleSubmit}
                onCancel={() => navigate('/masuk')}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
