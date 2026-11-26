import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Select,
  type TableColumn,
} from '../components/ui/index.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import {
  downloadAdminReportFile,
  getAdminReports,
} from '../services/adminService.ts';
import { ApiError } from '../services/apiClient.ts';
import type {
  AdminAttendanceReportResponse,
  AttendanceStatus,
  ReportDetailRow,
  ReportExportFormat,
  ReportGroupedRow,
  ReportType,
} from '../types/domain.ts';
import {
  formatAttendanceStatus,
  formatDateTimeWib,
  formatTanggalId,
  formatWaktuWib,
} from '../utils/formatDate.ts';

const REPORT_TYPE_OPTIONS = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'participant', label: 'Per Peserta' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'PRESENT', label: 'Hadir' },
  { value: 'LATE', label: 'Terlambat' },
  { value: 'ABSENT', label: 'Tidak Hadir' },
];

const DETAIL_PAGE_LIMIT = 20;

function getTodayWibDateStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getDefaultDatesForType(type: ReportType): {
  startDate: string;
  endDate: string;
} {
  const today = getTodayWibDateStr();
  if (type === 'daily') {
    return { startDate: today, endDate: today };
  }
  if (type === 'weekly') {
    const base = new Date(`${today}T00:00:00.000Z`);
    const day = base.getUTCDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    base.setUTCDate(base.getUTCDate() + diffToMon);
    const startDate = base.toISOString().slice(0, 10);
    base.setUTCDate(base.getUTCDate() + 6);
    const endDate = base.toISOString().slice(0, 10);
    return { startDate, endDate };
  }
  if (type === 'monthly') {
    const startDate = `${today.slice(0, 7)}-01`;
    const [yStr, mStr] = today.split('-');
    const lastDay = new Date(Date.UTC(Number(yStr), Number(mStr), 0));
    return { startDate, endDate: lastDay.toISOString().slice(0, 10) };
  }
  return { startDate: `${today.slice(0, 7)}-01`, endDate: today };
}

function getAttendanceStatusBadgeVariant(
  status: AttendanceStatus,
): 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'PRESENT':
      return 'success';
    case 'LATE':
      return 'warning';
    case 'ABSENT':
      return 'danger';
  }
}

