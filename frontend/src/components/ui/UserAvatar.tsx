function getInitials(name?: string | null): string {
  if (!name) return 'U';
  const cleaned = name.trim();
  if (!cleaned) return 'U';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return (parts[0]?.slice(0, 2) ?? 'U').toUpperCase();
  }
  const first = parts[0]?.[0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return `${first}${last}`.toUpperCase();
}

export interface UserAvatarProps {
  name?: string | null;
  size?: 'sm' | 'md';
}

export function UserAvatar({ name, size = 'sm' }: UserAvatarProps) {
  const sizeClass = size === 'md' ? 'size-10 text-sm' : 'size-7 text-xs';
  return (
    <span
      aria-hidden="true"
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        'bg-[var(--color-accent-subtle)] text-[var(--color-accent-text)] border border-[var(--color-accent-border)]',
        sizeClass,
      ].join(' ')}
    >
      {getInitials(name)}
    </span>
  );
}
