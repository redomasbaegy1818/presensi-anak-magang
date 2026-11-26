import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AdminLayout,
  ParticipantLayout,
  type NavItem,
} from '../components/layout/index.ts';
import { useAuth } from '../hooks/useAuth.ts';

const PARTICIPANT_NAV_CONFIG = [
  { id: 'presensi', label: 'Presensi', href: '/peserta/presensi' },
  { id: 'riwayat', label: 'Riwayat', href: '/peserta/riwayat' },
  { id: 'profil', label: 'Profil', href: '/peserta/profil' },
];

const ADMIN_NAV_CONFIG = [
  { id: 'dashboard', label: 'Ringkasan', href: '/admin/dashboard' },
  { id: 'peserta', label: 'Peserta Magang', href: '/admin/peserta' },
  { id: 'presensi', label: 'Data Presensi', href: '/admin/presensi' },
  { id: 'laporan', label: 'Laporan', href: '/admin/laporan' },
  { id: 'pengaturan', label: 'Pengaturan', href: '/admin/pengaturan' },
];

function getParticipantPageTitle(pathname: string): string {
  if (pathname.startsWith('/peserta/daftar-wajah')) return 'Pendaftaran Wajah';
  if (pathname.startsWith('/peserta/hasil-presensi')) return 'Hasil Presensi';
  if (pathname.startsWith('/peserta/riwayat')) return 'Riwayat Presensi';
  if (pathname.startsWith('/peserta/profil')) return 'Profil Peserta';
  return 'Presensi Harian';
}

function getAdminPageTitle(pathname: string): string {
  if (pathname.startsWith('/admin/peserta/')) return 'Detail Peserta Magang';
  if (pathname.startsWith('/admin/peserta')) return 'Peserta Magang';
  if (pathname.startsWith('/admin/presensi')) return 'Data Presensi';
  if (pathname.startsWith('/admin/laporan')) return 'Laporan Kehadiran';
  if (pathname.startsWith('/admin/pengaturan')) return 'Pengaturan Presensi';
  return 'Ringkasan Hari Ini';
}

export function ParticipantShellRoute() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const navItems: NavItem[] = PARTICIPANT_NAV_CONFIG.map((item) => ({
    ...item,
    active:
      item.id === 'presensi'
        ? pathname === '/peserta/presensi' ||
          pathname.startsWith('/peserta/daftar-wajah') ||
          pathname.startsWith('/peserta/hasil-presensi')
        : pathname.startsWith(item.href),
  }));

  return (
    <ParticipantLayout
      pageTitle={getParticipantPageTitle(pathname)}
      navItems={navItems}
      onNavigate={(id) => {
        const target = PARTICIPANT_NAV_CONFIG.find((item) => item.id === id);
        if (target) navigate(target.href);
      }}
      onLogout={() => navigate('/masuk')}
    >
      <Outlet />
    </ParticipantLayout>
  );
}

export function AdminShellRoute() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems: NavItem[] = ADMIN_NAV_CONFIG.map((item) => ({
    ...item,
    active: pathname.startsWith(item.href),
  }));

  const handleAdminLogout = async () => {
    await logout();
    navigate('/admin/masuk', {
      replace: true,
      state: { authNotice: 'logged_out' },
    });
  };

  return (
    <AdminLayout
      pageTitle={getAdminPageTitle(pathname)}
      navItems={navItems}
      userName={user?.username || user?.email || 'Admin Kantor'}
      onNavigate={(id) => {
        const target = ADMIN_NAV_CONFIG.find((item) => item.id === id);
        if (target) navigate(target.href);
      }}
      onLogout={() => {
        void handleAdminLogout();
      }}
    >
      <Outlet />
    </AdminLayout>
  );
}
