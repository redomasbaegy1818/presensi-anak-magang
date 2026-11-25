import { useState } from 'react';
import {
  CameraCaptureFrame,
  type CameraUiState,
} from '../components/camera/index.ts';
import {
  AdminLayout,
  ParticipantLayout,
  type NavItem,
} from '../components/layout/index.ts';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  Select,
  SuccessState,
  Textarea,
  type TableColumn,
} from '../components/ui/index.ts';

interface TokenSampleRow {
  id: string;
  komponen: string;
  peran: string;
  status: 'Siap' | 'Tunda' | 'Perlu Uji';
  versi: string;
}

const SAMPLE_ROWS: TokenSampleRow[] = [
  {
    id: '1',
    komponen: 'Formulir Dasar',
    peran: 'Input, Select, Textarea',
    status: 'Siap',
    versi: 'v1.0',
  },
  {
    id: '2',
    komponen: 'Tabel Responsif',
    peran: 'Daftar Peserta & Presensi',
    status: 'Siap',
    versi: 'v1.0',
  },
  {
    id: '3',
    komponen: 'Integrasi SCRFD',
    peran: 'Deteksi Wajah (Fase Berikutnya)',
    status: 'Tunda',
    versi: '—',
  },
];

const CAMERA_STATES: { value: CameraUiState; label: string }[] = [
  { value: 'permission', label: '1. Izin Kamera' },
  { value: 'loading', label: '2. Memuat Kamera' },
  { value: 'ready', label: '3. Kamera Siap' },
  { value: 'detecting', label: '4. Mendeteksi Wajah' },
  { value: 'verifying', label: '5. Memverifikasi' },
  { value: 'success', label: '6. Berhasil' },
  { value: 'failed', label: '7. Gagal' },
  { value: 'no_face', label: '8. Tidak Ada Wajah' },
  { value: 'multiple_faces', label: '9. Banyak Wajah' },
];

