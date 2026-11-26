import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  ErrorState,
  LoadingState,
  Modal,
  paginateItems,
  Pagination,
  type TableColumn,
} from '../components/ui/index.ts';
import { ParticipantEditModal } from '../forms/ParticipantEditModal.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { ApiError } from '../services/apiClient.ts';
import {
  createAdminParticipantResetLink,
  deleteAdminParticipant,
  getAdminParticipantDetail,
  updateAdminParticipantStatus,
} from '../services/adminService.ts';
import type {
  AttendanceRecordItem,
  ParticipantProfile,
} from '../types/domain.ts';
import {
  formatAttendanceStatus,
  formatParticipantStatus,
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
        {row.isCorrected && (
          <span className="text-xs text-[var(--color-text-muted)]">
            (Koreksi)
          </span>
        )}
      </div>
    ),
  },
];

export default function AdminParticipantDetailPage() {
  usePageTitle('Detail Peserta Magang');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clearAuthenticatedUser } = useAuth();

  const [participant, setParticipant] = useState<ParticipantProfile | null>(null);
  const [recentAttendances, setRecentAttendances] = useState<
    AttendanceRecordItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLinkResult, setResetLinkResult] = useState<{
    resetUrl: string;
    expiresInMinutes: number;
    message: string;
  } | null>(null);
  const [copiedResetLink, setCopiedResetLink] = useState(false);

  const handleUnauthorized = useCallback(() => {
    clearAuthenticatedUser();
    navigate('/admin/masuk', {
      replace: true,
      state: { authNotice: 'expired' },
    });
  }, [clearAuthenticatedUser, navigate]);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);

    try {
      const res = await getAdminParticipantDetail(id);
      setParticipant(res.participant);
      setRecentAttendances(res.recentAttendances);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized();
        return;
      }
      setLoadError(
        error instanceof ApiError
          ? error.message
          : 'Gagal memuat detail peserta magang.',
      );
    } finally {
      setLoading(false);
    }
  }, [id, handleUnauthorized]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleConfirmStatus = async () => {
    if (!participant) return;
    const nextStatus = participant.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setStatusSubmitting(true);

    try {
      const res = await updateAdminParticipantStatus(participant.id, nextStatus);
      setParticipant(res.participant);
      setFeedbackBanner(res.message);
      setStatusModalOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized();
        return;
      }
      setStatusModalOpen(false);
      setLoadError(
        error instanceof ApiError
          ? error.message
          : 'Gagal mengubah status peserta.',
      );
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!participant) return;
    setDeleteSubmitting(true);
    setDeleteError(null);

    try {
      const res = await deleteAdminParticipant(participant.id);
      navigate('/admin/peserta', {
        replace: true,
        state: { feedbackBanner: res.message },
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized();
        return;
      }
      setDeleteError(
        error instanceof ApiError
          ? error.message
          : 'Gagal menghapus peserta magang.',
      );
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleOpenResetLinkModal = async () => {
    if (!participant) return;
    setResetModalOpen(true);
    setResetLoading(true);
    setResetError(null);
    setResetLinkResult(null);
    setCopiedResetLink(false);

    try {
      const res = await createAdminParticipantResetLink(participant.id);
      setResetLinkResult({
        resetUrl: res.resetUrl,
        expiresInMinutes: res.expiresInMinutes,
        message: res.message,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized();
        return;
      }
      setResetError(
        error instanceof ApiError
          ? error.message
          : 'Gagal membuat tautan reset kata sandi.',
      );
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopyResetLink = async () => {
    if (!resetLinkResult?.resetUrl) return;
    try {
      await navigator.clipboard.writeText(resetLinkResult.resetUrl);
      setCopiedResetLink(true);
    } catch {
      setCopiedResetLink(false);
    }
  };

  const { pagedItems: pagedAttendances } = useMemo(
    () => paginateItems(recentAttendances, historyPage, historyPageSize),
    [recentAttendances, historyPage, historyPageSize],
  );

  if (loading) {
    return (
      <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-6">
        <LoadingState label="Memuat detail peserta..." />
      </div>
    );
  }

  if (loadError || !participant) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/peserta"
          className="text-xs font-medium text-[var(--color-text-secondary)] hover:underline"
        >
          ← Kembali ke Daftar Peserta
        </Link>
        <ErrorState
          title="Gagal memuat detail peserta"
          description={loadError ?? 'Data peserta tidak ditemukan.'}
          action={
            <Button size="sm" variant="secondary" onClick={() => void loadDetail()}>
              Muat Ulang
            </Button>
          }
        />
      </div>
    );
  }

  const detailFields: { label: string; value: string }[] = [
    { label: 'Nama Lengkap', value: participant.fullName },
    { label: 'NIM / NIS', value: participant.nimNis },
    { label: 'Universitas / Sekolah', value: participant.universitySchool },
    { label: 'Jurusan', value: participant.major },
    { label: 'Divisi', value: participant.division },
    { label: 'Nomor HP', value: participant.phone },
    { label: 'Email', value: participant.email },
    {
      label: 'Periode Magang',
      value: `${formatTanggalId(participant.internshipStartDate)} – ${formatTanggalId(participant.internshipEndDate)}`,
    },
    {
      label: 'Pendaftaran Wajah',
      value: participant.faceRegistered
        ? `Terdaftar (${formatTanggalId(participant.faceRegisteredAt)})`
        : 'Belum Terdaftar',
    },
  ];

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
            {participant.fullName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            Ubah Informasi
          </Button>
          {participant.status === 'ACTIVE' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleOpenResetLinkModal()}
            >
              Reset Sandi
            </Button>
          )}
          <Button
            variant={participant.status === 'ACTIVE' ? 'danger' : 'primary'}
            size="sm"
            onClick={() => setStatusModalOpen(true)}
          >
            {participant.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
          </Button>
          {recentAttendances.length === 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
              onClick={() => {
                setDeleteError(null);
                setDeleteModalOpen(true);
              }}
            >
              Hapus Akun
            </Button>
          )}
        </div>
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

      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-bg-subtle)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Biodata &amp; Periode Magang
          </h2>
          <div className="flex items-center gap-2">
            <Badge tone={participant.status === 'ACTIVE' ? 'success' : 'danger'}>
              {formatParticipantStatus(participant.status)}
            </Badge>
            <Badge tone={participant.faceRegistered ? 'success' : 'neutral'}>
              {participant.faceRegistered
                ? 'Wajah Terdaftar'
                : 'Wajah Belum Terdaftar'}
            </Badge>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {detailFields.map((field) => (
            <div key={field.label}>
              <dt className="text-xs text-[var(--color-text-muted)]">
                {field.label}
              </dt>
              <dd className="font-medium text-[var(--color-text-primary)] mt-0.5">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-2.5">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          Riwayat Presensi Terakhir
        </h2>
        <DataTable
          caption="Riwayat presensi peserta terkait"
          columns={HISTORY_COLUMNS}
          rows={pagedAttendances}
          getRowKey={(row) => row.id}
          emptyTitle="Belum ada catatan presensi"
          emptyDescription="Peserta ini belum memiliki riwayat presensi."
        />
        <Pagination
          page={historyPage}
          pageSize={historyPageSize}
          totalItems={recentAttendances.length}
          pageSizeOptions={[5, 10, 15]}
          itemLabel="riwayat presensi"
          onPageChange={setHistoryPage}
          onPageSizeChange={(nextSize) => {
            setHistoryPageSize(nextSize);
            setHistoryPage(1);
          }}
        />
      </section>

      <ParticipantEditModal
        participant={editOpen ? participant : null}
        onClose={() => setEditOpen(false)}
        onUnauthorized={handleUnauthorized}
        onSaved={(updated, msg) => {
          setParticipant(updated);
          setEditOpen(false);
          setFeedbackBanner(msg);
        }}
      />

      <Modal
        open={statusModalOpen}
        onClose={() => {
          if (!statusSubmitting) setStatusModalOpen(false);
        }}
        title={
          participant.status === 'ACTIVE'
            ? 'Konfirmasi Penonaktifan Peserta'
            : 'Konfirmasi Pengaktifan Peserta'
        }
        footer={
          <>
            <Button
              variant="secondary"
              disabled={statusSubmitting}
              onClick={() => setStatusModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant={participant.status === 'ACTIVE' ? 'danger' : 'primary'}
              loading={statusSubmitting}
              onClick={() => void handleConfirmStatus()}
            >
              {participant.status === 'ACTIVE'
                ? 'Nonaktifkan Peserta'
                : 'Aktifkan Peserta'}
            </Button>
          </>
        }
      >
        <p>
          {participant.status === 'ACTIVE'
            ? `Apakah Anda yakin ingin menonaktifkan ${participant.fullName} (${participant.nimNis})? Peserta yang dinonaktifkan tidak dapat masuk maupun melakukan presensi, dan sesi login aktifnya akan segera dihentikan.`
            : `Aktifkan kembali akun ${participant.fullName} (${participant.nimNis}) agar dapat masuk dan melakukan presensi?`}
        </p>
      </Modal>

      <Modal
        open={deleteModalOpen}
        onClose={() => {
          if (!deleteSubmitting) setDeleteModalOpen(false);
        }}
        title="Hapus Akun Peserta Secara Permanen"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={deleteSubmitting}
              onClick={() => setDeleteModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              loading={deleteSubmitting}
              onClick={() => void handleConfirmDelete()}
            >
              Hapus Permanen
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {deleteError && (
            <Alert tone="danger" title="Penghapusan Dibatalkan">
              {deleteError}
            </Alert>
          )}
          <p className="text-sm text-[var(--color-text-secondary)]">
            Anda akan menghapus permanen akun{' '}
            <strong>{participant.fullName}</strong> ({participant.nimNis}) beserta
            data login dan pendaftaran wajahnya.
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Hapus permanen hanya diperbolehkan untuk peserta yang belum memiliki
            catatan presensi. Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
      </Modal>

      <Modal
        open={resetModalOpen}
        onClose={() => {
          if (!resetLoading) setResetModalOpen(false);
        }}
        title="Tautan Reset Kata Sandi Peserta"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setResetModalOpen(false)}
            >
              Tutup
            </Button>
            {resetLinkResult && (
              <Button
                variant="primary"
                onClick={() => void handleCopyResetLink()}
              >
                {copiedResetLink ? 'Tersalin!' : 'Salin Tautan'}
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-3">
          {resetLoading ? (
            <LoadingState label="Membuat tautan reset satu kali..." />
          ) : resetError ? (
            <Alert tone="danger" title="Gagal Membuat Tautan">
              {resetError}
            </Alert>
          ) : (
            resetLinkResult && (
              <>
                <Alert tone="success" title="Tautan Siap Dibagikan">
                  {resetLinkResult.message}
                </Alert>
                <div className="space-y-1.5">
                  <label
                    htmlFor="participant-reset-url"
                    className="block text-xs font-medium text-[var(--color-text-secondary)]"
                  >
                    Tautan satu kali pakai (berlaku {resetLinkResult.expiresInMinutes} menit)
                  </label>
                  <input
                    id="participant-reset-url"
                    type="text"
                    readOnly
                    value={resetLinkResult.resetUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] px-3 py-2 text-xs text-[var(--color-text-primary)] select-all"
                  />
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Kirimkan tautan ini ke <strong>{participant.fullName}</strong>{' '}
                  (misalnya melalui WhatsApp) agar peserta dapat mengatur kata
                  sandi barunya secara mandiri.
                </p>
              </>
            )
          )}
        </div>
      </Modal>
    </div>
  );
}
