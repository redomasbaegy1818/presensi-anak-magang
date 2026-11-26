import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  DataTable,
  Input,
  Select,
  type TableColumn,
} from '../components/ui/index.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import type { ParticipantProfile } from '../types/domain.ts';
import { formatParticipantStatus } from '../utils/formatDate.ts';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'INACTIVE', label: 'Nonaktif' },
];

const COLUMNS: TableColumn<ParticipantProfile>[] = [
  {
    key: 'fullName',
    header: 'Nama Lengkap',
    isRowHeader: true,
    render: (row) => (
      <Link
        to={`/admin/peserta/${row.id}`}
        className="font-medium text-[var(--color-accent-text)] hover:underline"
      >
        {row.fullName}
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
    key: 'faceRegistered',
    header: 'Data Wajah',
    render: (row) => (
      <Badge tone={row.faceRegistered ? 'success' : 'neutral'}>
        {row.faceRegistered ? 'Terdaftar' : 'Belum'}
      </Badge>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <Badge tone={row.status === 'ACTIVE' ? 'success' : 'danger'}>
        {formatParticipantStatus(row.status)}
      </Badge>
    ),
  },
];

export default function AdminParticipantsPage() {
  usePageTitle('Peserta Magang');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const rows: ParticipantProfile[] = [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Daftar Peserta Magang
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Kelola identitas, divisi penempatan, dan status aktif peserta.
          </p>
        </div>

        <Link
          to="/admin/peserta/contoh"
          className="text-sm font-medium text-[var(--color-accent-text)] hover:underline"
        >
          Pratinjau Struktur Detail Peserta
        </Link>
      </div>

      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Cari Peserta"
              placeholder="Nama, NIM/NIS, atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            label="Status Kepesertaan"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_OPTIONS}
          />
        </div>
      </section>

      <DataTable
        caption="Daftar seluruh peserta magang"
        columns={COLUMNS}
        rows={rows}
        getRowKey={(row) => row.id}
        emptyTitle="Belum ada data peserta magang"
        emptyDescription="Data peserta akan muncul di sini setelah endpoint manajemen peserta dan database terhubung."
      />
    </div>
  );
}
