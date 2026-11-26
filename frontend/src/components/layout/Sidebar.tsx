import type { ReactNode } from 'react';
import { BrandLogo } from '../ui/BrandLogo.tsx';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  active?: boolean;
  icon?: ReactNode;
}

export interface SidebarProps {
  brandTitle?: string;
  brandSubtitle?: string;
  items: NavItem[];
  onNavigate?: (id: string) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  brandTitle = 'Presensi Magang',
  brandSubtitle = 'Verifikasi Wajah',
  items,
  onNavigate,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const navContent = (
    <div className="flex h-full flex-col bg-white border-r border-[var(--color-border)]">
      <div className="h-[var(--topbar-height)] flex items-center justify-between px-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          <BrandLogo size="sm" />
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)] leading-tight">
              {brandTitle}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] leading-tight">
              {brandSubtitle}
            </p>
          </div>
        </div>

        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Tutup menu navigasi"
            className="lg:hidden inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] cursor-pointer"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-5"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        )}
      </div>

      <nav aria-label="Utama" className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate(item.id);
                    onCloseMobile?.();
                  }
                }}
                className={[
                  'flex items-center gap-2.5 min-h-10 px-3 py-2 rounded-[var(--radius-md)] text-sm border-l-3 transition-all duration-150',
                  item.active
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent-text)] font-semibold'
                    : 'border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] hover:translate-x-0.5 font-medium',
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
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[var(--sidebar-width)] shrink-0">
        <div className="sticky top-0 h-dvh">{navContent}</div>
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            aria-hidden="true"
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-900/40"
          />
          <aside className="relative z-10 w-[var(--sidebar-width)] max-w-[85vw] h-full">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
