import type { ReactNode } from 'react';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

const ALERT_STYLES: Record<AlertTone, { box: string; title: string; label: string }> = {
  info: {
    box: 'bg-[var(--color-info-bg)] border-[var(--color-info-border)] text-slate-800',
    title: 'text-[var(--color-info)]',
    label: 'Informasi',
  },
  success: {
    box: 'bg-[var(--color-success-bg)] border-[var(--color-success-border)] text-slate-800',
    title: 'text-[var(--color-success)]',
    label: 'Berhasil',
  },
  warning: {
    box: 'bg-[var(--color-warning-bg)] border-[var(--color-warning-border)] text-slate-800',
    title: 'text-[var(--color-warning)]',
    label: 'Perhatian',
  },
  danger: {
    box: 'bg-[var(--color-danger-bg)] border-[var(--color-danger-border)] text-slate-800',
    title: 'text-[var(--color-danger)]',
    label: 'Gagal',
  },
};

export function Alert({
  tone = 'info',
  title,
  children,
  action,
  className = '',
}: AlertProps) {
  const style = ALERT_STYLES[tone];
  const role = tone === 'danger' || tone === 'warning' ? 'alert' : 'status';

  return (
    <div
      role={role}
      className={[
        'rounded-[var(--radius-md)] border px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3',
        style.box,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="space-y-0.5">
        <p className={['font-semibold', style.title].join(' ')}>
          {title ?? style.label}
        </p>
        <div className="text-[var(--color-text-primary)]">{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
