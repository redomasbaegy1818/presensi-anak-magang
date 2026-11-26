import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CameraCaptureFrame,
  WebcamPreview,
  type CameraUiState,
} from '../components/camera/index.ts';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LiveWibClock,
  LoadingState,
} from '../components/ui/index.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { useWebcam } from '../hooks/useWebcam.ts';
import { ApiError } from '../services/apiClient.ts';
import {
  getTodayAttendance,
  markAttendanceFrame,
} from '../services/attendanceService.ts';
import type {
  AttendanceMarkResponse,
  TodayAttendanceSummary,
} from '../types/domain.ts';
import {
  formatAttendanceStatus,
  formatTanggalId,
  formatWaktuWib,
} from '../utils/formatDate.ts';

export default function AttendancePage() {
  usePageTitle('Presensi Harian');
  const navigate = useNavigate();
  const { clearAuthenticatedUser } = useAuth();
  const {
    videoRef,
    webcamStatus,
    cameraError,
    startCamera,
    stopCamera,
    captureFrameBlob,
  } = useWebcam();

  const [today, setToday] = useState<TodayAttendanceSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [flowState, setFlowState] = useState<
    | 'idle'
    | 'verifying'
    | 'failed'
    | 'no_face'
    | 'multiple_faces'
    | 'low_quality'
  >('idle');
  const [statusTitle, setStatusTitle] = useState<string | undefined>(undefined);
  const [statusMessage, setStatusMessage] = useState<string | undefined>(undefined);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const data = await getTodayAttendance();
      setToday(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuthenticatedUser();
        navigate('/masuk', {
          replace: true,
          state: { authNotice: 'unauthorized' },
        });
        return;
      }
      setSummaryError(
        error instanceof ApiError
          ? error.message
          : 'Tidak dapat terhubung ke server untuk memuat status presensi hari ini.',
      );
    } finally {
      setLoadingSummary(false);
    }
  }, [clearAuthenticatedUser, navigate]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  if (loadingSummary) {
    return (
      <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-6">
        <LoadingState label="Memuat status presensi hari ini..." />
      </div>
    );
  }

  if (summaryError || !today) {
    return (
      <ErrorState
        title="Gagal memuat status presensi"
        description={summaryError ?? 'Status presensi hari ini belum tersedia.'}
        action={
          <Button size="sm" variant="secondary" onClick={() => void loadSummary()}>
            Muat Ulang
          </Button>
        }
      />
    );
  }

  if (!today.participantActive) {
    return (
      <Alert tone="danger" title="Kepesertaan Nonaktif">
        Status kepesertaan Anda saat ini nonaktif sehingga presensi tidak dapat
        dilakukan. Hubungi admin kantor untuk informasi lebih lanjut.
      </Alert>
    );
  }

  if (!today.withinInternshipPeriod) {
    return (
      <Alert tone="warning" title="Di Luar Masa Magang">
        Tanggal hari ini berada di luar periode magang Anda. Hubungi admin kantor
        jika terdapat ketidaksesuaian tanggal.
      </Alert>
    );
  }

  if (!today.faceRegistered) {
    return (
      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-5">
        <EmptyState
          title="Pendaftaran wajah diperlukan"
          description="Presensi belum diaktifkan karena data wajah Anda belum didaftarkan."
          action={
            <Button
              size="lg"
              onClick={() => navigate('/peserta/daftar-wajah')}
            >
              Lanjutkan ke Pendaftaran Wajah
            </Button>
          }
        />
      </section>
    );
  }

  if (today.todayPermission?.status === 'APPROVED') {
    const perm = today.todayPermission;
    return (
      <div className="space-y-4 animate-panel-enter">
        <Alert tone="info" title="Izin Disetujui Untuk Hari Ini">
          Pengajuan {perm.type === 'SAKIT' ? 'sakit' : 'izin'} Anda pada{' '}
          {formatTanggalId(today.attendanceDate)} telah disetujui, sehingga Anda
          tidak perlu melakukan presensi wajah hari ini.
        </Alert>

        <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--color-bg-subtle)]">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Rincian Izin Aktif
            </h2>
            <Badge tone="success">Disetujui</Badge>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            <strong>Keterangan:</strong> {perm.reason}
          </p>
          {perm.adminNote && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              <strong>Catatan Admin:</strong> {perm.adminNote}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/peserta/izin')}
            >
              Lihat Pengajuan Izin
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/peserta/riwayat')}
            >
              Riwayat Presensi
            </Button>
          </div>
        </section>
      </div>
    );
  }

  if (today.nextAction === 'COMPLETED' && today.todayRecord) {
    const rec = today.todayRecord;
    return (
      <div className="space-y-4">
        <Alert tone="success" title="Presensi Hari Ini Selesai">
          Presensi masuk dan pulang Anda pada{' '}
          {formatTanggalId(rec.attendanceDate)} sudah tercatat lengkap.
        </Alert>

        <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--color-bg-subtle)]">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Ringkasan Kehadiran Hari Ini
            </h2>
            <Badge tone={rec.status === 'PRESENT' ? 'success' : 'warning'}>
              {formatAttendanceStatus(rec.status)}
            </Badge>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-[var(--color-text-muted)]">Jam Masuk</dt>
              <dd className="font-semibold tabular-nums mt-0.5">
                {formatWaktuWib(rec.checkInAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-text-muted)]">Jam Pulang</dt>
              <dd className="font-semibold tabular-nums mt-0.5">
                {formatWaktuWib(rec.checkOutAt)}
              </dd>
            </div>
          </dl>

          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/peserta/riwayat')}
            >
              Lihat Riwayat Presensi
            </Button>
          </div>
        </section>
      </div>
    );
  }

  const isCheckIn = today.nextAction === 'CHECK_IN';
  const actionLabel = isCheckIn ? 'Presensi Masuk' : 'Presensi Pulang';

  const uiState: CameraUiState = (() => {
    if (webcamStatus === 'permission') return 'permission';
    if (webcamStatus === 'loading') return 'loading';
    if (webcamStatus === 'unavailable') return 'unavailable';
    if (flowState === 'idle') return 'ready';
    return flowState;
  })();

  const handleRequestPermission = () => {
    setFlowState('idle');
    setStatusTitle(undefined);
    setStatusMessage(undefined);
    void startCamera();
  };

  const handleNonRecordedResponse = (result: AttendanceMarkResponse) => {
    setStatusMessage(result.message);
    switch (result.verificationStatus) {
      case 'no_face':
        setFlowState('no_face');
        setStatusTitle(undefined);
        break;
      case 'multiple_faces':
        setFlowState('multiple_faces');
        setStatusTitle(undefined);
        break;
      case 'insufficient_quality':
        setFlowState('low_quality');
        setStatusTitle(undefined);
        break;
      case 'not_verified':
        setFlowState('failed');
        setStatusTitle('Verifikasi wajah gagal');
        break;
      case 'unknown_participant':
        setFlowState('failed');
        setStatusTitle('Data wajah tidak ditemukan');
        break;
      default:
        setFlowState('failed');
        setStatusTitle('Presensi belum dapat dicatat');
    }
  };

  const handleCaptureAndMark = async () => {
    if (today.nextAction === 'COMPLETED') return;

    setFlowState('verifying');
    setStatusTitle('Memverifikasi dan mencatat presensi...');
    setStatusMessage('Tahan posisi sejenak, sistem sedang memproses presensi Anda.');

    try {
      const frameBlob = await captureFrameBlob();
      const result = await markAttendanceFrame(frameBlob, today.nextAction);

      if (result.recorded && result.attendance) {
        stopCamera();
        navigate('/peserta/hasil-presensi', {
          replace: true,
          state: { attendance: result.attendance },
        });
        return;
      }

      handleNonRecordedResponse(result);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuthenticatedUser();
        navigate('/masuk', {
          replace: true,
          state: { authNotice: 'unauthorized' },
        });
        return;
      }

      setFlowState('failed');
      setStatusTitle('Presensi belum dapat dicatat');
      if (error instanceof ApiError) {
        setStatusMessage(error.message);
        if (error.code === 'DUPLICATE_ATTENDANCE' || error.code === 'DUPLICATE_CHECK_IN') {
          void loadSummary();
        }
      } else {
        setStatusMessage(
          'Koneksi ke server terganggu. Periksa jaringan Anda lalu coba lagi.',
        );
      }
    }
  };

  const handleRetry = () => {
    setFlowState('idle');
    setStatusTitle(undefined);
    setStatusMessage(undefined);
  };

  return (
    <div className="space-y-4 animate-panel-enter">
      {today.todayPermission?.status === 'PENDING' && (
        <Alert
          tone="info"
          title="Pengajuan Izin Sedang Menunggu Persetujuan"
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/peserta/izin')}
            >
              Pantau Izin
            </Button>
          }
        >
          Anda memiliki pengajuan{' '}
          {today.todayPermission.type === 'SAKIT' ? 'sakit' : 'izin'} untuk
          hari ini. Apabila Anda tetap hadir ke kantor, Anda masih dapat
          melakukan presensi di bawah.
        </Alert>
      )}

      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <LiveWibClock />
            <span className="text-xs text-[var(--color-text-muted)]">
              {formatTanggalId(today.attendanceDate)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              {actionLabel}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Masuk {today.rules.workStartTime} WIB (toleransi{' '}
            {today.rules.lateToleranceMinutes} menit) · Pulang{' '}
            {today.rules.workEndTime} WIB
          </p>
          {today.todayRecord?.checkInAt && (
            <p className="text-xs text-[var(--color-success)] font-medium tabular-nums">
              Jam masuk tercatat: {formatWaktuWib(today.todayRecord.checkInAt)}
            </p>
          )}
        </div>

        <Link
          to="/peserta/riwayat"
          className="text-xs font-medium text-[var(--color-accent-text)] hover:underline shrink-0"
        >
          Lihat Riwayat
        </Link>
      </section>

      <CameraCaptureFrame
        state={uiState}
        statusTitle={statusTitle}
        statusMessage={
          webcamStatus === 'unavailable'
            ? (cameraError ?? undefined)
            : statusMessage
        }
        captureLabel={
          isCheckIn ? 'Catat Presensi Masuk' : 'Catat Presensi Pulang'
        }
        onRequestPermission={handleRequestPermission}
        onCapture={() => {
          void handleCaptureAndMark();
        }}
        onRetry={handleRetry}
        previewSlot={
          <WebcamPreview
            videoRef={videoRef}
            webcamStatus={webcamStatus}
            detectedBox={null}
          />
        }
      />

      <details className="rounded-[var(--radius-md)] bg-white border border-[var(--color-border)] px-4 py-2.5 text-xs text-[var(--color-text-secondary)]">
        <summary className="font-medium text-[var(--color-text-primary)] cursor-pointer select-none">
          Butuh bantuan presensi atau kamera bermasalah?
        </summary>
        <ul className="mt-2 list-disc pl-4 space-y-1 leading-relaxed">
          <li>
            Pastikan Anda menekan tombol saat jam layanan aktif (sesuai jadwal di atas).
          </li>
          <li>
            Jika verifikasi gagal berulang kali, perbaiki pencahayaan atau perbarui foto
            wajah di menu <strong>Profil → Perbarui Data Wajah</strong>.
          </li>
          <li>
            Jika kamera diblokir, klik ikon kamera/gembok di browser lalu pilih Izinkan.
          </li>
        </ul>
      </details>
    </div>
  );
}
