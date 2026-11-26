import { useEffect } from 'react';

const APP_SUFFIX = 'Magang Presensi';

/**
 * Updates document.title consistently across routes for browser tab clarity
 * and screen-reader navigation announcements.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${APP_SUFFIX}` : APP_SUFFIX;
  }, [title]);
}
