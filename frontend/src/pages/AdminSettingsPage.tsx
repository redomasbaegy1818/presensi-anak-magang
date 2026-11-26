import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  ErrorState,
  LoadingState,
} from '../components/ui/index.ts';
import { AttendanceSettingsForm } from '../forms/AttendanceSettingsForm.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import {
  getAdminSettings,
  updateAdminSettings,
} from '../services/adminService.ts';
import { ApiError } from '../services/apiClient.ts';
import type {
  AdminAttendanceSettingsDetail,
  AttendanceSettingsData,
} from '../types/domain.ts';
import { formatDateTimeWib } from '../utils/formatDate.ts';

export default function AdminSettingsPage() {
  usePageTitle('Pengaturan Presensi');
  const navigate = useNavigate();
  const { clearAuthenticatedUser } = useAuth();

  const [settings, setSettings] =
    useState<AdminAttendanceSettingsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<
    Record<string, string[]> | undefined
  >(undefined);

  const handleUnauthorized = useCallback(() => {
    clearAuthenticatedUser();
    navigate('/admin/masuk', {
      replace: true,
      state: { authNotice: 'expired' },
    });
  }, [clearAuthenticatedUser, navigate]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await getAdminSettings();
      setSettings(response.settings);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized();
        return;
      }
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Gagal memuat pengaturan aturan presensi.',
      );
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSubmit = async (values: AttendanceSettingsData) => {
    setSubmitting(true);
    setSuccessMessage(null);
    setSubmitError(null);
    setServerFieldErrors(undefined);

    try {
      const response = await updateAdminSettings(values);
      setSettings(response.settings);
      setSuccessMessage(
        response.message ?? 'Pengaturan aturan presensi berhasil disimpan.',
      );
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          handleUnauthorized();
          return;
        }
        setServerFieldErrors(error.details);
        setSubmitError(error.message);
        return;
      }
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Gagal menyimpan pengaturan aturan presensi.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
          Pengaturan Aturan Presensi
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Atur jam masuk, toleransi keterlambatan, batas check-out, dan penyimpanan bukti (WIB).
        </p>
      </div>

      {successMessage && (
        <Alert
          tone="success"
          title="Pengaturan tersimpan"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSuccessMessage(null)}
            >
              Tutup
            </Button>
          }
        >
          {successMessage}
        </Alert>
      )}

      {submitError && (
        <Alert
          tone="danger"
          title="Gagal menyimpan pengaturan"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSubmitError(null)}
            >
              Tutup
            </Button>
          }
        >
          {submitError}
        </Alert>
      )}

      {loading ? (
        <LoadingState label="Memuat pengaturan presensi..." />
      ) : loadError || !settings ? (
        <ErrorState
          title="Pengaturan belum dapat dimuat"
          description={loadError ?? 'Data pengaturan tidak tersedia.'}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadSettings()}
            >
              Coba Lagi
            </Button>
          }
        />
      ) : (
        <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-5 space-y-4">
          <AttendanceSettingsForm
            initialValues={settings}
            submitting={submitting}
            serverErrors={serverFieldErrors}
            onSubmit={handleSubmit}
          />

          <p className="text-xs text-[var(--color-text-muted)]">
            Terakhir diperbarui: {formatDateTimeWib(settings.updatedAt)}
            {settings.updatedByLabel ? ` oleh ${settings.updatedByLabel}` : ''}.
          </p>

          <details className="rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)]/70 border border-[var(--color-border)] px-3.5 py-2.5 text-xs text-[var(--color-text-secondary)]">
            <summary className="font-medium text-[var(--color-text-primary)] cursor-pointer select-none">
              Penjelasan cara kerja aturan jam presensi
            </summary>
            <ul className="mt-2 list-disc pl-4 space-y-1 leading-relaxed">
              <li>
                <strong>Sebelum Buka Presensi Masuk:</strong> Peserta belum bisa check-in.
              </li>
              <li>
                <strong>Buka Presensi s.d. Jam Masuk + Toleransi:</strong> Check-in tercatat{' '}
                <strong>Hadir</strong> (tepat waktu).
              </li>
              <li>
                <strong>Lewat Toleransi s.d. Jam Pulang:</strong> Check-in tetap diterima
                dengan status <strong>Terlambat</strong>.
              </li>
              <li>
                <strong>Check-out:</strong> Hanya bisa dilakukan setelah check-in hingga
                Batas Akhir Check-out.
              </li>
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}
