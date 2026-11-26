import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminAttendancePage from '../pages/AdminAttendancePage.tsx';
import AdminDashboardPage from '../pages/AdminDashboardPage.tsx';
import AdminLoginPage from '../pages/AdminLoginPage.tsx';
import AdminParticipantDetailPage from '../pages/AdminParticipantDetailPage.tsx';
import AdminParticipantsPage from '../pages/AdminParticipantsPage.tsx';
import AdminReportsPage from '../pages/AdminReportsPage.tsx';
import AdminSettingsPage from '../pages/AdminSettingsPage.tsx';
import AttendanceHistoryPage from '../pages/AttendanceHistoryPage.tsx';
import AttendancePage from '../pages/AttendancePage.tsx';
import AttendanceResultPage from '../pages/AttendanceResultPage.tsx';
import DesignSystemPreview from '../pages/DesignSystemPreview.tsx';
import FaceRegistrationPage from '../pages/FaceRegistrationPage.tsx';
import LoginPage from '../pages/LoginPage.tsx';
import NotFoundPage from '../pages/NotFoundPage.tsx';
import ParticipantProfilePage from '../pages/ParticipantProfilePage.tsx';
import RegisterPage from '../pages/RegisterPage.tsx';
import { AdminShellRoute, ParticipantShellRoute } from './ShellRoutes.tsx';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/masuk" replace />} />
        <Route path="/masuk" element={<LoginPage />} />
        <Route path="/daftar" element={<RegisterPage />} />

        <Route path="/peserta" element={<ParticipantShellRoute />}>
          <Route index element={<Navigate to="/peserta/presensi" replace />} />
          <Route path="daftar-wajah" element={<FaceRegistrationPage />} />
          <Route path="presensi" element={<AttendancePage />} />
          <Route path="hasil-presensi" element={<AttendanceResultPage />} />
          <Route path="riwayat" element={<AttendanceHistoryPage />} />
          <Route path="profil" element={<ParticipantProfilePage />} />
        </Route>

        <Route path="/admin/masuk" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminShellRoute />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="peserta" element={<AdminParticipantsPage />} />
          <Route path="peserta/:id" element={<AdminParticipantDetailPage />} />
          <Route path="presensi" element={<AdminAttendancePage />} />
          <Route path="laporan" element={<AdminReportsPage />} />
          <Route path="pengaturan" element={<AdminSettingsPage />} />
        </Route>

        <Route path="/design-system" element={<DesignSystemPreview />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
