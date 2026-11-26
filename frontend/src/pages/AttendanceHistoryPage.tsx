import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  DataTable,
  ErrorState,
  Input,
  type TableColumn,
} from '../components/ui/index.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { ApiError } from '../services/apiClient.ts';
import { getParticipantAttendanceHistory } from '../services/attendanceService.ts';
import type { AttendanceRecordItem } from '../types/domain.ts';
import {
  formatAttendanceStatus,
  formatTanggalId,
  formatWaktuWib,
} from '../utils/formatDate.ts';

const COLUMNS: TableColumn<AttendanceRecordItem>[] = [
  {
    key: 'date',
    header: 'Tanggal',
    isRowHeader: true,
    render: (row) => (
      <span className="tabular-nums">{formatTanggalId(row.attendanceDate)}</span>
    ),
  },
  {
    key: 'checkIn',
    header: 'Masuk',
    render: (row) => (
      <span className="tabular-nums">{formatWaktuWib(row.checkInAt)}</span>
    ),
  },
  {
    key: 'checkOut',
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

export default function AttendanceHistoryPage() {
  usePageTitle('Riwayat Presensi');
  const navigate = useNavigate();
  const { clearAuthenticatedUser } = useAuth();

  const [monthFilter, setMonthFilter] = useState('');
  const [rows, setRows] = useState<AttendanceRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await getParticipantAttendanceHistory(monthFilter || undefined);
      setRows(res.records);
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
          : 'Gagal memuat riwayat presensi dari server.',
      );
    } finally {
      setLoading(false);
    }
  }, [monthFilter, clearAuthenticatedUser, navigate]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <div className="space-y-4">
      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="max-w-xs w-full">
          <Input
            label="Filter Bulan"
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          />
        </div>
        {monthFilter && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setMonthFilter('')}
          >
            Tampilkan Semua
          </Button>
        )}
      </section>

      {errorMessage ? (
        <ErrorState
          title="Gagal memuat riwayat"
          description={errorMessage}
          action={
            <Button size="sm" variant="secondary" onClick={() => void loadHistory()}>
              Muat Ulang
            </Button>
          }
        />
      ) : (
        <DataTable
          caption="Riwayat presensi peserta magang"
          columns={COLUMNS}
          rows={rows}
          loading={loading}
          getRowKey={(row) => row.id}
          emptyTitle="Belum ada riwayat presensi"
          emptyDescription={
            monthFilter
              ? 'Tidak ada catatan presensi pada bulan yang dipilih.'
              : 'Catatan presensi masuk dan pulang Anda akan tampil di sini setelah presensi dilakukan.'
          }
        />
      )}
    </div>
  );
}
