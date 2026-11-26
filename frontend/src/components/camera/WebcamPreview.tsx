import type { RefObject } from 'react';
import type { WebcamStatus } from '../../hooks/useWebcam.ts';
import type { FaceBoundingBox } from '../../types/domain.ts';

export interface WebcamPreviewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  webcamStatus: WebcamStatus;
  detectedBox: FaceBoundingBox | null;
  boxTone?: 'success' | 'danger';
}

export function WebcamPreview({
  videoRef,
  webcamStatus,
  detectedBox,
  boxTone = 'success',
}: WebcamPreviewProps) {
  const isReady = webcamStatus === 'ready';
  const boxBorderClass =
    boxTone === 'success'
      ? 'border-[var(--color-success)]'
      : 'border-[var(--color-danger)]';

  return (
    <div className={isReady ? 'relative w-full h-full' : 'hidden'}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover -scale-x-100"
      />
      {isReady && detectedBox && (
        <div
          aria-hidden="true"
          style={{
            left: `${(1 - detectedBox.x - detectedBox.width) * 100}%`,
            top: `${detectedBox.y * 100}%`,
            width: `${detectedBox.width * 100}%`,
            height: `${detectedBox.height * 100}%`,
          }}
          className={[
            'pointer-events-none absolute border-2 rounded-[var(--radius-sm)]',
            boxBorderClass,
          ].join(' ')}
        />
      )}
    </div>
  );
}
