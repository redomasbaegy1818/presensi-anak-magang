import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Badge,
  DataTable,
  type TableColumn,
} from '../components/ui/index.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { getSystemHealth } from '../services/healthService.ts';
import type { ApiHealthStatus, AttendanceRecordItem } from '../types/domain.ts';
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

const SUMMARY_ITEMS = [
  { label: 'Peserta Aktif', value: '—' },
  { label: 'Hadir Hari Ini', value: '—' },
  { label: 'Terlambat', value: '—' },
  { label: 'Belum Presensi', value: '—' },
];

export default function AdminDashboardPage() {
  usePageTitle('Ringkasan Hari Ini');
  const [health, setHealth] = useState<ApiHealthStatus | null>(null);
  const [healthError, setHealthError] = useState(false);

  useEffect(() => {
    let active = true;
    getSystemHealth()
      .then((res) => {
        if (active) {
          setHealth(res);
          setHealthError(false);
        }
      })
      .catch(() => {
        if (active) setHealthError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const recentRows: AttendanceRecordItem[] = [];

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

      <section
        aria-label="Ringkasan Angka Hari Ini"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {SUMMARY_ITEMS.map((item) => (
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

      {healthError ? (
        <Alert tone="warning" title="Status Backend">
          Server API backend belum berjalan atau tidak terjangkau di /api/v1/health.
        </Alert>
      ) : (
        health && (
          <Alert tone="info" title="Koneksi Layanan">
            Backend aktif ({health.timezone}) · Database: {health.database} · Face
            Service: {health.faceService}.
          </Alert>
        )
      )}

      <section className="space-y-2.5">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          Presensi Terbaru Hari Ini
        </h2>
        <DataTable
          caption="Daftar presensi terbaru hari ini"
          columns={RECENT_COLUMNS}
          rows={recentRows}
          getRowKey={(row) => row.id}
          emptyTitle="Belum ada presensi hari ini"
          emptyDescription="Daftar presensi peserta akan tampil di sini setelah API presensi terhubung."
        />
      </section>
    </div>
  );
}
