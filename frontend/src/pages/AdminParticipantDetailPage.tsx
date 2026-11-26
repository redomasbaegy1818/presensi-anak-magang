import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  DataTable,
  Modal,
  type TableColumn,
} from '../components/ui/index.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import type { AttendanceRecordItem } from '../types/domain.ts';
import {
  formatAttendanceStatus,
  formatTanggalId,
  formatWaktuWib,
} from '../utils/formatDate.ts';

const HISTORY_COLUMNS: TableColumn<AttendanceRecordItem>[] = [
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

const DETAIL_FIELDS = [
  'Nama Lengkap',
  'NIM / NIS',
  'Universitas / Sekolah',
  'Jurusan',
  'Divisi',
  'Nomor HP',
  'Email',
  'Tanggal Mulai Magang',
  'Tanggal Selesai Magang',
];

export default function AdminParticipantDetailPage() {
  usePageTitle('Detail Peserta Magang');
  const { id } = useParams<{ id: string }>();
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link
            to="/admin/peserta"
            className="text-xs font-medium text-[var(--color-text-secondary)] hover:underline"
          >
            ← Kembali ke Daftar Peserta
          </Link>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mt-1">
            Detail Peserta ({id ?? '—'})
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setStatusModalOpen(true)}
          >
            Ubah Status Peserta
          </Button>
        </div>
      </div>

      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-bg-subtle)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Biodata &amp; Masa Magang
          </h2>
          <div className="flex items-center gap-2">
            <Badge tone="neutral">Status: Menunggu Data</Badge>
            <Badge tone="neutral">Wajah: Belum Terdaftar</Badge>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {DETAIL_FIELDS.map((label) => (
            <div key={label}>
              <dt className="text-xs text-[var(--color-text-muted)]">{label}</dt>
              <dd className="font-medium text-[var(--color-text-primary)] mt-0.5">
                —
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-2.5">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          Riwayat Presensi Peserta
        </h2>
        <DataTable
          caption="Riwayat presensi peserta terkait"
          columns={HISTORY_COLUMNS}
          rows={[]}
          getRowKey={(row) => row.id}
          emptyTitle="Belum ada catatan presensi"
          emptyDescription="Riwayat kehadiran peserta ini akan tampil setelah terhubung ke database."
        />
      </section>

      <Modal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Konfirmasi Perubahan Status"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={() => setStatusModalOpen(false)}>
              Simpan Status
            </Button>
          </>
        }
      >
        <p>
          Struktur dialog untuk mengaktifkan atau menonaktifkan akun peserta magang.
          Logika pembaruan status akan diaktifkan pada fase backend peserta.
        </p>
      </Modal>
    </div>
  );
}
