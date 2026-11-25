export const CONTROL_BASE_CLASSES =
  'w-full rounded-[var(--radius-md)] border bg-white px-3 py-2.5 text-[max(1rem,0.9375rem)] sm:text-sm min-h-11 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors disabled:bg-[var(--color-bg-subtle)] disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed';

export function getControlBorderClass(isInvalid: boolean): string {
  return isInvalid
    ? 'border-[var(--color-danger)]'
    : 'border-[var(--color-border-input)] hover:border-[var(--color-text-primary)]';
}
