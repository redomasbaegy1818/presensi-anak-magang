import { useEffect, useState } from 'react';

const LIVE_TIME_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'Asia/Jakarta',
});

export function LiveWibClock({ className = '' }: { className?: string }) {
  const [nowText, setNowText] = useState(() =>
    LIVE_TIME_FORMATTER.format(new Date()).replace(/\./g, ':'),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setNowText(LIVE_TIME_FORMATTER.format(new Date()).replace(/\./g, ':'));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium tabular-nums text-[var(--color-text-primary)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-emerald-500 animate-pulse"
      />
      <span>{nowText} WIB</span>
    </span>
  );
}
