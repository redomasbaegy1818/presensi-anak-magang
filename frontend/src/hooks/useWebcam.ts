import { useCallback, useEffect, useRef, useState } from 'react';

export type WebcamStatus =
  | 'permission'
  | 'loading'
  | 'ready'
  | 'unavailable';

const MAX_CAPTURE_WIDTH = 640;
const JPEG_QUALITY = 0.82;

function mapCameraError(error: unknown): string {
  if (error instanceof DOMException) {
    if (
      error.name === 'NotAllowedError' ||
      error.name === 'PermissionDeniedError'
    ) {
      return 'Izin kamera ditolak oleh browser. Aktifkan izin kamera pada pengaturan situs lalu coba lagi.';
    }
    if (
      error.name === 'NotFoundError' ||
      error.name === 'DevicesNotFoundError'
    ) {
      return 'Kamera tidak ditemukan pada perangkat ini.';
    }
    if (
      error.name === 'NotReadableError' ||
      error.name === 'TrackStartError'
    ) {
      return 'Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi lain lalu coba lagi.';
    }
    if (error.name === 'SecurityError') {
      return 'Akses kamera memerlukan koneksi aman (HTTPS atau localhost).';
    }
  }
  return 'Kamera tidak dapat diakses. Pastikan perangkat mendukung kamera dan izin browser aktif.';
}

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [webcamStatus, setWebcamStatus] = useState<WebcamStatus>('permission');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setWebcamStatus('unavailable');
      setCameraError(
        'Browser Anda tidak mendukung akses kamera atau halaman tidak berada di koneksi aman.',
      );
      return;
    }

    setWebcamStatus('loading');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      setWebcamStatus('ready');
    } catch (error) {
      stopCamera();
      setWebcamStatus('unavailable');
      setCameraError(mapCameraError(error));
    }
  }, [stopCamera]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (webcamStatus === 'ready' && video && stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      void video.play().catch(() => undefined);
    }
  }, [webcamStatus]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const captureFrameBlob = useCallback(async (): Promise<Blob> => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      throw new Error('Pratinjau kamera belum siap.');
    }

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    const scale = Math.min(1, MAX_CAPTURE_WIDTH / sourceWidth);
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Gagal menyiapkan kanvas kamera.');
    }

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Gagal mengambil gambar dari kamera.'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    });
  }, []);

  return {
    videoRef,
    webcamStatus,
    cameraError,
    startCamera,
    stopCamera,
    captureFrameBlob,
  };
}
