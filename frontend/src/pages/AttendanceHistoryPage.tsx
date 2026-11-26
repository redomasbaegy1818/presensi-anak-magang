import { useState } from 'react';
import {
  Badge,
  DataTable,
  Input,
  type TableColumn,
} from '../components/ui/index.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
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
      <Badge tone={row.status === 'PRESENT' ? 'success' : 'warning'}>
        {formatAttendanceStatus(row.status)}
      </Badge>
    ),
  },
];

export default function AttendanceHistoryPage() {
  usePageTitle('Riwayat Presensi');
  const [monthFilter, setMonthFilter] = useState('');
  const rows: AttendanceRecordItem[] = [];

  return (
    <div className="space-y-4">
      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4">
        <div className="max-w-xs">
          <Input
            label="Filter Bulan"
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          />
        </div>
      </section>

      <DataTable
        caption="Riwayat presensi peserta magang"
        columns={COLUMNS}
        rows={rows}
        getRowKey={(row) => row.id}
        emptyTitle="Belum ada riwayat presensi"
        emptyDescription="Catatan presensi masuk dan pulang Anda akan muncul di sini setelah terhubung ke server."
      />
    </div>
  );
}
