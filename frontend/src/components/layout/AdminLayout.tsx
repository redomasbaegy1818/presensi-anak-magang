import { useState, type ReactNode } from 'react';
import { HelpGuideModal } from '../ui/HelpGuideModal.tsx';
import { Sidebar, type NavItem } from './Sidebar.tsx';
import { Topbar } from './Topbar.tsx';

export interface AdminLayoutProps {
  pageTitle: string;
  navItems: NavItem[];
  onNavigate?: (id: string) => void;
  userName?: string;
  onLogout?: () => void;
  children: ReactNode;
}

/**
 * Desktop-first layout shell for Admin pages with persistent sidebar,
 * topbar, and accessible skip-to-content navigation.
 */
export function AdminLayout({
  pageTitle,
  navItems,
  onNavigate,
  userName = 'Admin Kantor',
  onLogout,
  children,
}: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="min-h-dvh flex bg-[var(--color-bg-page)]">
      <a href="#admin-main-content" className="skip-link visually-hidden">
        Langsung ke konten utama
      </a>

      <Sidebar
        items={navItems}
        onNavigate={onNavigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          title={pageTitle}
          userName={userName}
          userRoleLabel="Administrator"
          onMenuClick={() => setMobileOpen(true)}
          menuExpanded={mobileOpen}
          onHelpClick={() => setHelpOpen(true)}
          onLogout={onLogout}
        />

        <main
          id="admin-main-content"
          tabIndex={-1}
          className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto"
        >
          {children}
        </main>
      </div>

      <HelpGuideModal
        audience="admin"
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </div>
  );
}
