import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Button, ErrorState, LoadingState } from '../components/ui/index.ts';
import { useAuth } from '../hooks/useAuth.ts';

export function ProtectedParticipantRoute() {
  const { user, status, sessionError, refreshSession } = useAuth();
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

  if (status === 'error') {
    return (
      <div className="min-h-dvh bg-[var(--color-bg-page)] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <ErrorState
            title="Server belum dapat dijangkau"
            description={
              sessionError ??
              'Gagal memeriksa status sesi. Pastikan backend aktif lalu coba lagi.'
            }
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void refreshSession()}
              >
                Coba Lagi
              </Button>
            }
          />
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
