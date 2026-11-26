import { useEffect, useState } from 'react';
import { Alert, Button, Input, Modal, Select } from '../components/ui/index.ts';
import { ApiError } from '../services/apiClient.ts';
import { updateAdminParticipant } from '../services/adminService.ts';
import type {
  AdminParticipantUpdatePayload,
  ParticipantProfile,
} from '../types/domain.ts';

const BASE_DIVISIONS = [
  'Teknologi Informasi',
  'Umum & Administrasi',
  'Keuangan',
  'Hubungan Masyarakat',
  'Operasional',
];

export interface ParticipantEditModalProps {
  participant: ParticipantProfile | null;
  onClose: () => void;
  onSaved: (updated: ParticipantProfile, message: string) => void;
  onUnauthorized: () => void;
}

export function ParticipantEditModal({
  participant,
  onClose,
  onSaved,
  onUnauthorized,
}: ParticipantEditModalProps) {
  const [values, setValues] = useState<AdminParticipantUpdatePayload>({
    fullName: '',
    nimNis: '',
    universitySchool: '',
    major: '',
    division: '',
    phone: '',
    email: '',
    internshipStartDate: '',
    internshipEndDate: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!participant) return;
    setValues({
      fullName: participant.fullName,
      nimNis: participant.nimNis,
      universitySchool: participant.universitySchool,
      major: participant.major,
      division: participant.division,
      phone: participant.phone,
      email: participant.email,
      internshipStartDate: participant.internshipStartDate.slice(0, 10),
      internshipEndDate: participant.internshipEndDate.slice(0, 10),
    });
    setErrorMessage(null);
    setFieldErrors({});
  }, [participant]);

  const divisionOptions = Array.from(
    new Set([...BASE_DIVISIONS, ...(participant ? [participant.division] : [])]),
  ).map((d) => ({ value: d, label: d }));

  const handleSave = async () => {
    if (!participant) return;

    if (
      values.internshipStartDate &&
      values.internshipEndDate &&
      values.internshipEndDate < values.internshipStartDate
    ) {
      setFieldErrors({
        internshipEndDate: [
          'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.',
        ],
      });
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const res = await updateAdminParticipant(participant.id, values);
      onSaved(res.participant, res.message);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          onUnauthorized();
          return;
        }
        setErrorMessage(error.message);
        if (error.details) setFieldErrors(error.details);
      } else {
        setErrorMessage('Gagal menyimpan perubahan data peserta.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={Boolean(participant)}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="Ubah Informasi Peserta"
      footer={
        <>
          <Button variant="secondary" disabled={submitting} onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="primary"
            loading={submitting}
            onClick={() => void handleSave()}
          >
            Simpan Perubahan
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {errorMessage && (
          <Alert tone="danger" title="Gagal Menyimpan">
            {errorMessage}
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Nama Lengkap"
            required
            disabled={submitting}
            value={values.fullName}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, fullName: e.target.value }))
            }
            error={fieldErrors.fullName?.[0]}
          />
          <Input
            label="NIM / NIS"
            required
            disabled={submitting}
            value={values.nimNis}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, nimNis: e.target.value }))
            }
            error={fieldErrors.nimNis?.[0]}
          />
          <Input
            label="Universitas / Sekolah"
            required
            disabled={submitting}
            value={values.universitySchool}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                universitySchool: e.target.value,
              }))
            }
            error={fieldErrors.universitySchool?.[0]}
          />
          <Input
            label="Jurusan"
            required
            disabled={submitting}
            value={values.major}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, major: e.target.value }))
            }
            error={fieldErrors.major?.[0]}
          />
          <Select
            label="Divisi"
            required
            disabled={submitting}
            value={values.division}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, division: e.target.value }))
            }
            options={divisionOptions}
            error={fieldErrors.division?.[0]}
          />
          <Input
            label="Nomor HP"
            required
            disabled={submitting}
            value={values.phone}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, phone: e.target.value }))
            }
            error={fieldErrors.phone?.[0]}
          />
          <div className="sm:col-span-2">
            <Input
              label="Email"
              type="email"
              required
              disabled={submitting}
              value={values.email}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, email: e.target.value }))
              }
              error={fieldErrors.email?.[0]}
            />
          </div>
          <Input
            label="Tanggal Mulai Magang"
            type="date"
            required
            disabled={submitting}
            value={values.internshipStartDate}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                internshipStartDate: e.target.value,
              }))
            }
            error={fieldErrors.internshipStartDate?.[0]}
          />
          <Input
            label="Tanggal Selesai Magang"
            type="date"
            required
            disabled={submitting}
            value={values.internshipEndDate}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                internshipEndDate: e.target.value,
              }))
            }
            error={fieldErrors.internshipEndDate?.[0]}
          />
        </div>
      </div>
    </Modal>
  );
}
