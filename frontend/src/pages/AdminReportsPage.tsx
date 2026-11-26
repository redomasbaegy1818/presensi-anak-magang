import { useState } from 'react';
import {
  Button,
  DataTable,
  Input,
  Select,
  type TableColumn,
} from '../components/ui/index.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';

interface ReportPreviewRow {
  id: string;
  participantName: string;
  division: string;
  presentCount: number;
  lateCount: number;
  absentCount: number;
}

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'participant', label: 'Per Peserta' },
];

const COLUMNS: TableColumn<ReportPreviewRow>[] = [
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
    key: 'presentCount',
    header: 'Hadir',
    align: 'right',
    render: (row) => <span className="tabular-nums">{row.presentCount}</span>,
  },
  {
    key: 'lateCount',
    header: 'Terlambat',
    align: 'right',
    render: (row) => <span className="tabular-nums">{row.lateCount}</span>,
  },
  {
    key: 'absentCount',
    header: 'Tidak Hadir',
    align: 'right',
    render: (row) => <span className="tabular-nums">{row.absentCount}</span>,
  },
];

export default function AdminReportsPage() {
  usePageTitle('Laporan Kehadiran');
  const [period, setPeriod] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const rows: ReportPreviewRow[] = [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Laporan Kehadiran
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Susun rekapitulasi harian, mingguan, bulanan, atau per peserta dan ekspor ke Excel/PDF.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={rows.length === 0}>
            Ekspor Excel
          </Button>
          <Button variant="secondary" size="sm" disabled={rows.length === 0}>
            Ekspor PDF
          </Button>
        </div>
      </div>

      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Jenis Laporan"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={PERIOD_OPTIONS}
          />
          <Input
            label="Tanggal Mulai"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Tanggal Akhir"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </section>

      <DataTable
        caption="Pratinjau rekapitulasi laporan kehadiran"
        columns={COLUMNS}
        rows={rows}
        getRowKey={(row) => row.id}
        emptyTitle="Belum ada data laporan"
        emptyDescription="Rekap laporan dan ekspor Excel/PDF akan tersedia setelah data presensi terhubung."
      />
    </div>
  );
}
