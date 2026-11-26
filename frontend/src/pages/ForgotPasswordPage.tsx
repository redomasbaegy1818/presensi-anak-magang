import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Alert,
  BrandLogo,
  Button,
  Input,
} from '../components/ui/index.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { ApiError } from '../services/apiClient.ts';
import { forgotPasswordRequest } from '../services/authService.ts';

export default function ForgotPasswordPage() {
  usePageTitle('Lupa Kata Sandi');
  const [searchParams, setSearchParams] = useSearchParams();
  const portal: 'PARTICIPANT' | 'ADMIN' =
    searchParams.get('portal') === 'admin' ? 'ADMIN' : 'PARTICIPANT';

  const [identifier, setIdentifier] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultInfo, setResultInfo] = useState<{
    smtpConfigured: boolean;
    message: string;
  } | null>(null);

  const handlePortalSwitch = (nextPortal: 'PARTICIPANT' | 'ADMIN') => {
    setErrorMessage(null);
    setResultInfo(null);
    setIdentifier('');
    if (nextPortal === 'ADMIN') {
      setSearchParams({ portal: 'admin' }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setResultInfo(null);

    if (!identifier.trim()) {
      setErrorMessage(
        portal === 'ADMIN'
          ? 'Masukkan email atau username admin Anda.'
          : 'Masukkan email peserta yang terdaftar.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await forgotPasswordRequest(identifier.trim(), portal);
      setResultInfo(response);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Gagal mengirim permintaan reset kata sandi. Coba lagi.',
      );
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
                Pemulihan Akun
              </span>
              <h1 className="text-xl font-semibold text-[var(--color-text-primary)] leading-tight">
                Lupa Kata Sandi
              </h1>
            </div>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Pilih jenis akun lalu masukkan identitas terdaftar untuk mengatur
            ulang kata sandi.
          </p>
        </header>

        <main className="bg-white border border-[var(--color-border)] border-t-3 border-t-[var(--color-accent)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5 sm:p-6 space-y-4">
          <div
            role="tablist"
            aria-label="Pilih jenis portal akun"
            className="grid grid-cols-2 gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={portal === 'PARTICIPANT'}
              onClick={() => handlePortalSwitch('PARTICIPANT')}
              className={[
                'py-2 px-3 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors cursor-pointer',
                portal === 'PARTICIPANT'
                  ? 'bg-white text-[var(--color-text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              Peserta Magang
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={portal === 'ADMIN'}
              onClick={() => handlePortalSwitch('ADMIN')}
              className={[
                'py-2 px-3 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors cursor-pointer',
                portal === 'ADMIN'
                  ? 'bg-white text-[var(--color-text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              Administrator
            </button>
          </div>

          {errorMessage && (
            <Alert tone="danger" title="Permintaan Gagal">
              {errorMessage}
            </Alert>
          )}

          {resultInfo && (
            <Alert
              tone={resultInfo.smtpConfigured ? 'success' : 'info'}
              title={
                resultInfo.smtpConfigured
                  ? 'Periksa Kotak Masuk Email'
                  : 'Permintaan Diterima'
              }
            >
              <p>{resultInfo.message}</p>
              {!resultInfo.smtpConfigured && (
                <p className="mt-1.5 text-xs">
                  {portal === 'PARTICIPANT'
                    ? 'Admin kantor juga dapat membuatkan tautan reset 1 kali pakai secara langsung melalui menu Peserta Magang → Detail Peserta.'
                    : 'Administrator juga dapat mereset kata sandi langsung di server melalui perintah npm run db:reset-password.'}
                </p>
              )}
            </Alert>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <Input
              label={
                portal === 'ADMIN'
                  ? 'Email atau Username Admin'
                  : 'Email Peserta Terdaftar'
              }
              type={portal === 'ADMIN' ? 'text' : 'email'}
              placeholder={
                portal === 'ADMIN' ? 'admin@kantor.id' : 'nama@contoh.id'
              }
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />

            <Button type="submit" fullWidth loading={submitting}>
              Kirim Tautan Reset Kata Sandi
            </Button>
          </form>

          <div className="pt-3 border-t border-[var(--color-bg-subtle)] flex flex-wrap items-center justify-between gap-2 text-sm">
            <Link
              to={portal === 'ADMIN' ? '/admin/masuk' : '/masuk'}
              className="font-medium text-[var(--color-accent-text)] hover:underline"
            >
              Kembali ke Halaman Masuk
            </Link>
            {portal === 'PARTICIPANT' && (
              <Link
                to="/daftar"
                className="text-[var(--color-text-secondary)] hover:underline"
              >
                Daftar akun baru
              </Link>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
