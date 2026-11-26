import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '../components/ui/index.ts';
import { useAuth } from '../hooks/useAuth.ts';

export function ProtectedParticipantRoute() {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="min-h-dvh bg-[var(--color-bg-page)] flex items-center justify-center px-4">
        <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] px-8 py-4">
          <LoadingState label="Memeriksa sesi peserta..." />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/masuk"
        replace
        state={{ authNotice: 'unauthorized', from: location.pathname }}
      />
    );
  }

  if (user.role !== 'PARTICIPANT') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
}
