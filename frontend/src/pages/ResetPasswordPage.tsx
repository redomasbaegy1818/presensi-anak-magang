import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Alert,
  BrandLogo,
  Button,
  Input,
  LoadingState,
} from '../components/ui/index.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { ApiError } from '../services/apiClient.ts';
import {
  resetPasswordRequest,
  verifyResetTokenRequest,
} from '../services/authService.ts';

export default function ResetPasswordPage() {
  usePageTitle('Atur Ulang Kata Sandi');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';

  const [checking, setChecking] = useState(true);
  const [tokenInfo, setTokenInfo] = useState<{
    portal: 'PARTICIPANT' | 'ADMIN';
    accountLabel: string;
  } | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completedPortal, setCompletedPortal] = useState<
    'PARTICIPANT' | 'ADMIN' | null
  >(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function checkToken() {
      if (!token) {
        setVerifyError(
          'Tautan reset kata sandi tidak lengkap atau tidak ditemukan.',
        );
        setChecking(false);
        return;
      }

      setChecking(true);
      setVerifyError(null);
      try {
        const res = await verifyResetTokenRequest(token);
        if (!active) return;
        setTokenInfo({
          portal: res.portal,
          accountLabel: res.accountLabel,
        });
      } catch (error) {
        if (!active) return;
        setVerifyError(
          error instanceof ApiError
            ? error.message
            : 'Tautan reset kata sandi tidak valid atau sudah kedaluwarsa.',
        );
      } finally {
        if (active) setChecking(false);
      }
    }

    void checkToken();
    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    if (password.length < 8) {
      setSubmitError('Kata sandi baru minimal 8 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await resetPasswordRequest(token, password);
      setCompletedPortal(res.portal);
      setSuccessMessage(res.message);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : 'Gagal memperbarui kata sandi. Silakan minta tautan reset baru.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const loginPath =
    (completedPortal ?? tokenInfo?.portal) === 'ADMIN'
      ? '/admin/masuk'
      : '/masuk';

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#f8f9fb] to-[#eef1f5] flex flex-col justify-center px-4 py-8">
      <div className="w-full max-w-md mx-auto space-y-5 animate-panel-enter">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <BrandLogo size="lg" />
            <div>
              <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent-text)]">
                Pemulihan Akun
              </span>
              <h1 className="text-xl font-semibold text-[var(--color-text-primary)] leading-tight">
                Atur Ulang Kata Sandi
              </h1>
            </div>
          </div>
        </header>

        <main className="bg-white border border-[var(--color-border)] border-t-3 border-t-[var(--color-accent)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5 sm:p-6 space-y-4">
          {checking ? (
            <LoadingState label="Memeriksa tautan reset kata sandi..." />
          ) : verifyError ? (
            <div className="space-y-4">
              <Alert tone="danger" title="Tautan Tidak Berlaku">
                {verifyError}
              </Alert>
              <Link
                to="/lupa-password"
                className="inline-flex items-center justify-center w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)]"
              >
                Ajukan Reset Kata Sandi Lagi
              </Link>
            </div>
          ) : successMessage ? (
            <div className="space-y-4">
              <Alert tone="success" title="Kata Sandi Diperbarui">
                {successMessage}
              </Alert>
              <Link
                to={loginPath}
                className="inline-flex items-center justify-center w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)]"
              >
                {completedPortal === 'ADMIN'
                  ? 'Masuk ke Portal Admin'
                  : 'Masuk ke Portal Peserta'}
              </Link>
            </div>
          ) : (
            <>
              {tokenInfo && (
                <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-3.5 py-2.5 text-xs text-[var(--color-text-secondary)]">
                  Mengatur ulang kata sandi untuk{' '}
                  <strong className="text-[var(--color-text-primary)]">
                    {tokenInfo.accountLabel}
                  </strong>{' '}
                  ({tokenInfo.portal === 'ADMIN' ? 'Administrator' : 'Peserta Magang'}).
                </div>
              )}

              {submitError && (
                <Alert tone="danger" title="Gagal Menyimpan">
                  {submitError}
                </Alert>
              )}

              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <Input
                  label="Kata Sandi Baru"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Minimal 8 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />

                <Input
                  label="Konfirmasi Kata Sandi Baru"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Ketik ulang kata sandi baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />

                <Button type="submit" fullWidth loading={submitting}>
                  Simpan Kata Sandi Baru
                </Button>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
