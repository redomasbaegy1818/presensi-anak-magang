import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  ErrorState,
  Input,
  LoadingState,
  paginateItems,
  Pagination,
  Select,
  Textarea,
  type BadgeTone,
  type TableColumn,
} from '../components/ui/index.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { ApiError } from '../services/apiClient.ts';
import {
  createParticipantPermission,
  getParticipantPermissions,
} from '../services/attendanceService.ts';
import type {
  PermissionRequestItem,
  PermissionStatus,
  PermissionType,
} from '../types/domain.ts';
import { formatDateTimeWib, formatTanggalId } from '../utils/formatDate.ts';

function getTodayWibDateInput(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
  }).format(new Date());
}

function getPermissionStatusLabel(status: PermissionStatus): string {
  switch (status) {
    case 'APPROVED':
      return 'Disetujui';
    case 'REJECTED':
      return 'Ditolak';
    case 'PENDING':
      return 'Menunggu';
  }
}

function getPermissionStatusTone(status: PermissionStatus): BadgeTone {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
      return 'danger';
    case 'PENDING':
      return 'warning';
  }
}

function formatDateRangeId(startDate: string, endDate: string): string {
  if (startDate === endDate) {
    return formatTanggalId(startDate);
  }
  return `${formatTanggalId(startDate)} — ${formatTanggalId(endDate)}`;
}

const COLUMNS: TableColumn<PermissionRequestItem>[] = [
  {
    key: 'type',
    header: 'Jenis & Tanggal',
    isRowHeader: true,
    render: (row) => (
      <div className="space-y-1">
        <Badge tone={row.type === 'SAKIT' ? 'warning' : 'accent'}>
          {row.type === 'SAKIT' ? 'Sakit' : 'Izin'}
        </Badge>
        <p className="text-xs font-medium text-[var(--color-text-primary)] tabular-nums">
          {formatDateRangeId(row.startDate, row.endDate)}
        </p>
      </div>
    ),
  },
  {
    key: 'reason',
    header: 'Alasan',
    render: (row) => (
      <div className="space-y-0.5 max-w-md">
        <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-line">
          {row.reason}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Diajukan {formatDateTimeWib(row.createdAt)}
        </p>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <Badge tone={getPermissionStatusTone(row.status)}>
        {getPermissionStatusLabel(row.status)}
      </Badge>
    ),
  },
  {
    key: 'adminNote',
    header: 'Catatan Admin',
    render: (row) => (
      <div className="space-y-0.5">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {row.adminNote || '—'}
        </p>
        {row.reviewedAt && (
          <p className="text-xs text-[var(--color-text-muted)]">
            Ditinjau {formatDateTimeWib(row.reviewedAt)}
          </p>
        )}
      </div>
    ),
  },
];

export default function ParticipantPermissionsPage() {
  usePageTitle('Pengajuan Izin');

  const defaultToday = getTodayWibDateInput();
  const [type, setType] = useState<PermissionType>('IZIN');
  const [startDate, setStartDate] = useState(defaultToday);
  const [endDate, setEndDate] = useState(defaultToday);
  const [reason, setReason] = useState('');

  const [permissions, setPermissions] = useState<PermissionRequestItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loadingList, setLoadingList] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadPermissions = useCallback(async () => {
    setLoadingList(true);
    setLoadError(null);
    try {
      const data = await getParticipantPermissions();
      setPermissions(data.permissions);
    } catch (error) {
      setLoadError(
        error instanceof ApiError
          ? error.message
          : 'Gagal memuat daftar pengajuan izin.',
      );
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  const handleStartDateChange = (nextStart: string) => {
    setStartDate(nextStart);
    if (nextStart && (!endDate || endDate < nextStart)) {
      setEndDate(nextStart);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    if (reason.trim().length < 5) {
      setFieldErrors({
        reason: ['Tuliskan alasan izin minimal 5 karakter.'],
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await createParticipantPermission({
        type,
        startDate,
        endDate,
        reason: reason.trim(),
      });
      setSuccessMessage(result.message);
      setReason('');
      setPermissions((prev) => [result.permission, ...prev]);
      setPage(1);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        if (error.details) {
          setFieldErrors(error.details);
        }
      } else {
        setFormError('Tidak dapat mengirim pengajuan izin. Coba lagi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const { pagedItems } = useMemo(
    () => paginateItems(permissions, page, pageSize),
    [permissions, page, pageSize],
  );

  return (
    <div className="space-y-6 animate-panel-enter">
      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] p-4 sm:p-5 space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Ajukan Izin Tidak Hadir
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Gunakan formulir ini jika berhalangan hadir karena sakit atau keperluan
            lainnya. Pengajuan Anda dapat langsung dipantau oleh admin kantor.
          </p>
        </div>

        {formError && (
          <Alert tone="danger" title="Pengajuan Gagal">
            {formError}
          </Alert>
        )}

        {successMessage && (
          <Alert tone="success" title="Pengajuan Terkirim">
            {successMessage}
          </Alert>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Jenis Ketidakhadiran"
              value={type}
              onChange={(e) => setType(e.target.value as PermissionType)}
              options={[
                { value: 'IZIN', label: 'Izin Keperluan' },
                { value: 'SAKIT', label: 'Sakit' },
              ]}
              required
            />

            <Input
              type="date"
              label="Tanggal Mulai"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              error={fieldErrors.startDate?.[0]}
              required
            />

            <Input
              type="date"
              label="Tanggal Selesai"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              error={fieldErrors.endDate?.[0]}
              required
            />
          </div>

          <Textarea
            label="Alasan / Keterangan"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Sakit demam dan perlu istirahat di rumah."
            hint="Maksimal 14 hari per pengajuan dan berada dalam periode magang."
            error={fieldErrors.reason?.[0]}
            maxLength={500}
            required
          />

          <div className="flex items-center justify-end">
            <Button type="submit" loading={submitting}>
              Kirim Pengajuan Izin
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Riwayat Pengajuan Izin
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadPermissions()}
            disabled={loadingList}
          >
            Muat Ulang
          </Button>
        </div>

        {loadingList ? (
          <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-6">
            <LoadingState label="Memuat riwayat pengajuan izin..." />
          </div>
        ) : loadError ? (
          <ErrorState
            description={loadError}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void loadPermissions()}
              >
                Coba Lagi
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            <DataTable
              caption="Daftar pengajuan izin peserta"
              columns={COLUMNS}
              rows={pagedItems}
              getRowKey={(row) => row.id}
              emptyTitle="Belum ada pengajuan izin"
              emptyDescription="Pengajuan izin atau sakit yang Anda kirim akan tampil di sini beserta status peninjauan admin."
            />

            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={permissions.length}
              itemLabel="pengajuan"
              onPageChange={setPage}
              onPageSizeChange={(nextSize) => {
                setPageSize(nextSize);
                setPage(1);
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
