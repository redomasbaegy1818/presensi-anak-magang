const OFFICE_TIMEZONE = 'Asia/Jakarta';

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: OFFICE_TIMEZONE,
});

const TIME_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: OFFICE_TIMEZONE,
});

export function formatTanggalId(isoOrDate: string | null | undefined): string {
  if (!isoOrDate) return '—';
  const date = new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return '—';
  return DATE_FORMATTER.format(date);
}

export function formatWaktuWib(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return `${TIME_FORMATTER.format(date)} WIB`;
}

export function toWibHhMm(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return TIME_FORMATTER.format(date).replace('.', ':');
}

export function formatDateTimeWib(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return `${DATE_FORMATTER.format(date)}, ${TIME_FORMATTER.format(date)} WIB`;
}

export function formatParticipantStatus(status: 'ACTIVE' | 'INACTIVE'): string {
  return status === 'ACTIVE' ? 'Aktif' : 'Nonaktif';
}

export function formatAttendanceStatus(
  status: 'PRESENT' | 'LATE' | 'ABSENT',
): string {
  switch (status) {
    case 'PRESENT':
      return 'Hadir';
    case 'LATE':
      return 'Terlambat';
    case 'ABSENT':
      return 'Tidak Hadir';
  }
}

export function formatVerificationStatus(
  status: 'VERIFIED' | 'FAILED' | 'MANUAL_OVERRIDE',
): string {
  switch (status) {
    case 'VERIFIED':
      return 'Terverifikasi Wajah';
    case 'FAILED':
      return 'Gagal Verifikasi';
    case 'MANUAL_OVERRIDE':
      return 'Koreksi Admin';
  }
}
