import { useState, type FormEvent } from 'react';
import { Button, Input, Select } from '../components/ui/index.ts';
import type { ParticipantRegistrationPayload } from '../types/domain.ts';

export type ParticipantRegistrationValues = ParticipantRegistrationPayload;

export interface ParticipantRegistrationFormProps {
  loading?: boolean;
  serverErrors?: Record<string, string[]>;
  onSubmit: (values: ParticipantRegistrationValues) => void | Promise<void>;
  onCancel?: () => void;
}

const DIVISION_OPTIONS = [
  { value: 'Teknologi Informasi', label: 'Teknologi Informasi' },
  { value: 'Umum & Administrasi', label: 'Umum & Administrasi' },
  { value: 'Keuangan', label: 'Keuangan' },
  { value: 'Hubungan Masyarakat', label: 'Hubungan Masyarakat' },
  { value: 'Operasional', label: 'Operasional' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(?:\+62|62|0)[0-9\s-]{8,16}$/;

function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const parts = dateStr.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (!year || !month || !day) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

function validateClient(
  values: ParticipantRegistrationValues,
): Partial<Record<keyof ParticipantRegistrationValues, string>> {
  const errors: Partial<Record<keyof ParticipantRegistrationValues, string>> = {};

  if (values.fullName.trim().length < 2) {
    errors.fullName = 'Nama lengkap minimal 2 karakter.';
  }
  if (values.nimNis.trim().length < 3) {
    errors.nimNis = 'NIM/NIS minimal 3 karakter.';
  }
  if (values.universitySchool.trim().length < 2) {
    errors.universitySchool = 'Universitas atau sekolah wajib diisi.';
  }
  if (values.major.trim().length < 2) {
    errors.major = 'Jurusan wajib diisi.';
  }
  if (!values.division.trim()) {
    errors.division = 'Divisi penempatan wajib dipilih.';
  }

  const normalizedPhone = values.phone.replace(/[\s-]+/g, '').trim();
  const phoneDigits = normalizedPhone.replace(/\D/g, '');
  if (
    !PHONE_REGEX.test(normalizedPhone) ||
    phoneDigits.length < 9 ||
    phoneDigits.length > 15
  ) {
    errors.phone = 'Nomor HP tidak valid (contoh: 081234567890).';
  }

  if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = 'Format email tidak valid.';
  }

  if (!isValidDateString(values.internshipStartDate)) {
    errors.internshipStartDate = 'Tanggal mulai magang tidak valid.';
  }
  if (!isValidDateString(values.internshipEndDate)) {
    errors.internshipEndDate = 'Tanggal selesai magang tidak valid.';
  } else if (
    isValidDateString(values.internshipStartDate) &&
    values.internshipEndDate < values.internshipStartDate
  ) {
    errors.internshipEndDate =
      'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.';
  }

  if (values.password.length < 8) {
    errors.password = 'Kata sandi minimal 8 karakter.';
  }

  return errors;
}

export function ParticipantRegistrationForm({
  loading = false,
  serverErrors,
  onSubmit,
  onCancel,
}: ParticipantRegistrationFormProps) {
  const [values, setValues] = useState<ParticipantRegistrationValues>({
    fullName: '',
    nimNis: '',
    universitySchool: '',
    major: '',
    division: '',
    phone: '',
    email: '',
    internshipStartDate: '',
    internshipEndDate: '',
    password: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const updateField = <K extends keyof ParticipantRegistrationValues>(
    field: K,
    value: ParticipantRegistrationValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const clientErrors = submitted ? validateClient(values) : {};
  const getError = (
    field: keyof ParticipantRegistrationValues,
  ): string | undefined => {
    return clientErrors[field] ?? serverErrors?.[field]?.[0];
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    const errors = validateClient(values);
    if (Object.keys(errors).length > 0) return;
    void onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Nama Lengkap"
          required
          disabled={loading}
          placeholder="Sesuai kartu identitas"
          value={values.fullName}
          onChange={(e) => updateField('fullName', e.target.value)}
          error={getError('fullName')}
        />

        <Input
          label="NIM / NIS"
          required
          disabled={loading}
          placeholder="Nomor induk mahasiswa atau siswa"
          value={values.nimNis}
          onChange={(e) => updateField('nimNis', e.target.value)}
          error={getError('nimNis')}
        />

        <Input
          label="Universitas / Sekolah"
          required
          disabled={loading}
          placeholder="Nama institusi asal"
          value={values.universitySchool}
          onChange={(e) => updateField('universitySchool', e.target.value)}
          error={getError('universitySchool')}
        />

        <Input
          label="Jurusan"
          required
          disabled={loading}
          placeholder="Program studi atau kompetensi"
          value={values.major}
          onChange={(e) => updateField('major', e.target.value)}
          error={getError('major')}
        />

        <Select
          label="Divisi Penempatan"
          required
          disabled={loading}
          placeholder="Pilih divisi..."
          value={values.division}
          onChange={(e) => updateField('division', e.target.value)}
          options={DIVISION_OPTIONS}
          error={getError('division')}
        />

        <Input
          label="Nomor HP"
          type="tel"
          required
          disabled={loading}
          placeholder="08xxxxxxxxxx"
          value={values.phone}
          onChange={(e) => updateField('phone', e.target.value)}
          error={getError('phone')}
        />

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          disabled={loading}
          placeholder="nama@contoh.id"
          value={values.email}
          onChange={(e) => updateField('email', e.target.value)}
          error={getError('email')}
        />

        <Input
          label="Kata Sandi"
          type="password"
          autoComplete="new-password"
          required
          disabled={loading}
          hint="Minimal 8 karakter."
          value={values.password}
          onChange={(e) => updateField('password', e.target.value)}
          error={getError('password')}
        />

        <Input
          label="Tanggal Mulai Magang"
          type="date"
          required
          disabled={loading}
          value={values.internshipStartDate}
          onChange={(e) => updateField('internshipStartDate', e.target.value)}
          error={getError('internshipStartDate')}
        />

        <Input
          label="Tanggal Selesai Magang"
          type="date"
          required
          disabled={loading}
          value={values.internshipEndDate}
          onChange={(e) => updateField('internshipEndDate', e.target.value)}
          error={getError('internshipEndDate')}
        />
      </div>

      <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
        {onCancel && (
          <Button
            variant="secondary"
            size="lg"
            disabled={loading}
            onClick={onCancel}
          >
            Batal
          </Button>
        )}
        <Button type="submit" size="lg" loading={loading}>
          {loading ? 'Menyimpan Pendaftaran...' : 'Daftar & Lanjut Pendaftaran Wajah'}
        </Button>
      </div>
    </form>
  );
}
