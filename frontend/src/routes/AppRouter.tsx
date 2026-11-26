import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoadingState } from '../components/ui/index.ts';
import { AuthProvider } from '../context/AuthContext.tsx';
import AdminLoginPage from '../pages/AdminLoginPage.tsx';
import ForgotPasswordPage from '../pages/ForgotPasswordPage.tsx';
import LoginPage from '../pages/LoginPage.tsx';
import NotFoundPage from '../pages/NotFoundPage.tsx';
import RegisterPage from '../pages/RegisterPage.tsx';
import ResetPasswordPage from '../pages/ResetPasswordPage.tsx';
import { ProtectedAdminRoute } from './ProtectedAdminRoute.tsx';
import { ProtectedParticipantRoute } from './ProtectedParticipantRoute.tsx';
import { AdminShellRoute, ParticipantShellRoute } from './ShellRoutes.tsx';

const AttendancePage = lazy(() => import('../pages/AttendancePage.tsx'));
const FaceRegistrationPage = lazy(
  () => import('../pages/FaceRegistrationPage.tsx'),
);
const AttendanceResultPage = lazy(
  () => import('../pages/AttendanceResultPage.tsx'),
);
const AttendanceHistoryPage = lazy(
  () => import('../pages/AttendanceHistoryPage.tsx'),
);
const ParticipantPermissionsPage = lazy(
  () => import('../pages/ParticipantPermissionsPage.tsx'),
);
const ParticipantProfilePage = lazy(
  () => import('../pages/ParticipantProfilePage.tsx'),
);

const AdminDashboardPage = lazy(
  () => import('../pages/AdminDashboardPage.tsx'),
);
const AdminParticipantsPage = lazy(
  () => import('../pages/AdminParticipantsPage.tsx'),
);
const AdminParticipantDetailPage = lazy(
  () => import('../pages/AdminParticipantDetailPage.tsx'),
);
const AdminAttendancePage = lazy(
  () => import('../pages/AdminAttendancePage.tsx'),
);
const AdminPermissionsPage = lazy(
  () => import('../pages/AdminPermissionsPage.tsx'),
);
const AdminReportsPage = lazy(() => import('../pages/AdminReportsPage.tsx'));
const AdminSettingsPage = lazy(() => import('../pages/AdminSettingsPage.tsx'));

function RouteLoadingFallback() {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-6">
      <LoadingState label="Memuat halaman..." />
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/masuk" replace />} />
            <Route path="/masuk" element={<LoginPage />} />
            <Route path="/daftar" element={<RegisterPage />} />
            <Route path="/lupa-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route element={<ProtectedParticipantRoute />}>
              <Route path="/peserta" element={<ParticipantShellRoute />}>
                <Route
                  index
                  element={<Navigate to="/peserta/presensi" replace />}
                />
                <Route path="daftar-wajah" element={<FaceRegistrationPage />} />
                <Route path="presensi" element={<AttendancePage />} />
                <Route
                  path="hasil-presensi"
                  element={<AttendanceResultPage />}
                />
                <Route path="izin" element={<ParticipantPermissionsPage />} />
                <Route path="riwayat" element={<AttendanceHistoryPage />} />
                <Route path="profil" element={<ParticipantProfilePage />} />
              </Route>
            </Route>

            <Route path="/admin/masuk" element={<AdminLoginPage />} />
            <Route element={<ProtectedAdminRoute />}>
              <Route path="/admin" element={<AdminShellRoute />}>
                <Route
                  index
                  element={<Navigate to="/admin/dashboard" replace />}
                />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="peserta" element={<AdminParticipantsPage />} />
                <Route
                  path="peserta/:id"
                  element={<AdminParticipantDetailPage />}
                />
                <Route path="presensi" element={<AdminAttendancePage />} />
                <Route path="izin" element={<AdminPermissionsPage />} />
                <Route path="laporan" element={<AdminReportsPage />} />
                <Route path="pengaturan" element={<AdminSettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
