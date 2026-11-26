import { useState } from 'react';
import {
  Badge,
  Button,
  DataTable,
  Input,
  Modal,
  Select,
  Textarea,
  type TableColumn,
} from '../components/ui/index.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import type { AttendanceRecordItem } from '../types/domain.ts';
import {
  formatAttendanceStatus,
  formatTanggalId,
  formatWaktuWib,
} from '../utils/formatDate.ts';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'PRESENT', label: 'Hadir' },
  { value: 'LATE', label: 'Terlambat' },
  { value: 'ABSENT', label: 'Tidak Hadir' },
];

const CORRECTION_STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Hadir' },
  { value: 'LATE', label: 'Terlambat' },
  { value: 'ABSENT', label: 'Tidak Hadir' },
];

const COLUMNS: TableColumn<AttendanceRecordItem>[] = [
  {
    key: 'participantName',
    header: 'Peserta',
    isRowHeader: true,
    render: (row) => row.participantName,
  },
  {
    key: 'date',
    header: 'Tanggal',
    render: (row) => (
      <span className="tabular-nums">{formatTanggalId(row.attendanceDate)}</span>
    ),
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
      <Badge tone={row.status === 'PRESENT' ? 'success' : 'warning'}>
        {formatAttendanceStatus(row.status)}
      </Badge>
    ),
  },
];

export default function AdminAttendancePage() {
  usePageTitle('Data Presensi');
  const [dateFilter, setDateFilter] = useState('');
  const [participantQuery, setParticipantQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionStatus, setCorrectionStatus] = useState('PRESENT');
  const [correctionReason, setCorrectionReason] = useState('');

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Data Presensi Peserta
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Saring data check-in, check-out, dan lakukan koreksi berotorisasi bila diperlukan.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setCorrectionOpen(true)}
        >
          Pratinjau Modal Koreksi
        </Button>
      </div>

      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Tanggal"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <Input
            label="Nama / NIM Peserta"
            placeholder="Cari peserta..."
            value={participantQuery}
            onChange={(e) => setParticipantQuery(e.target.value)}
          />
          <Select
            label="Status Kehadiran"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>
      </section>

      <DataTable
        caption="Data presensi harian peserta magang"
        columns={COLUMNS}
        rows={[]}
        getRowKey={(row) => row.id}
        emptyTitle="Belum ada data presensi"
        emptyDescription="Data presensi harian akan tampil di sini setelah modul presensi terhubung."
      />

      <Modal
        open={correctionOpen}
        onClose={() => setCorrectionOpen(false)}
        title="Koreksi Catatan Presensi"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCorrectionOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={() => setCorrectionOpen(false)}>
              Simpan Koreksi
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Status Kehadiran Baru"
            value={correctionStatus}
            onChange={(e) => setCorrectionStatus(e.target.value)}
            options={CORRECTION_STATUS_OPTIONS}
          />
          <Textarea
            label="Alasan Koreksi"
            required
            placeholder="Tuliskan alasan perubahan data secara jelas untuk jejak audit..."
            value={correctionReason}
            onChange={(e) => setCorrectionReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
