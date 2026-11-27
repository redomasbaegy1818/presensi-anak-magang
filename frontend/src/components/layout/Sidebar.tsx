import type { ReactNode } from 'react';
import { BrandLogo } from '../ui/BrandLogo.tsx';
import { UserAvatar } from '../ui/UserAvatar.tsx';

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
  collapsed?: boolean;
  userName?: string;
  userRoleLabel?: string;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  brandTitle = 'Presensi Magang',
  brandSubtitle = 'Verifikasi Wajah',
  items,
  onNavigate,
  collapsed = false,
  userName,
  userRoleLabel,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const renderContent = (isCollapsed: boolean) => (
    <div className="flex h-full flex-col bg-white border-r border-[var(--color-border)]">
      <div
        className={[
          'h-[var(--topbar-height)] flex items-center border-b border-[var(--color-border)] shrink-0',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4',
        ].join(' ')}
      >
        <div
          className={[
            'flex items-center min-w-0',
            isCollapsed ? 'justify-center' : 'gap-2.5',
          ].join(' ')}
          title={isCollapsed ? `${brandTitle} — ${brandSubtitle}` : undefined}
        >
          <BrandLogo size="sm" />
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text-primary)] leading-tight truncate">
                {brandTitle}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] leading-tight truncate">
                {brandSubtitle}
              </p>
            </div>
          )}
        </div>

        {!isCollapsed && onCloseMobile && (
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
                aria-label={isCollapsed ? item.label : undefined}
                title={isCollapsed ? item.label : undefined}
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate(item.id);
                    onCloseMobile?.();
                  }
                }}
                className={[
                  'flex items-center min-h-10 py-2 rounded-[var(--radius-md)] text-sm border-l-3 transition-all duration-150',
                  isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-3',
                  item.active
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent-text)] font-semibold'
                    : isCollapsed
                      ? 'border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] font-medium'
                      : 'border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] hover:translate-x-0.5 font-medium',
                ].join(' ')}
              >
                {item.icon && (
                  <span aria-hidden="true" className="shrink-0">
                    {item.icon}
                  </span>
                )}
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {(userName || userRoleLabel) && (
        <div
          className={[
            'border-t border-[var(--color-border)] p-3 shrink-0',
            isCollapsed ? 'flex justify-center' : '',
          ].join(' ')}
          title={
            isCollapsed
              ? `${userName ?? ''}${userName && userRoleLabel ? ' · ' : ''}${userRoleLabel ?? ''}`
              : undefined
          }
        >
          <div
            className={[
              'flex items-center min-w-0',
              isCollapsed ? 'justify-center' : 'gap-2.5',
            ].join(' ')}
          >
            <UserAvatar name={userName} size="sm" />
            {!isCollapsed && (
              <div className="min-w-0 leading-tight">
                {userName && (
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {userName}
                  </p>
                )}
                {userRoleLabel && (
                  <p className="text-xs text-[var(--color-text-muted)] truncate">
                    {userRoleLabel}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside
        className={[
          'hidden lg:block shrink-0 transition-[width] duration-200',
          collapsed ? 'w-[72px]' : 'w-[var(--sidebar-width)]',
        ].join(' ')}
      >
        <div className="sticky top-0 h-dvh">{renderContent(collapsed)}</div>
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            aria-hidden="true"
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-900/40"
          />
          <aside className="relative z-10 w-[var(--sidebar-width)] max-w-[85vw] h-full">
            {renderContent(false)}
          </aside>
        </div>
      )}
    </>
  );
}
