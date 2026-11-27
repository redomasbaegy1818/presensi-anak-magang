import type { ReactNode } from 'react';
import { Button } from '../ui/Button.tsx';
import {
  IconHelpCircle,
  IconLogout,
  IconSidebarToggle,
} from '../ui/Icons.tsx';
import { UserAvatar } from '../ui/UserAvatar.tsx';

export interface TopbarProps {
  title: string;
  userName?: string;
  userRoleLabel?: string;
  onMenuClick?: () => void;
  menuExpanded?: boolean;
  onSidebarToggle?: () => void;
  sidebarCollapsed?: boolean;
  onHelpClick?: () => void;
  onLogout?: () => void;
  rightSlot?: ReactNode;
}

export function Topbar({
  title,
  userName,
  userRoleLabel,
  onMenuClick,
  menuExpanded,
  onSidebarToggle,
  sidebarCollapsed = false,
  onHelpClick,
  onLogout,
  rightSlot,
}: TopbarProps) {
  return (
    <header className="h-[var(--topbar-height)] bg-white border-b border-[var(--color-border)] px-4 sm:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-expanded={menuExpanded}
            aria-label="Buka menu navigasi"
            className="lg:hidden inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] cursor-pointer"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-5"
            >
              <path
                fillRule="evenodd"
                d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
        {onSidebarToggle && (
          <button
            type="button"
            onClick={onSidebarToggle}
            aria-expanded={!sidebarCollapsed}
            aria-label={
              sidebarCollapsed ? 'Perluas menu samping' : 'Perkecil menu samping'
            }
            title={
              sidebarCollapsed ? 'Perluas menu samping' : 'Perkecil menu samping'
            }
            className="hidden lg:inline-flex size-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            <IconSidebarToggle className="size-4" />
          </button>
        )}
        <p className="lg:hidden text-base font-semibold text-[var(--color-text-primary)] truncate">
          {title}
        </p>
        <p className="hidden lg:block text-xs font-medium text-[var(--color-text-muted)] truncate">
          Portal Admin · {title}
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {rightSlot}
        {onHelpClick && (
          <Button variant="ghost" size="sm" onClick={onHelpClick}>
            <IconHelpCircle className="size-4" />
            <span className="hidden sm:inline">Panduan</span>
          </Button>
        )}
        {(userName || userRoleLabel) && (
          <div className="hidden sm:flex items-center gap-2.5">
            <UserAvatar name={userName} size="sm" />
            <div className="text-right leading-tight">
              {userName && (
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {userName}
                </p>
              )}
              {userRoleLabel && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  {userRoleLabel}
                </p>
              )}
            </div>
          </div>
        )}
        {onLogout && (
          <Button variant="secondary" size="sm" onClick={onLogout}>
            <IconLogout className="size-3.5" />
            <span>Keluar</span>
          </Button>
        )}
      </div>
    </header>
  );
}
