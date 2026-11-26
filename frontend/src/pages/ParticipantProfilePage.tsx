import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  ErrorState,
  LoadingState,
} from '../components/ui/index.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { ApiError } from '../services/apiClient.ts';
import { getParticipantProfile } from '../services/authService.ts';
import type { ParticipantProfile } from '../types/domain.ts';
import {
  formatParticipantStatus,
  formatTanggalId,
} from '../utils/formatDate.ts';

export default function ParticipantProfilePage() {
  usePageTitle('Profil Peserta');
  const navigate = useNavigate();
  const { clearAuthenticatedUser } = useAuth();

  const [profile, setProfile] = useState<ParticipantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await getParticipantProfile();
      setProfile(res.profile);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuthenticatedUser();
        navigate('/masuk', {
          replace: true,
          state: { authNotice: 'unauthorized' },
        });
        return;
      }
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Gagal memuat profil peserta dari server.',
      );
    } finally {
      setLoading(false);
    }
  }, [clearAuthenticatedUser, navigate]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-6">
        <LoadingState label="Memuat profil peserta..." />
      </div>
    );
  }

  if (errorMessage || !profile) {
    return (
      <ErrorState
        title="Gagal memuat profil"
        description={errorMessage ?? 'Data profil peserta tidak ditemukan.'}
        action={
          <Button size="sm" variant="secondary" onClick={() => void loadProfile()}>
            Muat Ulang
          </Button>
        }
      />
    );
  }

  const profileFields: { label: string; value: string }[] = [
    { label: 'Nama Lengkap', value: profile.fullName },
    { label: 'NIM / NIS', value: profile.nimNis },
    { label: 'Universitas / Sekolah', value: profile.universitySchool },
    { label: 'Jurusan', value: profile.major },
    { label: 'Divisi', value: profile.division },
    { label: 'Nomor HP', value: profile.phone },
    { label: 'Email', value: profile.email },
    {
      label: 'Tanggal Mulai Magang',
      value: formatTanggalId(profile.internshipStartDate),
    },
    {
      label: 'Tanggal Selesai Magang',
      value: formatTanggalId(profile.internshipEndDate),
    },
  ];

  return (
    <div className="space-y-4">
      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-bg-subtle)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Informasi Dasar Peserta
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Data identitas dan periode magang yang terdaftar di sistem.
            </p>
          </div>
          <Badge tone={profile.status === 'ACTIVE' ? 'success' : 'danger'}>
            {formatParticipantStatus(profile.status)}
          </Badge>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {profileFields.map((field) => (
            <div key={field.label}>
              <dt className="text-xs text-[var(--color-text-muted)]">{field.label}</dt>
              <dd className="font-medium text-[var(--color-text-primary)] mt-0.5">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Status Pendaftaran Wajah
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {profile.faceRegistered
              ? `Wajah terdaftar pada ${formatTanggalId(profile.faceRegisteredAt)}.`
              : 'Belum ada data wajah terdaftar. Presensi belum dapat digunakan sebelum pendaftaran wajah selesai.'}
          </p>
        </div>
        <Button
          variant={profile.faceRegistered ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => navigate('/peserta/daftar-wajah')}
        >
          {profile.faceRegistered ? 'Perbarui Data Wajah' : 'Daftarkan Wajah'}
        </Button>
      </section>
    </div>
  );
}