export default function AdminReportsPage() {
  usePageTitle('Laporan Kehadiran');
  const navigate = useNavigate();
  const { clearAuthenticatedUser } = useAuth();

  const initialDates = useMemo(() => getDefaultDatesForType('monthly'), []);
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [startDate, setStartDate] = useState(initialDates.startDate);
  const [endDate, setEndDate] = useState(initialDates.endDate);
  const [division, setDivision] = useState('ALL');
  const [participantId, setParticipantId] = useState('ALL');
  const [status, setStatus] = useState<'ALL' | AttendanceStatus>('ALL');
  const [datesEditedManually, setDatesEditedManually] = useState(false);

  const [report, setReport] = useState<AdminAttendanceReportResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] =
    useState<ReportExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [detailPage, setDetailPage] = useState(1);

  const handleUnauthorized = useCallback(() => {
    clearAuthenticatedUser();
    navigate('/admin/masuk', {
      replace: true,
      state: { authNotice: 'expired' },
    });
  }, [clearAuthenticatedUser, navigate]);

  const invalidRangeMessage =
    startDate && endDate && endDate < startDate
      ? 'Tanggal akhir tidak boleh lebih awal dari tanggal mulai.'
      : null;

  const loadReport = useCallback(async () => {
    if (invalidRangeMessage) {
      setLoadError(invalidRangeMessage);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const data = await getAdminReports({
        reportType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        division,
        participantId,
        status,
      });
      setReport(data);
      setDetailPage(1);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized();
        return;
      }
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Gagal memuat laporan kehadiran.',
      );
    } finally {
      setLoading(false);
    }
  }, [
    division,
    endDate,
    handleUnauthorized,
    invalidRangeMessage,
    participantId,
    reportType,
    startDate,
    status,
  ]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleReportTypeChange = (nextType: ReportType) => {
    setReportType(nextType);
    if (!datesEditedManually) {
      const nextDates = getDefaultDatesForType(nextType);
      setStartDate(nextDates.startDate);
      setEndDate(nextDates.endDate);
    }
  };

  const handleDivisionChange = (nextDivision: string) => {
    setDivision(nextDivision);
    if (nextDivision !== 'ALL' && report) {
      const stillMatches = report.filterOptions.participants.some(
        (p) => p.id === participantId && p.division === nextDivision,
      );
      if (!stillMatches) {
        setParticipantId('ALL');
      }
    }
  };

  const handleResetFilters = () => {
    const defaults = getDefaultDatesForType('monthly');
    setReportType('monthly');
    setStartDate(defaults.startDate);
    setEndDate(defaults.endDate);
    setDatesEditedManually(false);
    setDivision('ALL');
    setParticipantId('ALL');
    setStatus('ALL');
    setExportError(null);
  };

  const handleExport = async (format: ReportExportFormat) => {
    if (invalidRangeMessage || loading || exportingFormat) return;
    setExportingFormat(format);
    setExportError(null);
    try {
      const { blob, filename } = await downloadAdminReportFile(
        {
          reportType,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          division,
          participantId,
          status,
        },
        format,
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized();
        return;
      }
      setExportError(
        error instanceof Error
          ? error.message
          : 'Gagal mengekspor laporan. Silakan coba lagi.',
      );
    } finally {
      setExportingFormat(null);
    }
  };

  const divisionOptions = useMemo(() => {
    const items = report?.filterOptions.divisions ?? [];
    return [
      { value: 'ALL', label: 'Semua Divisi' },
      ...items.map((div) => ({ value: div, label: div })),
    ];
  }, [report?.filterOptions.divisions]);

  const participantOptions = useMemo(() => {
    const participants = report?.filterOptions.participants ?? [];
    const scoped =
      division === 'ALL'
        ? participants
        : participants.filter((p) => p.division === division);
    return [
      { value: 'ALL', label: 'Semua Peserta' },
      ...scoped.map((p) => ({
        value: p.id,
        label: `${p.fullName} (${p.nimNis})`,
      })),
    ];
  }, [division, report?.filterOptions.participants]);

  const groupedColumns: TableColumn<ReportGroupedRow>[] = useMemo(
    () => [
      {
        key: 'label',
        header: reportType === 'participant' ? 'Nama Peserta' : 'Periode',
        isRowHeader: true,
        render: (row) => (
          <div>
            <p className="font-medium text-[var(--color-text-primary)]">
              {row.label}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {row.secondaryLabel}
            </p>
          </div>
        ),
      },
      {
        key: 'presentCount',
        header: 'Hadir',
        align: 'right',
        render: (row) => (
          <span className="tabular-nums text-[var(--color-text-primary)]">
            {row.presentCount}
          </span>
        ),
      },
      {
        key: 'lateCount',
        header: 'Terlambat',
        align: 'right',
        render: (row) => (
          <span className="tabular-nums text-[var(--color-text-primary)]">
            {row.lateCount}
          </span>
        ),
      },
      {
        key: 'absentCount',
        header: 'Tidak Hadir',
        align: 'right',
        render: (row) => (
          <span className="tabular-nums text-[var(--color-text-secondary)]">
            {row.absentCount}
          </span>
        ),
      },
      {
        key: 'totalAttendance',
        header: 'Total Hadir',
        align: 'right',
        render: (row) => (
          <span className="font-medium tabular-nums text-[var(--color-text-primary)]">
            {row.totalAttendance}
          </span>
        ),
      },
      {
        key: 'attendancePercentage',
        header: 'Persentase',
        align: 'right',
        render: (row) => (
          <span className="font-medium tabular-nums text-[var(--color-text-primary)]">
            {row.attendancePercentage}%
          </span>
        ),
      },
    ],
    [reportType],
  );

  const detailColumns: TableColumn<ReportDetailRow>[] = useMemo(
    () => [
      {
        key: 'attendanceDate',
        header: 'Tanggal',
        render: (row) => (
          <span className="whitespace-nowrap text-[var(--color-text-primary)]">
            {formatTanggalId(`${row.attendanceDate}T00:00:00.000Z`)}
          </span>
        ),
      },
      {
        key: 'participantName',
        header: 'Peserta',
        isRowHeader: true,
        render: (row) => (
          <div>
            <p className="font-medium text-[var(--color-text-primary)]">
              {row.participantName}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {row.nimNis}
            </p>
          </div>
        ),
      },
      {
        key: 'division',
        header: 'Divisi',
        render: (row) => (
          <span className="text-[var(--color-text-secondary)]">
            {row.division}
          </span>
        ),
      },
      {
        key: 'checkInAt',
        header: 'Jam Masuk',
        render: (row) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatWaktuWib(row.checkInAt)}
          </span>
        ),
      },
      {
        key: 'checkOutAt',
        header: 'Jam Pulang',
        render: (row) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatWaktuWib(row.checkOutAt)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge tone={getAttendanceStatusBadgeVariant(row.status)}>
              {formatAttendanceStatus(row.status)}
            </Badge>
            {row.isCorrected && (
              <span className="text-xs text-[var(--color-text-muted)]">
                (Koreksi)
              </span>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  const detailRows = useMemo(
    () => report?.detailRows ?? [],
    [report?.detailRows],
  );
  const totalDetailPages = Math.max(
    1,
    Math.ceil(detailRows.length / DETAIL_PAGE_LIMIT),
  );
  const paginatedDetailRows = useMemo(() => {
    const startIdx = (detailPage - 1) * DETAIL_PAGE_LIMIT;
    return detailRows.slice(startIdx, startIdx + DETAIL_PAGE_LIMIT);
  }, [detailPage, detailRows]);

  const hasAnyRows =
    (report?.groupedRows.length ?? 0) > 0 || detailRows.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Laporan Kehadiran
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Susun rekapitulasi harian, mingguan, bulanan, atau per peserta dan ekspor ke Excel maupun PDF.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={
              loading ||
              Boolean(invalidRangeMessage) ||
              Boolean(exportingFormat) ||
              !report
            }
            onClick={() => void handleExport('xlsx')}
          >
            {exportingFormat === 'xlsx' ? 'Menyiapkan Excel...' : 'Ekspor Excel'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={
              loading ||
              Boolean(invalidRangeMessage) ||
              Boolean(exportingFormat) ||
              !report
            }
            onClick={() => void handleExport('pdf')}
          >
            {exportingFormat === 'pdf' ? 'Menyiapkan PDF...' : 'Ekspor PDF'}
          </Button>
        </div>
      </div>

      {exportError && (
        <Alert
          tone="danger"
          title="Ekspor gagal"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExportError(null)}
            >
              Tutup
            </Button>
          }
        >
          {exportError}
        </Alert>
      )}

      <section
        aria-label="Filter laporan kehadiran"
        className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4 space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Select
            label="Jenis Laporan"
            value={reportType}
            onChange={(e) =>
              handleReportTypeChange(e.target.value as ReportType)
            }
            options={REPORT_TYPE_OPTIONS}
          />
          <Input
            label="Tanggal Mulai"
            type="date"
            value={startDate}
            onChange={(e) => {
              setDatesEditedManually(true);
              setStartDate(e.target.value);
            }}
          />
          <Input
            label="Tanggal Akhir"
            type="date"
            value={endDate}
            onChange={(e) => {
              setDatesEditedManually(true);
              setEndDate(e.target.value);
            }}
            error={invalidRangeMessage ?? undefined}
          />
          <Select
            label="Divisi"
            value={division}
            onChange={(e) => handleDivisionChange(e.target.value)}
            options={divisionOptions}
          />
          <Select
            label="Peserta"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            options={participantOptions}
          />
          <Select
            label="Status Kehadiran"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as 'ALL' | AttendanceStatus)
            }
            options={STATUS_FILTER_OPTIONS}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="text-xs text-[var(--color-text-muted)]">
            {report
              ? `Periode terfilter: ${formatTanggalId(`${report.filters.startDate}T00:00:00.000Z`)} – ${formatTanggalId(`${report.filters.endDate}T00:00:00.000Z`)} • Diperbarui ${formatDateTimeWib(report.generatedAt)}`
              : 'Pilih rentang tanggal dan filter laporan yang diinginkan.'}
          </p>
          <Button variant="ghost" size="sm" onClick={handleResetFilters}>
            Atur Ulang Filter
          </Button>
        </div>
      </section>

      {loading ? (
        <LoadingState label="Menyusun laporan kehadiran..." />
      ) : loadError ? (
        <ErrorState
          title="Laporan belum dapat dimuat"
          description={loadError}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadReport()}
            >
              Coba Lagi
            </Button>
          }
        />
      ) : !report || !hasAnyRows ? (
        <EmptyState
          title="Belum ada data pada filter ini"
          description="Tidak ditemukan catatan presensi yang sesuai dengan rentang tanggal, divisi, peserta, atau status yang dipilih."
          action={
            <Button variant="secondary" size="sm" onClick={handleResetFilters}>
              Atur Ulang Filter
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {/* Ringkasan Operasional */}
          <section
            aria-label="Ringkasan statistik laporan"
            className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-3.5"
          >
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]">
              <div className="pt-2 sm:pt-0">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Total Kehadiran
                </p>
                <p className="text-lg font-semibold tabular-nums text-[var(--color-text-primary)]">
                  {report.summary.totalAttendance}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Dari {report.summary.totalRecords} catatan
                </p>
              </div>
              <div className="pt-2 sm:pt-0 sm:pl-4">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Hadir Tepat Waktu
                </p>
                <p className="text-lg font-semibold tabular-nums text-[var(--color-text-primary)]">
                  {report.summary.presentCount}
                </p>
              </div>
              <div className="pt-2 sm:pt-0 sm:pl-4">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Terlambat
                </p>
                <p className="text-lg font-semibold tabular-nums text-[var(--color-text-primary)]">
                  {report.summary.lateCount}
                </p>
              </div>
              <div className="pt-2 sm:pt-0 sm:pl-4">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Tidak Hadir
                </p>
                <p className="text-lg font-semibold tabular-nums text-[var(--color-text-primary)]">
                  {report.summary.absentCount}
                </p>
              </div>
              <div className="pt-2 sm:pt-0 sm:pl-4 col-span-2 sm:col-span-1">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Persentase Kehadiran
                </p>
                <p className="text-lg font-semibold tabular-nums text-[var(--color-text-primary)]">
                  {report.summary.attendancePercentage}%
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {report.summary.uniqueParticipants} peserta tercatat
                </p>
              </div>
            </div>
          </section>

          {/* Tabel Rekapitulasi */}
          <section className="space-y-2">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Rekapitulasi ({REPORT_TYPE_OPTIONS.find((o) => o.value === reportType)?.label})
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Menampilkan {report.groupedRows.length} baris rekap sesuai pengelompokan laporan.
              </p>
            </div>
            <DataTable
              caption="Tabel rekapitulasi laporan kehadiran"
              columns={groupedColumns}
              rows={report.groupedRows}
              getRowKey={(row) => row.key}
              emptyTitle="Belum ada baris rekapitulasi"
              emptyDescription="Tidak ada data rekap untuk filter saat ini."
            />
          </section>

          {/* Tabel Detail Catatan Presensi */}
          <section className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Detail Catatan Presensi
                </h2>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Menampilkan {detailRows.length} catatan terfilter (sama dengan isi berkas ekspor Excel & PDF).
                </p>
              </div>
            </div>
            <DataTable
              caption="Tabel detail catatan presensi terfilter"
              columns={detailColumns}
              rows={paginatedDetailRows}
              getRowKey={(row) => row.id}
              emptyTitle="Tidak ada catatan presensi"
              emptyDescription="Filter yang dipilih tidak memiliki catatan presensi individual."
            />

            {totalDetailPages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Halaman {detailPage} dari {totalDetailPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={detailPage <= 1}
                    onClick={() => setDetailPage((p) => Math.max(1, p - 1))}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={detailPage >= totalDetailPages}
                    onClick={() =>
                      setDetailPage((p) => Math.min(totalDetailPages, p + 1))
                    }
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
