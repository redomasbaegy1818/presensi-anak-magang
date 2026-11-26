import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button, Input } from '../components/ui/index.ts';
import type { AttendanceSettingsData } from '../types/domain.ts';

export interface AttendanceSettingsFormProps {
  initialValues: AttendanceSettingsData;
  submitting?: boolean;
  serverErrors?: Record<string, string[]>;
  onSubmit: (values: AttendanceSettingsData) => void | Promise<void>;
}

const HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function toMinutes(hhMm: string): number {
  const [hStr, mStr] = hhMm.split(':');
  return Number(hStr) * 60 + Number(mStr);
}

function formatMinutesToHhMm(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = String(Math.floor(clamped / 60)).padStart(2, '0');
  const m = String(clamped % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function validateSettingsClient(
  values: AttendanceSettingsData,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!HH_MM_REGEX.test(values.checkInStartTime)) {
    errors.checkInStartTime = 'Format jam buka presensi tidak valid.';
  }
  if (!HH_MM_REGEX.test(values.workStartTime)) {
    errors.workStartTime = 'Format jam masuk kantor tidak valid.';
  }
  if (!HH_MM_REGEX.test(values.workEndTime)) {
    errors.workEndTime = 'Format jam pulang kantor tidak valid.';
  }
  if (!HH_MM_REGEX.test(values.checkOutEndTime)) {
    errors.checkOutEndTime = 'Format batas akhir check-out tidak valid.';
  }

  if (
    !Number.isInteger(values.lateToleranceMinutes) ||
    values.lateToleranceMinutes < 0 ||
    values.lateToleranceMinutes > 180
  ) {
    errors.lateToleranceMinutes =
      'Toleransi keterlambatan harus antara 0 hingga 180 menit.';
  }

  if (Object.keys(errors).length > 0) {
    return errors;
  }

  const checkInStart = toMinutes(values.checkInStartTime);
  const workStart = toMinutes(values.workStartTime);
  const workEnd = toMinutes(values.workEndTime);
  const checkOutEnd = toMinutes(values.checkOutEndTime);

  if (checkInStart > workStart) {
    errors.checkInStartTime =
      'Jam buka presensi tidak boleh lebih lambat dari jam masuk kantor.';
  }
  if (workStart >= workEnd) {
    errors.workEndTime =
      'Jam pulang kantor harus lebih lambat dari jam masuk kantor.';
  } else if (workStart + values.lateToleranceMinutes >= workEnd) {
    errors.lateToleranceMinutes =
      'Jam masuk ditambah toleransi harus lebih awal dari jam pulang kantor.';
  }
  if (checkOutEnd < workEnd) {
    errors.checkOutEndTime =
      'Batas akhir check-out tidak boleh lebih awal dari jam pulang kantor.';
  }

  return errors;
}

export function AttendanceSettingsForm({
  initialValues,
  submitting = false,
  serverErrors,
  onSubmit,
}: AttendanceSettingsFormProps) {
  const [values, setValues] = useState<AttendanceSettingsData>(initialValues);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues(initialValues);
    setClientErrors({});
  }, [initialValues]);

  const effectiveLateDeadline = useMemo(() => {
    if (!HH_MM_REGEX.test(values.workStartTime)) return '—';
    const tolerance = Number.isFinite(values.lateToleranceMinutes)
      ? values.lateToleranceMinutes
      : 0;
    return formatMinutesToHhMm(toMinutes(values.workStartTime) + tolerance);
  }, [values.lateToleranceMinutes, values.workStartTime]);

  const getFieldError = (field: keyof AttendanceSettingsData): string | undefined => {
    return clientErrors[field] ?? serverErrors?.[field]?.[0];
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateSettingsClient(values);
    setClientErrors(validation);
    if (Object.keys(validation).length > 0) {
      return;
    }
    void onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Buka Presensi Masuk (WIB)"
          type="time"
          required
          value={values.checkInStartTime}
          error={getFieldError('checkInStartTime')}
          onChange={(e) => {
            setClientErrors((prev) => ({ ...prev, checkInStartTime: '' }));
            setValues((prev) => ({ ...prev, checkInStartTime: e.target.value }));
          }}
          hint="Waktu paling awal peserta dapat melakukan check-in."
        />

        <Input
          label="Jam Masuk Kantor (WIB)"
          type="time"
          required
          value={values.workStartTime}
          error={getFieldError('workStartTime')}
          onChange={(e) => {
            setClientErrors((prev) => ({ ...prev, workStartTime: '' }));
            setValues((prev) => ({ ...prev, workStartTime: e.target.value }));
          }}
          hint="Patokan awal jam kerja peserta magang."
        />

        <Input
          label="Toleransi Keterlambatan (Menit)"
          type="number"
          min={0}
          max={180}
          step={1}
          required
          value={String(values.lateToleranceMinutes)}
          error={getFieldError('lateToleranceMinutes')}
          onChange={(e) => {
            const parsed =
              e.target.value === '' ? 0 : Math.trunc(Number(e.target.value));
            setClientErrors((prev) => ({ ...prev, lateToleranceMinutes: '' }));
            setValues((prev) => ({
              ...prev,
              lateToleranceMinutes: Number.isNaN(parsed) ? 0 : parsed,
            }));
          }}
          hint={`Check-in hingga ${effectiveLateDeadline} WIB tercatat Hadir; setelahnya Terlambat.`}
        />

        <Input
          label="Jam Pulang Kantor (WIB)"
          type="time"
          required
          value={values.workEndTime}
          error={getFieldError('workEndTime')}
          onChange={(e) => {
            setClientErrors((prev) => ({ ...prev, workEndTime: '' }));
            setValues((prev) => ({ ...prev, workEndTime: e.target.value }));
          }}
          hint="Batas akhir presensi masuk dan acuan waktu pulang."
        />

        <Input
          label="Batas Akhir Check-out (WIB)"
          type="time"
          required
          value={values.checkOutEndTime}
          error={getFieldError('checkOutEndTime')}
          onChange={(e) => {
            setClientErrors((prev) => ({ ...prev, checkOutEndTime: '' }));
            setValues((prev) => ({ ...prev, checkOutEndTime: e.target.value }));
          }}
          hint="Batas paling lambat peserta dapat mencatat check-out."
        />
      </div>

      <label className="flex items-start gap-2.5 text-sm text-[var(--color-text-primary)] cursor-pointer">
        <input
          type="checkbox"
          checked={values.saveEvidence}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, saveEvidence: e.target.checked }))
          }
          className="mt-1 size-4 accent-[var(--color-accent)]"
        />
        <span>
          Simpan foto bukti presensi secara privat untuk keperluan audit admin.
        </span>
      </label>

      <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-3.5 py-2.5 text-xs text-[var(--color-text-secondary)]">
        Ringkasan aturan aktif: Check-in dibuka{' '}
        <strong className="text-[var(--color-text-primary)]">
          {values.checkInStartTime || '—'} WIB
        </strong>{' '}
        · Batas tepat waktu{' '}
        <strong className="text-[var(--color-text-primary)]">
          {effectiveLateDeadline} WIB
        </strong>{' '}
        · Jam pulang{' '}
        <strong className="text-[var(--color-text-primary)]">
          {values.workEndTime || '—'} WIB
        </strong>{' '}
        · Batas check-out{' '}
        <strong className="text-[var(--color-text-primary)]">
          {values.checkOutEndTime || '—'} WIB
        </strong>
        .
      </div>

      <div className="pt-2 border-t border-[var(--color-bg-subtle)] flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </Button>
      </div>
    </form>
  );
}
