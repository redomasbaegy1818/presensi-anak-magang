import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  Pagination,
  Select,
  Textarea,
  type BadgeTone,
  type TableColumn,
} from '../components/ui/index.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import {
  getAdminPermissions,
  reviewAdminPermission,
} from '../services/adminService.ts';
import { ApiError } from '../services/apiClient.ts';
import type {
  PermissionRequestItem,
  PermissionStatus,
  PermissionType,
} from '../types/domain.ts';
import { formatDateTimeWib, formatTanggalId } from '../utils/formatDate.ts';

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

export default function AdminPermissionsPage() {
  usePageTitle('Pengajuan Izin');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PermissionStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | PermissionType>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [permissions, setPermissions] = useState<PermissionRequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [reviewTarget, setReviewTarget] = useState<PermissionRequestItem | null>(
    null,
  );
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED'>(
    'APPROVED',
  );
  const [adminNote, setAdminNote] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminPermissions({
        search,
        status: statusFilter,
        type: typeFilter,
        date: dateFilter || undefined,
        page,
        limit: pageSize,
      });
      setPermissions(data.permissions);
      setTotal(data.total);
      setPendingCount(data.pendingCount);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Gagal memuat daftar pengajuan izin.',
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, dateFilter, page, pageSize]);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  const handleApplyFilter = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleResetFilter = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setDateFilter('');
    setPage(1);
  };

  const openReviewModal = (
    item: PermissionRequestItem,
    decision: 'APPROVED' | 'REJECTED',
  ) => {
    setReviewTarget(item);
    setReviewDecision(decision);
    setAdminNote('');
    setReviewError(null);
  };

  const handleSubmitReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!reviewTarget) return;

    if (reviewDecision === 'REJECTED' && adminNote.trim().length < 3) {
      setReviewError('Catatan alasan penolakan wajib diisi minimal 3 karakter.');
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);
    try {
      const result = await reviewAdminPermission(reviewTarget.id, {
        status: reviewDecision,
        adminNote: adminNote.trim() || undefined,
      });
      setFeedback(result.message);
      setReviewTarget(null);
      await loadPermissions();
    } catch (err) {
      setReviewError(
        err instanceof ApiError
          ? err.message
          : 'Gagal menyimpan keputusan izin.',
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const columns: TableColumn<PermissionRequestItem>[] = [
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
            {row.nimNis} · {row.division}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Jenis & Tanggal',
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
      header: 'Alasan Pengajuan',
      render: (row) => (
        <div className="space-y-0.5 max-w-md">
          <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-line">
            {row.reason}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Dikirim {formatDateTimeWib(row.createdAt)}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div className="space-y-1">
          <Badge tone={getPermissionStatusTone(row.status)}>
            {getPermissionStatusLabel(row.status)}
          </Badge>
          {row.adminNote && (
            <p className="text-xs text-[var(--color-text-secondary)] max-w-xs">
              Catatan: {row.adminNote}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Tindakan',
      align: 'right',
      render: (row) =>
        row.status === 'PENDING' ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => openReviewModal(row, 'APPROVED')}
            >
              Setujui
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openReviewModal(row, 'REJECTED')}
            >
              Tolak
            </Button>
          </div>
        ) : (
          <span className="text-xs text-[var(--color-text-muted)]">
            {row.reviewedAt ? formatDateTimeWib(row.reviewedAt) : 'Selesai'}
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-5 animate-panel-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Monitoring Pengajuan Izin
            </h1>
            <Badge tone={pendingCount > 0 ? 'warning' : 'neutral'}>
              {pendingCount > 0
                ? `${pendingCount} menunggu tinjauan`
                : 'Tidak ada antrean'}
            </Badge>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Pantau permohonan izin atau sakit dari peserta. Izin yang disetujui
            otomatis tercatat pada rekap presensi tanggal terkait.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => void loadPermissions()}
          disabled={loading}
        >
          Muat Ulang
        </Button>
      </div>

      {feedback && (
        <Alert tone="success" title="Keputusan Tersimpan">
          {feedback}
        </Alert>
      )}

      <form
        onSubmit={handleApplyFilter}
        className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
      >
        <Input
          label="Cari Peserta / Alasan"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Nama, NIM/NIS, alasan..."
        />

        <Select
          label="Status"
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value as 'ALL' | PermissionStatus);
          }}
          options={[
            { value: 'ALL', label: 'Semua Status' },
            { value: 'PENDING', label: 'Menunggu' },
            { value: 'APPROVED', label: 'Disetujui' },
            { value: 'REJECTED', label: 'Ditolak' },
          ]}
        />

        <Select
          label="Jenis"
          value={typeFilter}
          onChange={(e) => {
            setPage(1);
            setTypeFilter(e.target.value as 'ALL' | PermissionType);
          }}
          options={[
            { value: 'ALL', label: 'Semua Jenis' },
            { value: 'IZIN', label: 'Izin' },
            { value: 'SAKIT', label: 'Sakit' },
          ]}
        />

        <Input
          type="date"
          label="Mencakup Tanggal"
          value={dateFilter}
          onChange={(e) => {
            setPage(1);
            setDateFilter(e.target.value);
          }}
        />

        <div className="flex items-center gap-2">
          <Button type="submit" size="md">
            Terapkan
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={handleResetFilter}
          >
            Reset
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-6">
          <LoadingState label="Memuat daftar pengajuan izin..." />
        </div>
      ) : error ? (
        <ErrorState
          description={error}
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
            caption="Daftar pengajuan izin peserta magang"
            columns={columns}
            rows={permissions}
            getRowKey={(row) => row.id}
            emptyTitle="Tidak ada pengajuan izin"
            emptyDescription="Belum ada pengajuan izin yang sesuai dengan filter yang dipilih."
          />

          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={total}
            loading={loading}
            itemLabel="pengajuan izin"
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        </div>
      )}

      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => {
          if (!submittingReview) setReviewTarget(null);
        }}
        title={
          reviewDecision === 'APPROVED'
            ? 'Setujui Pengajuan Izin'
            : 'Tolak Pengajuan Izin'
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={submittingReview}
              onClick={() => setReviewTarget(null)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              form="admin-permission-review-form"
              variant={reviewDecision === 'REJECTED' ? 'danger' : 'primary'}
              size="sm"
              loading={submittingReview}
            >
              {reviewDecision === 'APPROVED'
                ? 'Konfirmasi Setujui'
                : 'Konfirmasi Tolak'}
            </Button>
          </div>
        }
      >
        {reviewTarget && (
          <form
            id="admin-permission-review-form"
            onSubmit={(e) => void handleSubmitReview(e)}
            className="space-y-4"
          >
            {reviewError && (
              <Alert tone="danger" title="Gagal Memproses">
                {reviewError}
              </Alert>
            )}

            <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] p-3 space-y-1 text-sm">
              <p className="font-semibold text-[var(--color-text-primary)]">
                {reviewTarget.participantName} ({reviewTarget.nimNis})
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {reviewTarget.type === 'SAKIT' ? 'Sakit' : 'Izin'} ·{' '}
                {formatDateRangeId(reviewTarget.startDate, reviewTarget.endDate)}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] pt-1">
                Alasan: {reviewTarget.reason}
              </p>
            </div>

            {reviewDecision === 'APPROVED' ? (
              <p className="text-xs text-[var(--color-text-secondary)]">
                Menyetujui pengajuan ini akan otomatis mencatat status{' '}
                <strong>Tidak Hadir (Izin)</strong> pada tanggal terkait dan
                mencegah peserta check-in di tanggal tersebut.
              </p>
            ) : (
              <p className="text-xs text-[var(--color-text-secondary)]">
                Peserta tetap dapat melakukan presensi seperti biasa setelah
                pengajuan ditolak.
              </p>
            )}

            <Textarea
              label={
                reviewDecision === 'REJECTED'
                  ? 'Alasan Penolakan'
                  : 'Catatan Admin (Opsional)'
              }
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder={
                reviewDecision === 'REJECTED'
                  ? 'Contoh: Mohon perjelas jadwal atau koordinasikan dengan pembimbing.'
                  : 'Contoh: Izin dicatat, silakan fokus pemulihan.'
              }
              required={reviewDecision === 'REJECTED'}
              maxLength={300}
            />
          </form>
        )}
      </Modal>
    </div>
  );
}
