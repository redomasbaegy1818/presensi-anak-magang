import type { ReactNode } from 'react';
import { Button } from '../ui/Button.tsx';

export type CameraUiState =
  | 'permission'
  | 'unavailable'
  | 'loading'
  | 'ready'
  | 'detecting'
  | 'verifying'
  | 'success'
  | 'failed'
  | 'no_face'
  | 'multiple_faces'
  | 'low_quality';

export interface CameraCaptureFrameProps {
  state: CameraUiState;
  statusTitle?: string;
  statusMessage?: string;
  captureLabel?: string;
  onRequestPermission?: () => void;
  onCapture?: () => void;
  onRetry?: () => void;
  previewSlot?: ReactNode;
  footerNote?: string;
}

interface StateMeta {
  badge: string;
  title: string;
  message: string;
  toneClass: string;
  frameBorderClass: string;
  busy?: boolean;
}

const STATE_META: Record<CameraUiState, StateMeta> = {
  permission: {
    badge: 'Izin Kamera',
    title: 'Izin kamera diperlukan',
    message:
      'Aktifkan izin kamera pada browser agar pengambilan foto wajah dapat dimulai.',
    toneClass:
      'bg-[var(--color-bg-subtle)] border-[var(--color-border)] text-[var(--color-text-primary)]',
    frameBorderClass: 'border-[var(--color-border-strong)]',
  },
  unavailable: {
    badge: 'Kamera Tidak Tersedia',
    title: 'Kamera tidak dapat diakses',
    message:
      'Pastikan perangkat memiliki kamera aktif, izin kamera diizinkan, dan tidak sedang digunakan aplikasi lain.',
    toneClass:
      'bg-[var(--color-danger-bg)] border-[var(--color-danger-border)] text-slate-900',
    frameBorderClass: 'border-[var(--color-danger)]',
  },
  loading: {
    badge: 'Menyiapkan',
    title: 'Menyalakan kamera...',
    message: 'Mohon tunggu sebentar hingga pratinjau kamera muncul.',
    toneClass:
      'bg-[var(--color-bg-subtle)] border-[var(--color-border)] text-[var(--color-text-primary)]',
    frameBorderClass: 'border-[var(--color-border-strong)]',
    busy: true,
  },
  ready: {
    badge: 'Siap',
    title: 'Kamera siap digunakan',
    message:
      'Posisikan wajah di dalam area kamera dengan pencahayaan yang cukup.',
    toneClass:
      'bg-white border-[var(--color-border)] text-[var(--color-text-primary)]',
    frameBorderClass: 'border-slate-300',
  },
  detecting: {
    badge: 'Mendeteksi',
    title: 'Memeriksa posisi wajah...',
    message: 'Tahan posisi sejenak dan pastikan wajah berada di dalam bingkai.',
    toneClass:
      'bg-[var(--color-info-bg)] border-[var(--color-info-border)] text-slate-900',
    frameBorderClass: 'border-[var(--color-info)]',
    busy: true,
  },
  verifying: {
    badge: 'Memverifikasi',
    title: 'Memverifikasi identitas wajah...',
    message: 'Sistem sedang mencocokkan data wajah dengan profil terdaftar.',
    toneClass:
      'bg-[var(--color-info-bg)] border-[var(--color-info-border)] text-slate-900',
    frameBorderClass: 'border-[var(--color-info)]',
    busy: true,
  },
  success: {
    badge: 'Wajah Terdeteksi',
    title: 'Wajah terdeteksi dengan jelas',
    message: 'Posisi dan kualitas wajah memenuhi syarat.',
    toneClass:
      'bg-[var(--color-success-bg)] border-[var(--color-success-border)] text-slate-900',
    frameBorderClass: 'border-[var(--color-success)]',
  },
  failed: {
    badge: 'Gagal',
    title: 'Pemeriksaan belum berhasil',
    message:
      'Terjadi kendala saat memproses gambar kamera. Silakan coba lagi.',
    toneClass:
      'bg-[var(--color-danger-bg)] border-[var(--color-danger-border)] text-slate-900',
    frameBorderClass: 'border-[var(--color-danger)]',
  },
  no_face: {
    badge: 'Tidak Ada Wajah',
    title: 'Wajah belum terdeteksi',
    message:
      'Posisikan wajah di dalam area kamera dan pastikan tidak tertutup masker atau tangan.',
    toneClass:
      'bg-[var(--color-warning-bg)] border-[var(--color-warning-border)] text-slate-900',
    frameBorderClass: 'border-[var(--color-warning)]',
  },
  multiple_faces: {
    badge: 'Lebih Dari Satu Wajah',
    title: 'Terdeteksi beberapa wajah',
    message:
      'Pastikan hanya satu wajah yang terlihat di depan kamera.',
    toneClass:
      'bg-[var(--color-warning-bg)] border-[var(--color-warning-border)] text-slate-900',
    frameBorderClass: 'border-[var(--color-warning)]',
  },
  low_quality: {
    badge: 'Kualitas Kurang',
    title: 'Gambar wajah belum cukup jelas',
    message:
      'Pastikan pencahayaan merata, posisi wajah tidak terlalu jauh, dan gambar tidak buram.',
    toneClass:
      'bg-[var(--color-warning-bg)] border-[var(--color-warning-border)] text-slate-900',
    frameBorderClass: 'border-[var(--color-warning)]',
  },
};

