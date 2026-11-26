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
  formatWaktuWib,
} from '../utils/formatDate.ts';

const RECENT_COLUMNS: TableColumn<AttendanceRecordItem>[] = [
  {
    key: 'participantName',
    header: 'Nama Peserta',
    isRowHeader: true,
    render: (row) => row.participantName,
  },
  {
    key: 'division',
    header: 'Divisi',
    render: (row) => row.division,
  },
  {
    key: 'checkInAt',
    header: 'Jam Masuk',
    render: (row) => (
      <span className="tabular-nums">{formatWaktuWib(row.checkInAt)}</span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <Badge tone={row.status === 'PRESENT' ? 'success' : 'warning'}>
        {formatAttendanceStatus(row.status)}
      </Badge>
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

  const summaryItems = [
    {
      label: 'Peserta Aktif',
      value: overview ? String(overview.summary.activeParticipants) : '—',
    },
    {
      label: 'Hadir Hari Ini',
      value: overview ? String(overview.summary.presentToday) : '—',
    },
    {
      label: 'Terlambat',
      value: overview ? String(overview.summary.lateToday) : '—',
    },
    {
      label: 'Belum Presensi',
      value: overview ? String(overview.summary.notCheckedInToday) : '—',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Ringkasan Kehadiran Hari Ini
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Pantauan cepat kehadiran peserta magang berdasarkan zona waktu WIB.
          </p>
        </div>

        <Link
          to="/admin/presensi"
          className="text-sm font-medium text-[var(--color-accent-text)] hover:underline"
        >
          Lihat Semua Presensi
        </Link>
      </div>

      {loading ? (
        <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-6">
          <LoadingState label="Memuat ringkasan admin..." />
        </div>
      ) : loadError ? (
        <ErrorState
          title="Gagal memuat ringkasan"
          description={loadError}
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void loadDashboard()}
            >
              Muat Ulang
            </Button>
          }
        />
      ) : (
        <>
          <section
            aria-label="Ringkasan Angka Hari Ini"
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4"
              >
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {item.label}
                </p>
                <p className="text-2xl font-semibold tabular-nums text-[var(--color-text-primary)] mt-1">
                  {item.value}
                </p>
              </div>
            ))}
          </section>

          {health && (
            <Alert tone="info" title="Status Layanan">
              Backend aktif ({health.timezone}) · Database: {health.database} · Face
              Service: {health.faceService}.
            </Alert>
          )}
        </>
      )}

      <section className="space-y-2.5">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          Presensi Terbaru Hari Ini
        </h2>
        <DataTable
          caption="Daftar presensi terbaru hari ini"
          columns={RECENT_COLUMNS}
          rows={[]}
          getRowKey={(row) => row.id}
          emptyTitle="Belum ada presensi hari ini"
          emptyDescription="Daftar presensi peserta akan tampil di sini setelah modul presensi harian diimplementasikan."
        />
      </section>
    </div>
  );
}
