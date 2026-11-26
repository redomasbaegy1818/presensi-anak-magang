import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  Pagination,
  Select,
  Textarea,
  type TableColumn,
} from '../components/ui/index.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { ApiError } from '../services/apiClient.ts';
import {
  correctAdminAttendance,
  getAdminAttendance,
  getAdminAttendanceDetail,
  getAdminEvidenceUrl,
} from '../services/adminService.ts';
import type {
  AdminAttendanceDetailRecord,
  AdminAttendanceListItem,
  AttendanceStatus,
} from '../types/domain.ts';
import {
  formatAttendanceStatus,
  formatDateTimeWib,
  formatTanggalId,
  formatVerificationStatus,
  formatWaktuWib,
  toWibHhMm,
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

export default function AdminAttendancePage() {
  usePageTitle('Data Presensi');
  const navigate = useNavigate();
  const { clearAuthenticatedUser } = useAuth();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [participantFilter, setParticipantFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AttendanceStatus>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [rows, setRows] = useState<AdminAttendanceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [participantOptions, setParticipantOptions] = useState<
    { id: string; fullName: string; nimNis: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const [detailTargetId, setDetailTargetId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRecord, setDetailRecord] =
    useState<AdminAttendanceDetailRecord | null>(null);

  const [correctionTarget, setCorrectionTarget] =
    useState<AdminAttendanceListItem | null>(null);
  const [correctionStatus, setCorrectionStatus] =
    useState<AttendanceStatus>('PRESENT');
  const [correctionCheckIn, setCorrectionCheckIn] = useState('');
  const [correctionCheckOut, setCorrectionCheckOut] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    clearAuthenticatedUser();
    navigate('/admin/masuk', {
      replace: true,
      state: { authNotice: 'expired' },
    });
  }, [clearAuthenticatedUser, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const res = await getAdminAttendance({
        search: debouncedSearch,
        participantId: participantFilter,
        date: dateFilter || undefined,
        status: statusFilter,
        page,
        limit: pageSize,
      });
      setRows(res.records);
      setTotal(res.total);
      setParticipantOptions(res.participantOptions);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized();
        return;
      }
      setLoadError(
        error instanceof ApiError
          ? error.message
          : 'Gagal memuat data presensi dari server.',
      );
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearch,
    participantFilter,
    dateFilter,
    statusFilter,
    page,
    pageSize,
    handleUnauthorized,
  ]);

  useEffect(() => {
    void fetchAttendance();
  }, [fetchAttendance]);

  const openDetailModal = async (attendanceId: string) => {
    setDetailTargetId(attendanceId);
    setDetailLoading(true);
    setDetailError(null);
    setDetailRecord(null);

    try {
      const res = await getAdminAttendanceDetail(attendanceId);
      setDetailRecord(res.record);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized();
        return;
      }
      setDetailError(
        error instanceof ApiError
          ? error.message
          : 'Gagal memuat detail presensi.',
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const openCorrectionModal = (row: AdminAttendanceListItem) => {
    setCorrectionTarget(row);
    setCorrectionStatus(row.status);
    setCorrectionCheckIn(toWibHhMm(row.checkInAt));
    setCorrectionCheckOut(toWibHhMm(row.checkOutAt));
    setCorrectionReason('');
    setCorrectionError(null);
  };

  const handleSaveCorrection = async () => {
    if (!correctionTarget) return;

    const trimmedReason = correctionReason.trim();
    if (trimmedReason.length < 5) {
      setCorrectionError('Alasan koreksi wajib diisi minimal 5 karakter.');
      return;
    }

    if (
      correctionCheckIn &&
      correctionCheckOut &&
      correctionCheckOut < correctionCheckIn
    ) {
      setCorrectionError('Jam pulang tidak boleh lebih awal dari jam masuk.');
      return;
    }

    setCorrectionSubmitting(true);
    setCorrectionError(null);

    try {
      const res = await correctAdminAttendance(correctionTarget.id, {
        status: correctionStatus,
        checkInTime: correctionCheckIn || null,
        checkOutTime: correctionCheckOut || null,
        reason: trimmedReason,
      });

      setCorrectionTarget(null);
      setFeedbackBanner(res.message);
      if (detailTargetId === res.record.id) {
        setDetailRecord(res.record);
      }
      void fetchAttendance();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          handleUnauthorized();
          return;
        }
        setCorrectionError(error.message);
      } else {
        setCorrectionError('Gagal menyimpan koreksi presensi.');
      }
    } finally {
      setCorrectionSubmitting(false);
    }
  };

  const hasActiveFilter =
    Boolean(debouncedSearch) ||
    Boolean(dateFilter) ||
    participantFilter !== 'ALL' ||
    statusFilter !== 'ALL';

  const resetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setDateFilter('');
    setParticipantFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  const participantSelectOptions = [
    { value: 'ALL', label: 'Semua Peserta' },
    ...participantOptions.map((p) => ({
      value: p.id,
      label: `${p.fullName} (${p.nimNis})`,
    })),
  ];

  const columns: TableColumn<AdminAttendanceListItem>[] = [
    {
      key: 'participantName',
      header: 'Peserta',
      isRowHeader: true,
      render: (row) => (
        <div>
          <Link
            to={`/admin/peserta/${row.participantId}`}
            className="font-medium text-[var(--color-accent-text)] hover:underline"
          >
            {row.participantName}
          </Link>
          <p className="text-xs text-[var(--color-text-muted)] tabular-nums">
            {row.nimNis} · {row.division}
          </p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Tanggal',
      render: (row) => (
        <span className="tabular-nums whitespace-nowrap">
          {formatTanggalId(row.attendanceDate)}
        </span>
      ),
    },
    {
      key: 'checkInAt',
      header: 'Masuk',
      render: (row) => (
        <span className="tabular-nums whitespace-nowrap">
          {formatWaktuWib(row.checkInAt)}
        </span>
      ),
    },
    {
      key: 'checkOutAt',
      header: 'Pulang',
      render: (row) => (
        <span className="tabular-nums whitespace-nowrap">
          {formatWaktuWib(row.checkOutAt)}
        </span>
      ),
    },
    {
      key: 'verification',
      header: 'Verifikasi',
      render: (row) => (
        <span className="text-xs text-[var(--color-text-secondary)]">
          {formatVerificationStatus(row.verificationStatus)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div className="space-y-0.5">
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
          {row.isCorrected && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Dikoreksi ({row.correctionCount}x)
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Tindakan',
      align: 'right',
      render: (row) => (
        <div className="inline-flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void openDetailModal(row.id)}
          >
            Detail
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openCorrectionModal(row)}
          >
            Koreksi
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Data Presensi Peserta
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Pantau catatan check-in, check-out, hasil verifikasi, dan kelola
            koreksi dengan jejak audit.
          </p>
        </div>
        <p className="text-xs font-medium text-[var(--color-text-secondary)] tabular-nums">
          Total: {total} catatan
        </p>
      </div>

      {feedbackBanner && (
        <Alert
          tone="success"
          title="Berhasil"
          action={
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFeedbackBanner(null)}
            >
              Tutup
            </Button>
          }
        >
          {feedbackBanner}
        </Alert>
      )}

      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <Input
              label="Cari Peserta"
              placeholder="Nama, NIM, atau divisi..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="md:col-span-3">
            <Input
              label="Tanggal"
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="md:col-span-4">
            <Select
              label="Peserta"
              value={participantFilter}
              onChange={(e) => {
                setParticipantFilter(e.target.value);
                setPage(1);
              }}
              options={participantSelectOptions}
            />
          </div>
          <div className="md:col-span-2">
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | AttendanceStatus);
                setPage(1);
              }}
              options={STATUS_FILTER_OPTIONS}
            />
          </div>
        </div>
      </section>

      {loadError ? (
        <ErrorState
          title="Gagal memuat data presensi"
          description={loadError}
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void fetchAttendance()}
            >
              Muat Ulang
            </Button>
          }
        />
      ) : !loading && rows.length === 0 && hasActiveFilter ? (
        <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-6">
          <EmptyState
            title="Tidak ada catatan presensi yang cocok"
            description="Tidak ada data yang sesuai dengan pencarian atau filter yang dipilih."
            action={
              <Button size="sm" variant="secondary" onClick={resetFilters}>
                Reset Filter
              </Button>
            }
          />
        </div>
      ) : (
        <DataTable
          caption="Data presensi harian peserta magang"
          columns={columns}
          rows={rows}
          loading={loading}
          getRowKey={(row) => row.id}
          emptyTitle="Belum ada data presensi"
          emptyDescription="Catatan presensi masuk dan pulang peserta akan tampil di sini."
        />
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        totalItems={total}
        loading={loading}
        itemLabel="catatan presensi"
        onPageChange={setPage}
        onPageSizeChange={(nextSize) => {
          setPageSize(nextSize);
          setPage(1);
        }}
      />

      {/* Inspection Modal */}
      <Modal
        open={Boolean(detailTargetId)}
        onClose={() => {
          setDetailTargetId(null);
          setDetailRecord(null);
        }}
        title="Detail & Jejak Audit Presensi"
        footer={
          <Button
            variant="secondary"
            onClick={() => {
              setDetailTargetId(null);
              setDetailRecord(null);
            }}
          >
            Tutup
          </Button>
        }
      >
        {detailLoading ? (
          <LoadingState label="Memuat detail presensi..." />
        ) : detailError || !detailRecord ? (
          <ErrorState
            title="Gagal memuat detail"
            description={detailError ?? 'Detail presensi tidak tersedia.'}
          />
        ) : (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">Peserta</dt>
                <dd className="font-medium mt-0.5">
                  {detailRecord.participantName} ({detailRecord.nimNis})
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">Tanggal</dt>
                <dd className="font-medium tabular-nums mt-0.5">
                  {formatTanggalId(detailRecord.attendanceDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">Jam Masuk</dt>
                <dd className="font-medium tabular-nums mt-0.5">
                  {formatWaktuWib(detailRecord.checkInAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">Jam Pulang</dt>
                <dd className="font-medium tabular-nums mt-0.5">
                  {formatWaktuWib(detailRecord.checkOutAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">Status</dt>
                <dd className="mt-0.5">
                  {formatAttendanceStatus(detailRecord.status)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">Verifikasi</dt>
                <dd className="mt-0.5">
                  {formatVerificationStatus(detailRecord.verificationStatus)}
                </dd>
              </div>
            </dl>

            {detailRecord.evidences.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-[var(--color-bg-subtle)]">
                <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Bukti Foto Privat
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {detailRecord.evidences.map((ev) => (
                    <div
                      key={ev.id}
                      className="border border-[var(--color-border)] rounded-[var(--radius-sm)] p-2 space-y-1.5"
                    >
                      <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                        {ev.type === 'CHECK_IN' ? 'Bukti Masuk' : 'Bukti Pulang'} ·{' '}
                        {formatWaktuWib(ev.capturedAt)}
                      </p>
                      <img
                        src={getAdminEvidenceUrl(detailRecord.id, ev.type)}
                        alt={
                          ev.type === 'CHECK_IN'
                            ? 'Bukti presensi masuk'
                            : 'Bukti presensi pulang'
                        }
                        className="w-full aspect-[4/3] object-cover rounded-[var(--radius-sm)] bg-slate-100"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-3 border-t border-[var(--color-bg-subtle)]">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Riwayat Audit Koreksi
              </p>
              {detailRecord.correctionLogs.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Belum pernah dikoreksi oleh admin.
                </p>
              ) : (
                <ul className="space-y-2">
                  {detailRecord.correctionLogs.map((log) => (
                    <li
                      key={log.id}
                      className="rounded-[var(--radius-sm)] bg-[var(--color-bg-subtle)] p-2.5 text-xs space-y-1"
                    >
                      <div className="flex flex-wrap justify-between gap-1 font-medium text-[var(--color-text-primary)]">
                        <span>Admin: {log.adminLabel}</span>
                        <span className="tabular-nums text-[var(--color-text-secondary)]">
                          {formatDateTimeWib(log.createdAt)}
                        </span>
                      </div>
                      <p className="text-[var(--color-text-secondary)]">
                        Status:{' '}
                        {log.previousStatus
                          ? formatAttendanceStatus(log.previousStatus)
                          : '—'}{' '}
                        → {formatAttendanceStatus(log.newStatus)} · Masuk:{' '}
                        {formatWaktuWib(log.previousCheckInAt)} →{' '}
                        {formatWaktuWib(log.newCheckInAt)} · Pulang:{' '}
                        {formatWaktuWib(log.previousCheckOutAt)} →{' '}
                        {formatWaktuWib(log.newCheckOutAt)}
                      </p>
                      <p className="text-[var(--color-text-primary)]">
                        Alasan: {log.reason}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Correction Modal */}
      <Modal
        open={Boolean(correctionTarget)}
        onClose={() => {
          if (!correctionSubmitting) setCorrectionTarget(null);
        }}
        title="Koreksi Catatan Presensi"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={correctionSubmitting}
              onClick={() => setCorrectionTarget(null)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              loading={correctionSubmitting}
              onClick={() => void handleSaveCorrection()}
            >
              Simpan Koreksi
            </Button>
          </>
        }
      >
        {correctionTarget && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--color-text-secondary)]">
              Peserta: <strong>{correctionTarget.participantName}</strong> (
              {formatTanggalId(correctionTarget.attendanceDate)}). Setiap koreksi
              akan dicatat permanen bersama identitas admin dan waktu perubahan.
            </p>

            {correctionError && (
              <Alert tone="danger" title="Koreksi Gagal">
                {correctionError}
              </Alert>
            )}

            <Select
              label="Status Kehadiran"
              required
              disabled={correctionSubmitting}
              value={correctionStatus}
              onChange={(e) =>
                setCorrectionStatus(e.target.value as AttendanceStatus)
              }
              options={CORRECTION_STATUS_OPTIONS}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Jam Masuk (WIB)"
                type="time"
                disabled={correctionSubmitting}
                value={correctionCheckIn}
                onChange={(e) => setCorrectionCheckIn(e.target.value)}
              />
              <Input
                label="Jam Pulang (WIB)"
                type="time"
                disabled={correctionSubmitting}
                value={correctionCheckOut}
                onChange={(e) => setCorrectionCheckOut(e.target.value)}
              />
            </div>

            <Textarea
              label="Alasan Koreksi"
              required
              disabled={correctionSubmitting}
              placeholder="Tuliskan alasan koreksi secara jelas untuk audit log (minimal 5 karakter)..."
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