/**
 * Reusable Camera UI foundation covering camera permission, readiness,
 * SCRFD face detection, quality feedback, and verification states.
 */
export function CameraCaptureFrame({
  state,
  statusTitle,
  statusMessage,
  captureLabel = 'Ambil Gambar Wajah',
  onRequestPermission,
  onCapture,
  onRetry,
  previewSlot,
  footerNote = 'Data wajah diproses secara internal dan tidak dibagikan ke publik.',
}: CameraCaptureFrameProps) {
  const meta = STATE_META[state];
  const displayTitle = statusTitle ?? meta.title;
  const displayMessage = statusMessage ?? meta.message;

  return (
    <section
      aria-label="Area Kamera Wajah"
      className="bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] p-3 sm:p-4 space-y-3"
    >
      <div
        className={[
          'relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-md)] border bg-slate-900 flex items-center justify-center',
          meta.frameBorderClass,
        ].join(' ')}
      >
        {previewSlot ? (
          previewSlot
        ) : (
          <div className="px-6 text-center text-slate-200 space-y-1.5">
            <p className="text-sm font-medium">{displayTitle}</p>
            <p className="text-xs text-slate-400">
              {state === 'permission'
                ? 'Klik tombol di bawah untuk mengizinkan akses kamera.'
                : 'Pratinjau video kamera tampil di area ini.'}
            </p>
          </div>
        )}

        {/* Restrained framing guide corners (shown during active framing states) */}
        {(state === 'ready' ||
          state === 'detecting' ||
          state === 'no_face' ||
          state === 'multiple_faces' ||
          state === 'low_quality') && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-6 sm:inset-10 flex items-center justify-center"
          >
            <div className="relative w-44 h-56 sm:w-52 sm:h-64">
              <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-white/80" />
              <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-white/80" />
              <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-white/80" />
              <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-white/80" />
            </div>
          </div>
        )}
      </div>

      {/* Primary Action Area right below preview for fast mobile ergonomics */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        {state === 'permission' && (
          <Button size="lg" fullWidth onClick={onRequestPermission}>
            Izinkan Akses Kamera
          </Button>
        )}

        {state === 'unavailable' && (
          <Button size="lg" fullWidth onClick={onRequestPermission ?? onRetry}>
            Coba Aktifkan Kamera Lagi
          </Button>
        )}

        {(state === 'ready' ||
          state === 'no_face' ||
          state === 'multiple_faces' ||
          state === 'low_quality') && (
          <Button size="lg" fullWidth onClick={onCapture}>
            {captureLabel}
          </Button>
        )}

        {(state === 'loading' ||
          state === 'detecting' ||
          state === 'verifying') && (
          <Button size="lg" fullWidth loading disabled>
            {displayTitle}
          </Button>
        )}

        {(state === 'failed' || state === 'success') && (
          <Button
            variant={state === 'failed' ? 'primary' : 'secondary'}
            size="lg"
            fullWidth
            onClick={onRetry}
          >
            {state === 'failed' ? 'Coba Lagi' : 'Ulangi Pemeriksaan'}
          </Button>
        )}
      </div>

      {state === 'ready' ? (
        <p className="text-xs text-[var(--color-text-secondary)] text-center">
          {displayMessage}
        </p>
      ) : (
        <div
          role={
            state === 'failed' ||
            state === 'unavailable' ||
            state === 'no_face' ||
            state === 'multiple_faces' ||
            state === 'low_quality'
              ? 'alert'
              : meta.busy
                ? undefined
                : 'status'
          }
          className={[
            'rounded-[var(--radius-md)] border px-3.5 py-2.5 text-sm space-y-1',
            meta.toneClass,
          ].join(' ')}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">{displayTitle}</p>
            {meta.busy && (
              <progress
                aria-label={displayTitle}
                className="w-20 h-1.5 rounded overflow-hidden accent-[var(--color-accent)]"
              />
            )}
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {displayMessage}
          </p>
        </div>
      )}

      <p className="text-xs text-[var(--color-text-muted)] text-center">
        {footerNote}
      </p>
    </section>
  );
}
