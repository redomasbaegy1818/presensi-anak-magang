import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  EmptyState,
  LoadingState,
  SuccessState,
} from '../components/ui/index.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { getTodayAttendance } from '../services/attendanceService.ts';
import type { AttendanceConfirmationData } from '../types/domain.ts';
import {
  formatAttendanceStatus,
  formatTanggalId,
  formatWaktuWib,
} from '../utils/formatDate.ts';

interface ResultLocationState {
  attendance?: AttendanceConfirmationData;
}

export default function AttendanceResultPage() {
  usePageTitle('Hasil Presensi');
  const navigate = useNavigate();
  const location = useLocation();
  const stateData = (location.state as ResultLocationState | null)?.attendance;

  const [confirmation, setConfirmation] =
    useState<AttendanceConfirmationData | null>(stateData ?? null);
  const [loading, setLoading] = useState(!stateData);

  useEffect(() => {
    if (stateData) return;

    let active = true;
    getTodayAttendance()
      .then((today) => {
        if (!active || !today.todayRecord) return;
        const rec = today.todayRecord;
        const isCheckOut = Boolean(rec.checkOutAt);
        const recordedAt = rec.checkOutAt ?? rec.checkInAt;
        if (!recordedAt) return;

        setConfirmation({
          id: rec.id,
          participantName: rec.participantName,
          attendanceType: isCheckOut ? 'CHECK_OUT' : 'CHECK_IN',
          attendanceDate: rec.attendanceDate,
          recordedAt,
          checkInAt: rec.checkInAt,
          checkOutAt: rec.checkOutAt,
          status: rec.status,
          confirmationMessage: isCheckOut
            ? 'Presensi pulang Anda telah tercatat.'
            : 'Presensi masuk Anda telah tercatat.',
        });
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [stateData]);

  if (loading) {
    return (
      <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-6">
        <LoadingState label="Memuat hasil presensi..." />
      </div>
    );
  }

  if (!confirmation) {
    return (
      <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-5">
        <EmptyState
          title="Belum ada hasil presensi hari ini"
          description="Silakan lakukan presensi masuk atau pulang melalui halaman presensi."
          action={
            <Button onClick={() => navigate('/peserta/presensi')}>
              Ke Halaman Presensi
            </Button>
          }
        />
      </div>
    );
  }

  const typeLabel =
    confirmation.attendanceType === 'CHECK_IN'
      ? 'Presensi Masuk'
      : 'Presensi Pulang';

  return (
    <div className="space-y-4">
      <SuccessState
        title={`${typeLabel} Berhasil`}
        description={confirmation.confirmationMessage}
      />

      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4 sm:p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Bukti Pencatatan Kehadiran
        </h2>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-[var(--color-text-muted)]">Nama Peserta</dt>
            <dd className="font-medium text-[var(--color-text-primary)] mt-0.5">
              {confirmation.participantName}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-text-muted)]">Jenis Presensi</dt>
            <dd className="font-medium text-[var(--color-text-primary)] mt-0.5">
              {typeLabel}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-text-muted)]">Tanggal &amp; Waktu</dt>
            <dd className="font-medium tabular-nums text-[var(--color-text-primary)] mt-0.5">
              {formatTanggalId(confirmation.attendanceDate)} ·{' '}
              {formatWaktuWib(confirmation.recordedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-text-muted)]">Status Kehadiran</dt>
            <dd className="mt-0.5">
              <Badge tone={confirmation.status === 'PRESENT' ? 'success' : 'warning'}>
                {formatAttendanceStatus(confirmation.status)}
              </Badge>
            </dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => navigate('/peserta/riwayat')}
        >
          Lihat Riwayat Presensi
        </Button>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => navigate('/peserta/presensi')}
        >
          Kembali ke Halaman Presensi
        </Button>
      </div>
    </div>
  );
}
