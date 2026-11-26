const WIB_TIMEZONE = 'Asia/Jakarta';

export interface WibDateTimeParts {
  dateStr: string;
  hour: number;
  minute: number;
  minutesOfDay: number;
  attendanceDate: Date;
}

export function getWibDateTimeParts(
  instant: Date = new Date(),
  timeZone: string = WIB_TIMEZONE,
): WibDateTimeParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00';

  const year = get('year');
  const month = get('month');
  const day = get('day');
  let hour = Number(get('hour'));
  if (hour === 24) hour = 0;
  const minute = Number(get('minute'));

  const dateStr = `${year}-${month}-${day}`;
  return {
    dateStr,
    hour,
    minute,
    minutesOfDay: hour * 60 + minute,
    attendanceDate: new Date(`${dateStr}T00:00:00.000Z`),
  };
}

export function parseHhMmToMinutes(hhMm: string): number {
  const [hStr, mStr] = hhMm.split(':');
  const hours = Number(hStr);
  const minutes = Number(mStr);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Format waktu tidak valid: ${hhMm}`);
  }
  return hours * 60 + minutes;
}
