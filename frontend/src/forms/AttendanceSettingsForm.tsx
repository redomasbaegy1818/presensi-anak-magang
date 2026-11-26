import { useState, type FormEvent } from 'react';
import { Button, Input } from '../components/ui/index.ts';
import type { AttendanceSettingsData } from '../types/domain.ts';

export interface AttendanceSettingsFormProps {
  initialValues: AttendanceSettingsData;
  onSubmit: (values: AttendanceSettingsData) => void;
}

export function AttendanceSettingsForm({
  initialValues,
  onSubmit,
}: AttendanceSettingsFormProps) {
  const [values, setValues] = useState<AttendanceSettingsData>(initialValues);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Buka Presensi Masuk (WIB)"
          type="time"
          required
          value={values.checkInStartTime}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, checkInStartTime: e.target.value }))
          }
          hint="Waktu paling awal peserta dapat melakukan check-in."
        />

        <Input
          label="Jam Masuk Kantor (WIB)"
          type="time"
          required
          value={values.workStartTime}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, workStartTime: e.target.value }))
          }
        />

        <Input
          label="Toleransi Keterlambatan (Menit)"
          type="number"
          min={0}
          max={180}
          required
          value={values.lateToleranceMinutes}
          onChange={(e) =>
            setValues((prev) => ({
              ...prev,
              lateToleranceMinutes: Number(e.target.value || 0),
            }))
          }
          hint="Check-in melewati jam masuk + toleransi dicatat sebagai Terlambat."
        />

        <Input
          label="Jam Pulang Kantor (WIB)"
          type="time"
          required
          value={values.workEndTime}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, workEndTime: e.target.value }))
          }
        />

        <Input
          label="Batas Akhir Check-out (WIB)"
          type="time"
          required
          value={values.checkOutEndTime}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, checkOutEndTime: e.target.value }))
          }
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

      <div className="pt-2 border-t border-[var(--color-bg-subtle)] flex justify-end">
        <Button type="submit">Simpan Pengaturan</Button>
      </div>
    </form>
  );
}
