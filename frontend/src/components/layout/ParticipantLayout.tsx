import { useState, type ReactNode } from 'react';
import { BrandLogo } from '../ui/BrandLogo.tsx';
import { Button } from '../ui/Button.tsx';
import { HelpGuideModal } from '../ui/HelpGuideModal.tsx';
import { IconHelpCircle, IconLogout } from '../ui/Icons.tsx';
import { UserAvatar } from '../ui/UserAvatar.tsx';
import type { NavItem } from './Sidebar.tsx';

export interface ParticipantLayoutProps {
  pageTitle: string;
  participantName?: string;
  navItems: NavItem[];
  onNavigate?: (id: string) => void;
  onLogout?: () => void;
  children: ReactNode;
}

/**
 * Mobile-friendly layout shell for Internship Participants using a phone or
 * desktop camera, featuring large tap targets and single-column ergonomics.
 */
export function ParticipantLayout({
  pageTitle,
  participantName,
  navItems,
  onNavigate,
  onLogout,
  children,
}: ParticipantLayoutProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg-page)]">
      <a href="#participant-main-content" className="skip-link visually-hidden">
        Langsung ke konten utama
      </a>

      <header className="bg-white border-t-2 border-t-[var(--color-accent)] border-b border-[var(--color-border)] shadow-[var(--shadow-sm)] sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandLogo size="sm" />
            <div className="leading-tight min-w-0">
              <span className="block text-sm font-semibold text-[var(--color-text-primary)] truncate">
                Presensi Magang
              </span>
              <span className="hidden sm:block text-[11px] text-[var(--color-text-muted)]">
                Portal Peserta
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHelpOpen(true)}
            >
              <IconHelpCircle className="size-4" />
              <span className="hidden sm:inline">Panduan</span>
            </Button>
            {participantName && (
              <div className="hidden sm:flex items-center gap-2">
                <UserAvatar name={participantName} size="sm" />
                <span className="text-xs font-medium text-[var(--color-text-secondary)] truncate max-w-36">
                  {participantName}
                </span>
              </div>
            )}
            {onLogout && (
              <Button variant="secondary" size="sm" onClick={onLogout}>
                <IconLogout className="size-3.5" />
                <span>Keluar</span>
              </Button>
            )}
          </div>
        </div>

        <nav
          aria-label="Navigasi Peserta"
          className="max-w-2xl mx-auto px-4 border-t border-[var(--color-bg-subtle)] hidden sm:block"
        >
          <ul className="flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  aria-current={item.active ? 'page' : undefined}
                  onClick={(e) => {
                    if (onNavigate) {
                      e.preventDefault();
                      onNavigate(item.id);
                    }
                  }}
                  className={[
                    'inline-flex items-center gap-1.5 min-h-11 px-3 text-sm border-b-2 transition-colors',
                    item.active
                      ? 'border-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold'
                      : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium',
                  ].join(' ')}
                >
                  {item.icon && (
                    <span aria-hidden="true" className="shrink-0">
                      {item.icon}
                    </span>
                  )}
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main
        id="participant-main-content"
        tabIndex={-1}
        className="flex-1 w-full max-w-2xl mx-auto px-4 py-5 pb-24 sm:pb-8"
      >
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
          {pageTitle}
        </h1>
        {children}
      </main>

      <nav
        aria-label="Navigasi Bawah Peserta"
        className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-[var(--color-border)]"
      >
        <ul className="grid grid-cols-4">
          {navItems.map((item) => (
            <li key={item.id}>
              <a
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate(item.id);
                  }
                }}
                className={[
                  'flex flex-col items-center justify-center gap-0.5 min-h-14 px-2 py-1.5 text-xs border-t-2 transition-colors',
                  item.active
                    ? 'border-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold bg-[var(--color-accent-subtle)]/40'
                    : 'border-transparent text-[var(--color-text-secondary)] font-medium',
                ].join(' ')}
              >
                {item.icon && (
                  <span aria-hidden="true" className="shrink-0">
                    {item.icon}
                  </span>
                )}
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <HelpGuideModal
        audience="participant"
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </div>
  );
}
