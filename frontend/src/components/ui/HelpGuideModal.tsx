import { Button } from './Button.tsx';
import { Modal } from './Modal.tsx';

export interface HelpGuideModalProps {
  audience: 'participant' | 'admin';
  open: boolean;
  onClose: () => void;
}

export function HelpGuideModal({
  audience,
  open,
  onClose,
}: HelpGuideModalProps) {
  const title =
    audience === 'participant'
      ? 'Panduan Penggunaan — Peserta Magang'
      : 'Panduan Penggunaan — Administrator';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Button variant="primary" size="sm" onClick={onClose}>
          Mengerti
        </Button>
      }
    >
      {audience === 'participant' ? (
        <div className="space-y-4 text-sm text-[var(--color-text-secondary)]">
          <section className="space-y-1.5">
            <h2 className="font-semibold text-[var(--color-text-primary)]">
              1. Pendaftaran Wajah (Dilakukan Sekali)
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Buka halaman <strong>Daftar Wajah</strong> lalu klik{' '}
                <strong>Izinkan Akses Kamera</strong> saat browser meminta izin.
              </li>
              <li>
                Pastikan cahaya cukup terang dari depan (hindari membelakangi
                jendela), lepas masker, dan pastikan hanya satu wajah terlihat.
              </li>
              <li>
                Tekan <strong>Daftarkan Wajah Saya</strong> dan tunggu hingga
                muncul status berhasil.
              </li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-semibold text-[var(--color-text-primary)]">
              2. Presensi Masuk &amp; Pulang Harian
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Di pagi hari, buka menu <strong>Presensi</strong> dan tekan{' '}
                <strong>Catat Presensi Masuk</strong>.
              </li>
              <li>
                Saat jam pulang, buka menu yang sama dan tekan{' '}
                <strong>Catat Presensi Pulang</strong>.
              </li>
              <li>
                Status <strong>Hadir</strong> tercatat jika check-in sebelum
                jam masuk ditambah batas toleransi; melewati batas tersebut
                tercatat <strong>Terlambat</strong>.
              </li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-semibold text-[var(--color-text-primary)]">
              3. Pengajuan Izin Tidak Hadir
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Jika berhalangan hadir karena sakit atau keperluan lain, buka
                menu <strong>Izin</strong> lalu isi jenis, rentang tanggal, dan
                alasan yang jelas.
              </li>
              <li>
                Status pengajuan (<em>Menunggu</em>, <em>Disetujui</em>, atau{' '}
                <em>Ditolak</em>) beserta catatan admin dapat dipantau langsung
                pada daftar riwayat izin.
              </li>
            </ul>
          </section>

          <section className="rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] p-3 space-y-1.5">
            <h2 className="font-semibold text-[var(--color-text-primary)]">
              Jika Mengalami Kendala
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>
                <strong>Kamera ditolak / tidak muncul:</strong> Klik ikon kunci
                atau kamera di bilah alamat browser, ubah izin kamera menjadi{' '}
                <em>Izinkan</em>, lalu muat ulang halaman (F5). Pastikan kamera
                tidak sedang dipakai Zoom/Meet.
              </li>
              <li>
                <strong>Wajah gagal diverifikasi:</strong> Perbaiki pencahayaan,
                dekatkan posisi wajah ke bingkai, atau perbarui data wajah lewat
                menu <strong>Profil → Perbarui Data Wajah</strong>.
              </li>
              <li>
                <strong>Akun nonaktif / jadwal tidak sesuai:</strong> Hubungi
                admin pembimbing kantor untuk pengecekan status atau koreksi
                presensi.
              </li>
            </ul>
          </section>
        </div>
      ) : (
        <div className="space-y-4 text-sm text-[var(--color-text-secondary)]">
          <section className="space-y-1.5">
            <h2 className="font-semibold text-[var(--color-text-primary)]">
              Alur Pengelolaan Admin
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Ringkasan:</strong> Memantau jumlah peserta aktif,
                kehadiran hari ini, komposisi tepat waktu/terlambat, dan status
                layanan verifikasi wajah.
              </li>
              <li>
                <strong>Peserta Magang:</strong> Mencari atau menyaring peserta,
                memperbarui biodata &amp; periode magang, serta mengaktifkan atau
                menonaktifkan akun peserta.
              </li>
              <li>
                <strong>Data Presensi:</strong> Memeriksa jam masuk/pulang, foto
                bukti presensi (jika aktif), dan melakukan{' '}
                <strong>Koreksi</strong> dengan alasan wajib yang tercatat
                permanen di log audit.
              </li>
              <li>
                <strong>Pengajuan Izin:</strong> Memantau dan memproses
                permohonan izin/sakit peserta; izin yang disetujui otomatis
                tercatat ke rekap presensi.
              </li>
              <li>
                <strong>Laporan:</strong> Menyusun rekap harian, mingguan,
                bulanan, atau per peserta sesuai filter, lalu mengunduhnya ke{' '}
                <strong>Excel (.xlsx)</strong> atau <strong>PDF</strong>.
              </li>
              <li>
                <strong>Pengaturan:</strong> Mengatur jam buka check-in, jam
                masuk, toleransi keterlambatan, jam pulang, batas check-out, dan
                penyimpanan foto bukti.
              </li>
            </ul>
          </section>

          <section className="rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] p-3 space-y-1">
            <h2 className="font-semibold text-[var(--color-text-primary)]">
              Catatan Operasional
            </h2>
            <p className="text-xs">
              Menonaktifkan peserta otomatis menghentikan akses login dan
              presensi peserta tersebut, namun seluruh riwayat presensinya tetap
              tersimpan aman untuk keperluan laporan dan audit. Hapus permanen
              tersedia pada halaman detail khusus untuk peserta yang belum
              memiliki catatan presensi (misalnya akun uji coba atau salah
              daftar).
            </p>
          </section>
        </div>
      )}
    </Modal>
  );
}
