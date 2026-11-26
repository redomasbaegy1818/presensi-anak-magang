import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  ErrorState,
  LoadingState,
  type TableColumn,
} from '../components/ui/index.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { ApiError } from '../services/apiClient.ts';
import { getAdminOverview } from '../services/authService.ts';
import { getSystemHealth } from '../services/healthService.ts';
import type {
  AdminOverviewResponse,
  ApiHealthStatus,
  AttendanceRecordItem,
} from '../types/domain.ts';
import {
  formatAttendanceStatus,
  formatTanggalId,
  formatWaktuWib,
} from '../utils/formatDate.ts';

const RECENT_COLUMNS: TableColumn<AttendanceRecordItem>[] = [
  {
    key: 'participantName',
    header: 'Nama Peserta',
    isRowHeader: true,
    render: (row) => (
      <Link
        to={`/admin/peserta/${row.participantId}`}
        className="font-medium text-[var(--color-accent-text)] hover:underline"
      >
        {row.participantName}
      </Link>
    ),
  },
  {
    key: 'nimNis',
    header: 'NIM / NIS',
    render: (row) => <span className="tabular-nums">{row.nimNis}</span>,
  },
  {
    key: 'division',
    header: 'Divisi',
    render: (row) => row.division,
  },
  {
    key: 'checkInAt',
    header: 'Masuk',
    render: (row) => (
      <span className="tabular-nums">{formatWaktuWib(row.checkInAt)}</span>
    ),
  },
  {
    key: 'checkOutAt',
    header: 'Pulang',
    render: (row) => (
      <span className="tabular-nums">{formatWaktuWib(row.checkOutAt)}</span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <div className="flex items-center gap-1.5">
        <Badge
          tone={
            row.status === 'PRESENT'
              ? 'success'
              : row.status === 'LATE'
                ? 'warning'
                : 'danger'
          }
        >
          {formatAttendanceStatus(row.status)}
        </Badge>
        {row.isCorrected && <Badge tone="accent">Dikoreksi</Badge>}
      </div>
    ),
  },
];

export default function AdminDashboardPage() {
  usePageTitle('Ringkasan Hari Ini');
  const navigate = useNavigate();
  const { clearAuthenticatedUser } = useAuth();

  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [health, setHealth] = useState<ApiHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const [overviewData, healthData] = await Promise.all([
        getAdminOverview(),
        getSystemHealth().catch(() => null),
      ]);
      setOverview(overviewData);
      setHealth(healthData);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuthenticatedUser();
        navigate('/admin/masuk', {
          replace: true,
          state: { authNotice: 'expired' },
        });
        return;
      }

      if (error instanceof ApiError) {
        setLoadError(error.message);
      } else {
        setLoadError(
          'Tidak dapat terhubung ke server untuk memuat ringkasan dashboard.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [clearAuthenticatedUser, navigate]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-6">
        <LoadingState label="Memuat ringkasan kehadiran hari ini..." />
      </div>
    );
  }

  if (loadError || !overview) {
    return (
      <ErrorState
        title="Gagal memuat ringkasan"
        description={loadError ?? 'Ringkasan dashboard belum tersedia.'}
        action={
          <Button size="sm" variant="secondary" onClick={() => void loadDashboard()}>
            Muat Ulang
          </Button>
        }
      />
    );
  }

  const { summary, rules } = overview;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Ringkasan Kehadiran — {formatTanggalId(overview.attendanceDate)}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Aturan aktif: Masuk {rules.workStartTime} WIB (toleransi{' '}
            {rules.lateToleranceMinutes} menit) · Pulang {rules.workEndTime} WIB.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadDashboard()}
          >
            Muat Ulang
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/peserta')}
          >
            Kelola Peserta
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/admin/presensi')}
          >
            Data Presensi
          </Button>
        </div>
      </div>

      {health && health.faceService !== 'connected' && (
        <Alert tone="warning" title="Layanan Verifikasi Wajah Belum Terhubung">
          Backend aktif, tetapi layanan pemeriksaan wajah saat ini berstatus
          tidak terjangkau. Pastikan layanan face-service berjalan sebelum jam
          presensi dimulai.
        </Alert>
      )}

      <section
        aria-label="Ringkasan Kehadiran Hari Ini"
        className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-border)]"
      >
        <div className="p-4">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            Peserta Aktif
          </p>
          <p className="text-2xl font-semibold tabular-nums text-[var(--color-text-primary)] mt-1">
            {summary.activeParticipants}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Total peserta berstatus aktif
          </p>
        </div>

        <div className="p-4">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            Sudah Presensi Hari Ini
          </p>
          <p className="text-2xl font-semibold tabular-nums text-[var(--color-success)] mt-1">
            {summary.attendedToday}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 tabular-nums">
            {summary.presentToday} tepat waktu · {summary.checkedOutToday} sudah pulang
          </p>
        </div>

        <div className="p-4">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            Terlambat
          </p>
          <p className="text-2xl font-semibold tabular-nums text-[var(--color-warning)] mt-1">
            {summary.lateToday}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Melewati batas toleransi masuk
          </p>
        </div>

        <div className="p-4">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            Belum Presensi
          </p>
          <p className="text-2xl font-semibold tabular-nums text-[var(--color-text-primary)] mt-1">
            {summary.notCheckedInToday}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Peserta aktif belum check-in
          </p>
        </div>
      </section>

      <section className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Presensi Terbaru Hari Ini
          </h2>
          <Link
            to="/admin/presensi"
            className="text-xs font-medium text-[var(--color-accent-text)] hover:underline"
          >
            Lihat Semua Data Presensi
          </Link>
        </div>

        <DataTable
          caption="Daftar presensi terbaru hari ini"
          columns={RECENT_COLUMNS}
          rows={overview.recentAttendance}
          getRowKey={(row) => row.id}
          emptyTitle="Belum ada presensi hari ini"
          emptyDescription="Catatan peserta yang melakukan check-in atau check-out hari ini akan tampil di sini."
        />
      </section>
    </div>
  );
}