export default function DesignSystemPreview() {
  const [shellMode, setShellMode] = useState<'admin' | 'participant'>('admin');
  const [activeAdminNav, setActiveAdminNav] = useState('fondasi');
  const [activeParticipantNav, setActiveParticipantNav] = useState('kamera');
  const [cameraState, setCameraState] = useState<CameraUiState>('ready');
  const [modalOpen, setModalOpen] = useState(false);

  const [sampleInput, setSampleInput] = useState('');
  const [sampleDivision, setSampleDivision] = useState('');
  const [sampleNote, setSampleNote] = useState('');
  const [showFieldError, setShowFieldError] = useState(false);

  const adminNavItems: NavItem[] = [
    { id: 'fondasi', label: 'Fondasi Desain', href: '#fondasi', active: activeAdminNav === 'fondasi' },
    { id: 'peserta', label: 'Peserta Magang', href: '#peserta', active: activeAdminNav === 'peserta' },
    { id: 'presensi', label: 'Data Presensi', href: '#presensi', active: activeAdminNav === 'presensi' },
    { id: 'laporan', label: 'Laporan', href: '#laporan', active: activeAdminNav === 'laporan' },
    { id: 'pengaturan', label: 'Pengaturan', href: '#pengaturan', active: activeAdminNav === 'pengaturan' },
  ];

  const participantNavItems: NavItem[] = [
    { id: 'kamera', label: 'Presensi', href: '#kamera', active: activeParticipantNav === 'kamera' },
    { id: 'riwayat', label: 'Riwayat', href: '#riwayat', active: activeParticipantNav === 'riwayat' },
    { id: 'profil', label: 'Profil', href: '#profil', active: activeParticipantNav === 'profil' },
  ];

  const columns: TableColumn<TokenSampleRow>[] = [
    {
      key: 'komponen',
      header: 'Komponen',
      isRowHeader: true,
      render: (row) => row.komponen,
    },
    {
      key: 'peran',
      header: 'Fungsi',
      render: (row) => row.peran,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge tone={row.status === 'Siap' ? 'success' : 'neutral'}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'versi',
      header: 'Versi',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.versi}</span>,
    },
  ];

  const modeSwitcher = (
    <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          Pratinjau Sistem Desain — Magang Presensi
        </p>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Fondasi visual tanpa logika bisnis. Ganti tata letak untuk memeriksa responsivitas Admin dan Peserta.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant={shellMode === 'admin' ? 'primary' : 'secondary'}
          onClick={() => setShellMode('admin')}
        >
          Tata Letak Admin
        </Button>
        <Button
          size="sm"
          variant={shellMode === 'participant' ? 'primary' : 'secondary'}
          onClick={() => setShellMode('participant')}
        >
          Tata Letak Peserta
        </Button>
      </div>
    </div>
  );

  if (shellMode === 'participant') {
    return (
      <ParticipantLayout
        pageTitle="Pratinjau Kamera Peserta"
        participantName="Peserta Contoh"
        navItems={participantNavItems}
        onNavigate={setActiveParticipantNav}
        onLogout={() => setShellMode('admin')}
      >
        <div className="space-y-5">
          {modeSwitcher}

          <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4 space-y-3">
            <Select
              label="Uji State UI Kamera"
              value={cameraState}
              onChange={(e) => setCameraState(e.target.value as CameraUiState)}
              options={CAMERA_STATES}
            />
          </section>

          <CameraCaptureFrame
            state={cameraState}
            onRequestPermission={() => setCameraState('loading')}
            onCapture={() => setCameraState('detecting')}
            onRetry={() => setCameraState('ready')}
          />
        </div>
      </ParticipantLayout>
    );
  }

  return (
    <AdminLayout
      pageTitle="Sistem Desain Antarmuka"
      navItems={adminNavItems}
      onNavigate={setActiveAdminNav}
      onLogout={() => setShellMode('participant')}
    >
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
          Fondasi Visual & Komponen Dasar
        </h1>

        {modeSwitcher}

        {/* Colors & Typography */}
        <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-5 space-y-4">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Warna Dasar Netral & Aksen Surakarta
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="border border-[var(--color-border)] rounded-[var(--radius-sm)] p-2.5 bg-[var(--color-bg-page)]">
              <div className="h-7 rounded-[var(--radius-sm)] bg-[var(--color-bg-page)] border border-[var(--color-border)] mb-1.5" />
              <p className="font-medium">Latar Halaman</p>
              <p className="text-[var(--color-text-muted)]">#f5f6f8</p>
            </div>
            <div className="border border-[var(--color-border)] rounded-[var(--radius-sm)] p-2.5 bg-white">
              <div className="h-7 rounded-[var(--radius-sm)] bg-white border border-[var(--color-border)] mb-1.5" />
              <p className="font-medium">Permukaan</p>
              <p className="text-[var(--color-text-muted)]">#ffffff</p>
            </div>
            <div className="border border-[var(--color-border)] rounded-[var(--radius-sm)] p-2.5 bg-white">
              <div className="h-7 rounded-[var(--radius-sm)] bg-[var(--color-text-primary)] mb-1.5" />
              <p className="font-medium">Teks Utama</p>
              <p className="text-[var(--color-text-muted)]">#18181b</p>
            </div>
            <div className="border border-[var(--color-border)] rounded-[var(--radius-sm)] p-2.5 bg-white">
              <div className="h-7 rounded-[var(--radius-sm)] bg-[var(--color-accent)] mb-1.5" />
              <p className="font-medium">Aksen Merah</p>
              <p className="text-[var(--color-text-muted)]">#9f1239</p>
            </div>
            <div className="border border-[var(--color-border)] rounded-[var(--radius-sm)] p-2.5 bg-white">
              <div className="h-7 rounded-[var(--radius-sm)] bg-[var(--color-success)] mb-1.5" />
              <p className="font-medium">Status Hadir</p>
              <p className="text-[var(--color-text-muted)]">#15803d</p>
            </div>
          </div>
        </section>

        {/* Buttons & Badges */}
        <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-5 space-y-4">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Tombol, Badge & Modal
          </h2>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="primary">Simpan Data</Button>
            <Button variant="secondary">Batal</Button>
            <Button variant="ghost">Tutup</Button>
            <Button variant="danger">Nonaktifkan</Button>
            <Button variant="primary" loading>
              Memproses
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Buka Contoh Modal
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--color-bg-subtle)]">
            <Badge tone="success">Hadir</Badge>
            <Badge tone="warning">Terlambat</Badge>
            <Badge tone="danger">Nonaktif</Badge>
            <Badge tone="accent">Dikoreksi</Badge>
            <Badge tone="neutral">Belum Presensi</Badge>
          </div>
        </section>

        {/* Form Controls */}
        <section className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Kontrol Formulir
            </h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowFieldError((prev) => !prev)}
            >
              {showFieldError ? 'Sembunyikan Contoh Galat' : 'Uji Contoh Galat'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nama Lengkap"
              required
              placeholder="Contoh: Siti Rahmawati"
              value={sampleInput}
              onChange={(e) => setSampleInput(e.target.value)}
              hint="Sesuai identitas resmi atau kartu mahasiswa."
              error={showFieldError ? 'Nama lengkap wajib diisi.' : undefined}
            />
            <Select
              label="Divisi Penempatan"
              required
              placeholder="Pilih divisi..."
              value={sampleDivision}
              onChange={(e) => setSampleDivision(e.target.value)}
              options={[
                { value: 'it', label: 'Teknologi Informasi' },
                { value: 'umum', label: 'Umum & Administrasi' },
                { value: 'humas', label: 'Hubungan Masyarakat' },
              ]}
              error={showFieldError ? 'Silakan pilih salah satu divisi.' : undefined}
            />
          </div>

          <Textarea
            label="Catatan Koreksi"
            placeholder="Tuliskan alasan perubahan data secara singkat..."
            value={sampleNote}
            onChange={(e) => setSampleNote(e.target.value)}
          />
        </section>

        {/* Alerts & State Feedback */}
        <section className="space-y-3">
          <Alert tone="info" title="Informasi Operasional">
            Pengaturan jam masuk standar kantor saat ini menggunakan zona waktu WIB.
          </Alert>
          <Alert tone="danger" title="Koneksi Terputus">
            Gagal terhubung ke server internal. Periksa jaringan kantor Anda.
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4">
              <LoadingState label="Memuat daftar presensi..." />
            </div>
            <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-4">
              <EmptyState
                title="Belum ada catatan presensi"
                description="Belum terdapat data yang sesuai dengan filter tanggal yang dipilih."
              />
            </div>
            <ErrorState
              title="Gagal memuat data"
              description="Terjadi kendala saat mengambil ringkasan hari ini."
              action={<Button size="sm" variant="secondary">Muat Ulang</Button>}
            />
            <SuccessState
              title="Pengaturan tersimpan"
              description="Aturan jam kerja akan diterapkan untuk presensi berikutnya."
            />
          </div>
        </section>

        {/* Table */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Komponen Tabel
          </h2>
          <DataTable
            caption="Daftar komponen fondasi sistem desain"
            columns={columns}
            rows={SAMPLE_ROWS}
            getRowKey={(row) => row.id}
          />
        </section>

        {/* Camera UI Foundation */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Fondasi UI Kamera (9 State)
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Pratinjau seluruh kondisi antarmuka kamera sebelum integrasi SCRFD.
              </p>
            </div>
            <div className="w-full sm:w-64">
              <Select
                label="Pilih State Kamera"
                value={cameraState}
                onChange={(e) => setCameraState(e.target.value as CameraUiState)}
                options={CAMERA_STATES}
              />
            </div>
          </div>

          <div className="max-w-lg">
            <CameraCaptureFrame
              state={cameraState}
              onRequestPermission={() => setCameraState('loading')}
              onCapture={() => setCameraState('detecting')}
              onRetry={() => setCameraState('ready')}
            />
          </div>
        </section>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Konfirmasi Tindakan"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Lanjutkan
            </Button>
          </>
        }
      >
        <p>
          Ini adalah komponen dialog modal berbasis elemen HTML{' '}
          <code>&lt;dialog&gt;</code> bawaan browser dengan penguncian fokus
          otomatis dan dukungan tombol Escape.
        </p>
      </Modal>
    </AdminLayout>
  );
}
