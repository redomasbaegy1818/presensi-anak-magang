import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral:
    'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
  success:
    'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]',
  warning:
    'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning-border)]',
  danger:
    'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger-border)]',
  accent:
    'bg-[var(--color-accent-subtle)] text-[var(--color-accent-text)] border-[var(--color-accent-border)]',
};

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-[var(--radius-sm)] border whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
