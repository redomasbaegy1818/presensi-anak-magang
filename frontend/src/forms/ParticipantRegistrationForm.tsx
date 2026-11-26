import { useState, type FormEvent } from 'react';
import { Button, Input, Select } from '../components/ui/index.ts';

export interface ParticipantRegistrationValues {
  fullName: string;
  nimNis: string;
  universitySchool: string;
  major: string;
  division: string;
  phone: string;
  email: string;
  internshipStartDate: string;
  internshipEndDate: string;
  password: string;
}

export interface ParticipantRegistrationFormProps {
  onSubmit: (values: ParticipantRegistrationValues) => void;
  onCancel?: () => void;
}

const DIVISION_OPTIONS = [
  { value: 'Teknologi Informasi', label: 'Teknologi Informasi' },
  { value: 'Umum & Administrasi', label: 'Umum & Administrasi' },
  { value: 'Keuangan', label: 'Keuangan' },
  { value: 'Hubungan Masyarakat', label: 'Hubungan Masyarakat' },
  { value: 'Operasional', label: 'Operasional' },
];

export function ParticipantRegistrationForm({
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

  const errors: Partial<Record<keyof ParticipantRegistrationValues, string>> = {};
  if (submitted) {
    if (!values.fullName.trim()) errors.fullName = 'Nama lengkap wajib diisi.';
    if (!values.nimNis.trim()) errors.nimNis = 'NIM/NIS wajib diisi.';
    if (!values.universitySchool.trim()) {
      errors.universitySchool = 'Universitas atau sekolah wajib diisi.';
    }
    if (!values.major.trim()) errors.major = 'Jurusan wajib diisi.';
    if (!values.division.trim()) errors.division = 'Divisi penempatan wajib dipilih.';
    if (!values.phone.trim()) errors.phone = 'Nomor HP wajib diisi.';
    if (!values.email.trim()) errors.email = 'Email wajib diisi.';
    if (!values.internshipStartDate) {
      errors.internshipStartDate = 'Tanggal mulai magang wajib diisi.';
    }
    if (!values.internshipEndDate) {
      errors.internshipEndDate = 'Tanggal selesai magang wajib diisi.';
    } else if (
      values.internshipStartDate &&
      values.internshipEndDate < values.internshipStartDate
    ) {
      errors.internshipEndDate =
        'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.';
    }
    if (values.password.length < 8) {
      errors.password = 'Kata sandi minimal 8 karakter.';
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    const hasError =
      !values.fullName.trim() ||
      !values.nimNis.trim() ||
      !values.universitySchool.trim() ||
      !values.major.trim() ||
      !values.division.trim() ||
      !values.phone.trim() ||
      !values.email.trim() ||
      !values.internshipStartDate ||
      !values.internshipEndDate ||
      values.internshipEndDate < values.internshipStartDate ||
      values.password.length < 8;

    if (hasError) return;
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Nama Lengkap"
          required
          placeholder="Sesuai kartu identitas"
          value={values.fullName}
          onChange={(e) => updateField('fullName', e.target.value)}
          error={errors.fullName}
        />

        <Input
          label="NIM / NIS"
          required
          placeholder="Nomor induk mahasiswa atau siswa"
          value={values.nimNis}
          onChange={(e) => updateField('nimNis', e.target.value)}
          error={errors.nimNis}
        />

        <Input
          label="Universitas / Sekolah"
          required
          placeholder="Nama institusi asal"
          value={values.universitySchool}
          onChange={(e) => updateField('universitySchool', e.target.value)}
          error={errors.universitySchool}
        />

        <Input
          label="Jurusan"
          required
          placeholder="Program studi atau kompetensi"
          value={values.major}
          onChange={(e) => updateField('major', e.target.value)}
          error={errors.major}
        />

        <Select
          label="Divisi Penempatan"
          required
          placeholder="Pilih divisi..."
          value={values.division}
          onChange={(e) => updateField('division', e.target.value)}
          options={DIVISION_OPTIONS}
          error={errors.division}
        />

        <Input
          label="Nomor HP"
          type="tel"
          required
          placeholder="08xxxxxxxxxx"
          value={values.phone}
          onChange={(e) => updateField('phone', e.target.value)}
          error={errors.phone}
        />

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          placeholder="nama@contoh.id"
          value={values.email}
          onChange={(e) => updateField('email', e.target.value)}
          error={errors.email}
        />

        <Input
          label="Kata Sandi"
          type="password"
          autoComplete="new-password"
          required
          hint="Minimal 8 karakter."
          value={values.password}
          onChange={(e) => updateField('password', e.target.value)}
          error={errors.password}
        />

        <Input
          label="Tanggal Mulai Magang"
          type="date"
          required
          value={values.internshipStartDate}
          onChange={(e) => updateField('internshipStartDate', e.target.value)}
          error={errors.internshipStartDate}
        />

        <Input
          label="Tanggal Selesai Magang"
          type="date"
          required
          value={values.internshipEndDate}
          onChange={(e) => updateField('internshipEndDate', e.target.value)}
          error={errors.internshipEndDate}
        />
      </div>

      <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
        {onCancel && (
          <Button variant="secondary" size="lg" onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit" size="lg">
          Daftar &amp; Lanjut Pendaftaran Wajah
        </Button>
      </div>
    </form>
  );
}
