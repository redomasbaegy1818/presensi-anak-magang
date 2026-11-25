import type { ReactNode } from 'react';

export function LoadingState({
  label = 'Memuat data...',
}: {
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <progress
        aria-label={label}
        className="w-40 h-1.5 rounded overflow-hidden accent-[var(--color-accent)]"
      />
      <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
    </div>
  );
}

export function EmptyState({
  title = 'Belum ada data',
  description = 'Tidak ada catatan untuk ditampilkan saat ini.',
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
        {title}
      </p>
      <p className="text-sm text-[var(--color-text-secondary)] max-w-md">
        {description}
      </p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Gagal memuat data',
  description = 'Terjadi gangguan saat mengambil data dari server.',
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-[var(--radius-md)] border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-5 text-center space-y-2"
    >
      <p className="text-sm font-semibold text-[var(--color-danger)]">
        {title}
      </p>
      <p className="text-sm text-[var(--color-text-primary)]">{description}</p>
      {action && <div className="pt-1 flex justify-center">{action}</div>}
    </div>
  );
}

export function SuccessState({
  title = 'Berhasil disimpan',
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="rounded-[var(--radius-md)] border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-5 text-center space-y-2"
    >
      <p className="text-sm font-semibold text-[var(--color-success)]">
        {title}
      </p>
      {description && (
        <p className="text-sm text-[var(--color-text-primary)]">{description}</p>
      )}
      {action && <div className="pt-1 flex justify-center">{action}</div>}
    </div>
  );
}
