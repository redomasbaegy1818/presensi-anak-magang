import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  Pagination,
  Select,
  type TableColumn,
} from '../components/ui/index.ts';
import { ParticipantEditModal } from '../forms/ParticipantEditModal.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { ApiError } from '../services/apiClient.ts';
import {
  deleteAdminParticipant,
  getAdminParticipants,
  updateAdminParticipantStatus,
} from '../services/adminService.ts';
import type { ParticipantProfile } from '../types/domain.ts';
import {
  formatParticipantStatus,
  formatTanggalId,
} from '../utils/formatDate.ts';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'INACTIVE', label: 'Nonaktif' },
];

const FACE_OPTIONS = [
  { value: 'ALL', label: 'Semua Status Wajah' },
  { value: 'REGISTERED', label: 'Sudah Daftar Wajah' },
  { value: 'UNREGISTERED', label: 'Belum Daftar Wajah' },
];

export default function AdminParticipantsPage() {
  usePageTitle('Peserta Magang');
  const navigate = useNavigate();
  const location = useLocation();
  const { clearAuthenticatedUser } = useAuth();

  const initialBanner =
    (location.state as { feedbackBanner?: string } | null)?.feedbackBanner ??
    null;

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [faceFilter, setFaceFilter] = useState<'ALL' | 'REGISTERED' | 'UNREGISTERED'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [rows, setRows] = useState<ParticipantProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(
    initialBanner,
  );

  const [editingParticipant, setEditingParticipant] =
    useState<ParticipantProfile | null>(null);
  const [statusTarget, setStatusTarget] = useState<ParticipantProfile | null>(
    null,
  );
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ParticipantProfile | null>(
    null,
  );
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const res = await getAdminParticipants({
        search: debouncedSearch,
        status: statusFilter,
        division: divisionFilter,
        faceStatus: faceFilter,
        page,
        limit: pageSize,
      });
      setRows(res.participants);
      setTotal(res.total);
      setDivisions(res.divisions);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized();
        return;
      }
      setLoadError(
        error instanceof ApiError
          ? error.message
          : 'Gagal memuat daftar peserta magang.',
      );
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearch,
    statusFilter,
    divisionFilter,
    faceFilter,
    page,
    pageSize,
    handleUnauthorized,
  ]);

  useEffect(() => {
    void fetchParticipants();
  }, [fetchParticipants]);

  const hasActiveFilter =
    Boolean(debouncedSearch) ||
    statusFilter !== 'ALL' ||
    divisionFilter !== 'ALL' ||
    faceFilter !== 'ALL';

  const resetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setDivisionFilter('ALL');
    setFaceFilter('ALL');
    setPage(1);
  };

  const handleConfirmStatusChange = async () => {
    if (!statusTarget) return;
    const nextStatus = statusTarget.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setStatusSubmitting(true);

    try {
      const res = await updateAdminParticipantStatus(statusTarget.id, nextStatus);
      setStatusTarget(null);
      setFeedbackBanner(res.message);
      void fetchParticipants();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized();
        return;
      }
      setStatusTarget(null);
      setLoadError(
        error instanceof ApiError
          ? error.message
          : 'Gagal memperbarui status peserta.',
      );
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    setDeleteError(null);

    try {
      const res = await deleteAdminParticipant(deleteTarget.id);
      const removedLastOnPage = rows.length === 1 && page > 1;
      setDeleteTarget(null);
      setFeedbackBanner(res.message);
      if (removedLastOnPage) {
        setPage((p) => Math.max(1, p - 1));
      } else {
        void fetchParticipants();
      }
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

  const divisionOptions = [
    { value: 'ALL', label: 'Semua Divisi' },
    ...divisions.map((div) => ({ value: div, label: div })),
  ];

  const columns: TableColumn<ParticipantProfile>[] = [
    {
      key: 'fullName',
      header: 'Peserta',
      isRowHeader: true,
      render: (row) => (
        <div>
          <Link
            to={`/admin/peserta/${row.id}`}
            className="font-medium text-[var(--color-accent-text)] hover:underline"
          >
            {row.fullName}
          </Link>
          <p className="text-xs text-[var(--color-text-muted)]">
            {row.universitySchool} · {row.major}
          </p>
        </div>
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
      key: 'period',
      header: 'Periode Magang',
      render: (row) => (
        <span className="tabular-nums text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
          {formatTanggalId(row.internshipStartDate)} –{' '}
          {formatTanggalId(row.internshipEndDate)}
        </span>
      ),
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
    {
      key: 'actions',
      header: 'Tindakan',
      align: 'right',
      render: (row) => (
        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/admin/peserta/${row.id}`)}
          >
            Detail
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setEditingParticipant(row)}
          >
            Ubah
          </Button>
          <Button
            size="sm"
            variant={row.status === 'ACTIVE' ? 'ghost' : 'secondary'}
            onClick={() => setStatusTarget(row)}
          >
            {row.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
            onClick={() => {
              setDeleteError(null);
              setDeleteTarget(row);
            }}
          >
            Hapus
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
            Daftar Peserta Magang
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Kelola identitas, periode magang, status pendaftaran wajah, dan status aktif peserta.
          </p>
        </div>
        <p className="text-xs font-medium text-[var(--color-text-secondary)] tabular-nums">
          Total: {total} peserta
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
          <div className="md:col-span-5">
            <Input
              label="Cari Peserta"
              placeholder="Nama, NIM/NIS, kampus, atau email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE');
                setPage(1);
              }}
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="md:col-span-3">
            <Select
              label="Divisi"
              value={divisionFilter}
              onChange={(e) => {
                setDivisionFilter(e.target.value);
                setPage(1);
              }}
              options={divisionOptions}
            />
          </div>
          <div className="md:col-span-2">
            <Select
              label="Wajah"
              value={faceFilter}
              onChange={(e) => {
                setFaceFilter(
                  e.target.value as 'ALL' | 'REGISTERED' | 'UNREGISTERED',
                );
                setPage(1);
              }}
              options={FACE_OPTIONS}
            />
          </div>
        </div>
      </section>

      {loadError ? (
        <ErrorState
          title="Gagal memuat daftar peserta"
          description={loadError}
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void fetchParticipants()}
            >
              Muat Ulang
            </Button>
          }
        />
      ) : !loading && rows.length === 0 && hasActiveFilter ? (
        <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-6">
          <EmptyState
            title="Tidak ada peserta yang cocok"
            description="Tidak ditemukan peserta yang sesuai dengan kata kunci pencarian atau filter yang dipilih."
            action={
              <Button size="sm" variant="secondary" onClick={resetFilters}>
                Reset Pencarian &amp; Filter
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          <DataTable
            caption="Daftar peserta magang"
            columns={columns}
            rows={rows}
            loading={loading}
            getRowKey={(row) => row.id}
            emptyTitle="Belum ada peserta magang"
            emptyDescription="Peserta yang telah mendaftar di sistem akan tampil pada tabel ini."
          />

          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={total}
            loading={loading}
            itemLabel="peserta"
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        </div>
      )}

      <ParticipantEditModal
        participant={editingParticipant}
        onClose={() => setEditingParticipant(null)}
        onUnauthorized={handleUnauthorized}
        onSaved={(_updated, msg) => {
          setEditingParticipant(null);
          setFeedbackBanner(msg);
          void fetchParticipants();
        }}
      />

      <Modal
        open={Boolean(statusTarget)}
        onClose={() => {
          if (!statusSubmitting) setStatusTarget(null);
        }}
        title={
          statusTarget?.status === 'ACTIVE'
            ? 'Konfirmasi Penonaktifan Peserta'
            : 'Konfirmasi Pengaktifan Peserta'
        }
        footer={
          <>
            <Button
              variant="secondary"
              disabled={statusSubmitting}
              onClick={() => setStatusTarget(null)}
            >
              Batal
            </Button>
            <Button
              variant={statusTarget?.status === 'ACTIVE' ? 'danger' : 'primary'}
              loading={statusSubmitting}
              onClick={() => void handleConfirmStatusChange()}
            >
              {statusTarget?.status === 'ACTIVE'
                ? 'Nonaktifkan Peserta'
                : 'Aktifkan Peserta'}
            </Button>
          </>
        }
      >
        {statusTarget && (
          <p>
            {statusTarget.status === 'ACTIVE'
              ? `Apakah Anda yakin ingin menonaktifkan ${statusTarget.fullName} (${statusTarget.nimNis})? Peserta yang dinonaktifkan tidak dapat masuk maupun melakukan presensi, dan sesi login aktifnya akan segera dihentikan.`
              : `Aktifkan kembali akun ${statusTarget.fullName} (${statusTarget.nimNis}) agar dapat masuk dan melakukan presensi?`}
          </p>
        )}
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleteSubmitting) setDeleteTarget(null);
        }}
        title="Hapus Akun Peserta Permanen"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={deleteSubmitting}
              onClick={() => setDeleteTarget(null)}
            >
              Batal
            </Button>
            {deleteError && deleteTarget?.status === 'ACTIVE' && (
              <Button
                variant="secondary"
                disabled={deleteSubmitting}
                onClick={() => {
                  const target = deleteTarget;
                  setDeleteTarget(null);
                  setDeleteError(null);
                  setStatusTarget(target);
                }}
              >
                Nonaktifkan Saja
              </Button>
            )}
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
        {deleteTarget && (
          <div className="space-y-3">
            {deleteError && (
              <Alert tone="danger" title="Penghapusan Ditolak">
                {deleteError}
              </Alert>
            )}
            <p className="text-sm text-[var(--color-text-secondary)]">
              Anda akan menghapus akun{' '}
              <strong>{deleteTarget.fullName}</strong> ({deleteTarget.nimNis})
              beserta data login dan pendaftaran wajahnya secara permanen.
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Penghapusan permanen hanya berlaku untuk peserta yang belum
              memiliki catatan presensi agar rekap laporan kantor tetap utuh.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
