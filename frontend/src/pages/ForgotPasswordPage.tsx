import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CameraCaptureFrame,
  WebcamPreview,
  type CameraUiState,
} from '../components/camera/index.ts';
import {
  Alert,
  BrandLogo,
  Button,
  Input,
} from '../components/ui/index.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { useWebcam } from '../hooks/useWebcam.ts';
import { ApiError } from '../services/apiClient.ts';
import {
  forgotPasswordRequest,
  resetPasswordRequest,
  resetPasswordWithCodeRequest,
  verifyFaceForPasswordResetRequest,
  verifyResetCodeRequest,
} from '../services/authService.ts';

type ResetFlowStep = 'request' | 'verify_code' | 'set_password' | 'done';
type ParticipantRecoveryMethod = 'face' | 'email';

export default function ForgotPasswordPage() {
  usePageTitle('Lupa Kata Sandi');
  const [searchParams, setSearchParams] = useSearchParams();
  const portal: 'PARTICIPANT' | 'ADMIN' =
    searchParams.get('portal') === 'admin' ? 'ADMIN' : 'PARTICIPANT';

  const [step, setStep] = useState<ResetFlowStep>('request');
  const [method, setMethod] = useState<ParticipantRecoveryMethod>('face');
  const [identifier, setIdentifier] = useState('');
  const [nimNis, setNimNis] = useState('');
  const [code, setCode] = useState('');
  const [faceResetToken, setFaceResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestInfo, setRequestInfo] = useState<{
    smtpConfigured: boolean;
    expiresInMinutes: number;
    message: string;
  } | null>(null);
  const [verifiedAccountLabel, setVerifiedAccountLabel] = useState<
    string | null
  >(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const {
    videoRef,
    webcamStatus,
    cameraError,
    startCamera,
    stopCamera,
    captureFrameBlob,
  } = useWebcam();

  const [faceFlowState, setFaceFlowState] = useState<
    | 'idle'
    | 'detecting'
    | 'no_face'
    | 'multiple_faces'
    | 'low_quality'
    | 'failed'
  >('idle');
  const [faceStatusTitle, setFaceStatusTitle] = useState<string | undefined>(
    undefined,
  );
  const [faceStatusMessage, setFaceStatusMessage] = useState<
    string | undefined
  >(undefined);

  const activeMethod: ParticipantRecoveryMethod =
    portal === 'ADMIN' ? 'email' : method;

  const cameraUiState: CameraUiState = (() => {
    if (webcamStatus === 'permission') return 'permission';
    if (webcamStatus === 'loading') return 'loading';
    if (webcamStatus === 'unavailable') return 'unavailable';
    if (faceFlowState === 'idle') return 'ready';
    return faceFlowState;
  })();

  const resetCameraUi = () => {
    setFaceFlowState('idle');
    setFaceStatusTitle(undefined);
    setFaceStatusMessage(undefined);
  };

  const handlePortalSwitch = (nextPortal: 'PARTICIPANT' | 'ADMIN') => {
    stopCamera();
    resetCameraUi();
    setStep('request');
    setErrorMessage(null);
    setRequestInfo(null);
    setVerifiedAccountLabel(null);
    setDoneMessage(null);
    setFaceResetToken(null);
    setIdentifier('');
    setNimNis('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    if (nextPortal === 'ADMIN') {
      setSearchParams({ portal: 'admin' }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleMethodSwitch = (nextMethod: ParticipantRecoveryMethod) => {
    if (nextMethod !== 'face') {
      stopCamera();
    }
    resetCameraUi();
    setErrorMessage(null);
    setMethod(nextMethod);
  };

  const handleFaceVerifyCapture = async () => {
    setErrorMessage(null);
    const trimmedEmail = identifier.trim();
    const trimmedNim = nimNis.trim();

    if (!trimmedEmail || !trimmedNim) {
      setErrorMessage(
        'Masukkan Email dan NIM/NIS terlebih dahulu sebelum mengambil foto wajah.',
      );
      return;
    }

    setFaceFlowState('detecting');
    setFaceStatusTitle('Memeriksa kesesuaian wajah...');
    setFaceStatusMessage(
      'Tahan posisi sejenak, sistem sedang mencocokkan wajah dengan profil Anda.',
    );

    try {
      const frameBlob = await captureFrameBlob();
      const result = await verifyFaceForPasswordResetRequest(
        trimmedEmail,
        trimmedNim,
        frameBlob,
      );

      if (result.verified && result.resetToken) {
        stopCamera();
        resetCameraUi();
        setFaceResetToken(result.resetToken);
        setVerifiedAccountLabel(result.accountLabel ?? trimmedEmail);
        setStep('set_password');
        return;
      }

      setFaceStatusMessage(result.message);
      switch (result.verificationStatus) {
        case 'no_face':
          setFaceFlowState('no_face');
          setFaceStatusTitle(undefined);
          break;
        case 'multiple_faces':
          setFaceFlowState('multiple_faces');
          setFaceStatusTitle(undefined);
          break;
        case 'insufficient_quality':
          setFaceFlowState('low_quality');
          setFaceStatusTitle(undefined);
          break;
        default:
          setFaceFlowState('failed');
          setFaceStatusTitle('Verifikasi wajah gagal');
          break;
      }
    } catch (error) {
      setFaceFlowState('failed');
      setFaceStatusTitle('Verifikasi gagal diproses');
      setFaceStatusMessage(
        error instanceof ApiError
          ? error.message
          : 'Tidak dapat memverifikasi wajah. Periksa koneksi Anda lalu coba lagi.',
      );
    }
  };

  const handleRequestSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

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
      setRequestInfo(response);
      setCode('');
      setFaceResetToken(null);
      setStep('verify_code');
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

  const handleResendCode = async () => {
    if (!identifier.trim()) return;
    setErrorMessage(null);
    setResending(true);
    try {
      const response = await forgotPasswordRequest(identifier.trim(), portal);
      setRequestInfo(response);
      setCode('');
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Gagal mengirim ulang kode verifikasi.',
      );
    } finally {
      setResending(false);
    }
  };

  const handleVerifyCodeSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    const normalizedCode = code.replace(/\D/g, '');
    if (!/^\d{6}$/.test(normalizedCode)) {
      setErrorMessage('Masukkan kode verifikasi 6 digit angka.');
      return;
    }

    setSubmitting(true);
    try {
      const verified = await verifyResetCodeRequest(
        identifier.trim(),
        portal,
        normalizedCode,
      );
      setCode(normalizedCode);
      setFaceResetToken(null);
      setVerifiedAccountLabel(verified.accountLabel);
      setStep('set_password');
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Gagal memeriksa kode verifikasi.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage('Kata sandi baru minimal 8 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setSubmitting(true);
    try {
      const res = faceResetToken
        ? await resetPasswordRequest(faceResetToken, newPassword)
        : await resetPasswordWithCodeRequest(
            identifier.trim(),
            portal,
            code,
            newPassword,
          );
      setDoneMessage(res.message);
      setStep('done');
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Gagal memperbarui kata sandi. Coba lagi.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const loginPath = portal === 'ADMIN' ? '/admin/masuk' : '/masuk';

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
            {portal === 'PARTICIPANT'
              ? 'Verifikasi langsung memakai kamera wajah tanpa email, atau gunakan kode verifikasi email.'
              : 'Pulihkan kata sandi admin melalui verifikasi email atau perintah server.'}
          </p>
        </header>

        <main className="bg-white border border-[var(--color-border)] border-t-3 border-t-[var(--color-accent)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5 sm:p-6 space-y-4">
          {step === 'request' && (
            <div className="space-y-3">
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

              {portal === 'PARTICIPANT' && (
                <div
                  role="tablist"
                  aria-label="Pilih metode verifikasi peserta"
                  className="grid grid-cols-2 gap-2 text-xs"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeMethod === 'face'}
                    onClick={() => handleMethodSwitch('face')}
                    className={[
                      'py-2 px-3 rounded-[var(--radius-sm)] border font-medium transition-colors cursor-pointer',
                      activeMethod === 'face'
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent-text)]'
                        : 'border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:bg-slate-50',
                    ].join(' ')}
                  >
                    Kamera Wajah (Praktis)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeMethod === 'email'}
                    onClick={() => handleMethodSwitch('email')}
                    className={[
                      'py-2 px-3 rounded-[var(--radius-sm)] border font-medium transition-colors cursor-pointer',
                      activeMethod === 'email'
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent-text)]'
                        : 'border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:bg-slate-50',
                    ].join(' ')}
                  >
                    Kode Email
                  </button>
                </div>
              )}
            </div>
          )}

          {errorMessage && (
            <Alert tone="danger" title="Verifikasi Gagal">
              {errorMessage}
            </Alert>
          )}

          {step === 'request' && activeMethod === 'face' && (
            <div className="space-y-4">
              <Input
                label="Email Peserta Terdaftar"
                type="email"
                placeholder="nama@contoh.id"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />

              <Input
                label="NIM / NIS"
                type="text"
                placeholder="Masukkan NIM atau NIS Anda"
                value={nimNis}
                onChange={(e) => setNimNis(e.target.value)}
                required
              />

              <CameraCaptureFrame
                state={cameraUiState}
                statusTitle={faceStatusTitle}
                statusMessage={
                  webcamStatus === 'unavailable'
                    ? (cameraError ?? undefined)
                    : faceStatusMessage
                }
                captureLabel="Verifikasi Wajah & Lanjut"
                onRequestPermission={() => {
                  resetCameraUi();
                  void startCamera();
                }}
                onCapture={() => {
                  void handleFaceVerifyCapture();
                }}
                onRetry={() => {
                  resetCameraUi();
                  if (webcamStatus !== 'ready') {
                    void startCamera();
                  }
                }}
                previewSlot={
                  <WebcamPreview
                    videoRef={videoRef}
                    webcamStatus={webcamStatus}
                    detectedBox={null}
                  />
                }
              />

              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Belum pernah mendaftarkan wajah atau tidak ada kamera? Anda
                dapat meminta <strong>tautan reset satu kali</strong> secara
                langsung ke Admin kantor (menu{' '}
                <em>Peserta Magang → Detail → Reset Sandi</em>).
              </p>
            </div>
          )}

          {step === 'request' && activeMethod === 'email' && (
            <div className="space-y-4">
              <form
                onSubmit={(e) => void handleRequestSubmit(e)}
                className="space-y-4"
              >
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

                <Button type="submit" size="lg" fullWidth loading={submitting}>
                  Kirim Kode Verifikasi
                </Button>
              </form>

              {portal === 'ADMIN' && (
                <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] p-3 text-xs text-[var(--color-text-secondary)] space-y-1">
                  <p className="font-semibold text-[var(--color-text-primary)]">
                    Atau reset cepat lewat server (tanpa email):
                  </p>
                  <p>
                    Jalankan di folder <code>backend</code>:{' '}
                    <code className="text-[11px]">
                      npm run db:reset-password -- admin PasswordBaru123
                    </code>
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 'verify_code' && requestInfo && (
            <div className="space-y-4">
              <Alert
                tone={requestInfo.smtpConfigured ? 'info' : 'warning'}
                title={
                  requestInfo.smtpConfigured
                    ? 'Periksa Email Anda'
                    : 'Mode Lokal / Tanpa SMTP'
                }
              >
                <p>{requestInfo.message}</p>
                <p className="mt-1 text-xs">
                  Kode maupun tombol verifikasi berlaku{' '}
                  <strong>{requestInfo.expiresInMinutes} menit</strong>. Anda
                  bisa memasukkan kode 6 digit di bawah ini atau langsung klik
                  tombol <strong>Ubah Kata Sandi Sekarang</strong> pada email.
                </p>
              </Alert>

              <form
                onSubmit={(e) => void handleVerifyCodeSubmit(e)}
                className="space-y-4"
              >
                <Input
                  label="Kode Verifikasi (6 Digit)"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  className="h-12 text-center text-xl font-bold tracking-[0.35em] tabular-nums"
                  required
                />

                <Button type="submit" size="lg" fullWidth loading={submitting}>
                  Verifikasi Kode
                </Button>
              </form>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  disabled={resending}
                  onClick={() => void handleResendCode()}
                  className="font-medium text-[var(--color-accent-text)] hover:underline cursor-pointer disabled:opacity-60"
                >
                  {resending ? 'Mengirim ulang...' : 'Kirim ulang kode'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('request');
                    setErrorMessage(null);
                    setCode('');
                  }}
                  className="text-[var(--color-text-secondary)] hover:underline cursor-pointer"
                >
                  Ganti email / akun
                </button>
              </div>
            </div>
          )}

          {step === 'set_password' && (
            <div className="space-y-4">
              <Alert tone="success" title="Identitas Terverifikasi">
                {verifiedAccountLabel
                  ? `Verifikasi berhasil untuk ${verifiedAccountLabel}. Silakan buat kata sandi baru Anda.`
                  : 'Verifikasi berhasil. Silakan buat kata sandi baru Anda.'}
              </Alert>

              <form
                onSubmit={(e) => void handleSetPasswordSubmit(e)}
                className="space-y-4"
              >
                <Input
                  label="Kata Sandi Baru"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Minimal 8 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

                <Button type="submit" size="lg" fullWidth loading={submitting}>
                  Simpan Kata Sandi Baru
                </Button>
              </form>
            </div>
          )}

          {step === 'done' && doneMessage && (
            <div className="space-y-4">
              <Alert tone="success" title="Kata Sandi Diperbarui">
                {doneMessage}
              </Alert>
              <Link
                to={loginPath}
                className="inline-flex items-center justify-center w-full h-11 px-4 rounded-[var(--radius-sm)] bg-[var(--color-accent)] text-white text-sm font-semibold hover:bg-[var(--color-accent-hover)]"
              >
                {portal === 'ADMIN'
                  ? 'Masuk ke Portal Admin'
                  : 'Masuk ke Portal Peserta'}
              </Link>
            </div>
          )}

          {step !== 'done' && (
            <div className="pt-3 border-t border-[var(--color-bg-subtle)] flex flex-wrap items-center justify-between gap-2 text-sm">
              <Link
                to={loginPath}
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
          )}
        </main>
      </div>
    </div>
  );
}
