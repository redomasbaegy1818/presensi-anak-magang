import { useState } from 'react';
import { Alert } from '../components/ui/index.ts';
import { AttendanceSettingsForm } from '../forms/AttendanceSettingsForm.tsx';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import type { AttendanceSettingsData } from '../types/domain.ts';

const DEFAULT_SETTINGS: AttendanceSettingsData = {
  checkInStartTime: '06:00',
  workStartTime: '08:00',
  lateToleranceMinutes: 15,
  workEndTime: '17:00',
  checkOutEndTime: '21:00',
  saveEvidence: true,
};

export default function AdminSettingsPage() {
  usePageTitle('Pengaturan Presensi');
  const [savedNotice, setSavedNotice] = useState(false);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
          Pengaturan Aturan Presensi
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Atur jam masuk, toleransi keterlambatan, batas check-out, dan penyimpanan bukti (WIB).
        </p>
      </div>

      {savedNotice && (
        <Alert tone="info" title="Struktur Formulir Pengaturan">
          Perubahan pengaturan siap dikirim ke API setelah fase backend pengaturan diimplementasikan.
        </Alert>
      )}

      <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-5">
        <AttendanceSettingsForm
          initialValues={DEFAULT_SETTINGS}
          onSubmit={() => setSavedNotice(true)}
        />
      </section>
    </div>
  );
}
