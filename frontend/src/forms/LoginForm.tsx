import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '../components/ui/index.ts';

export interface LoginFormValues {
  identifier: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginFormProps {
  identifierLabel?: string;
  identifierPlaceholder?: string;
  passwordLabel?: string;
  passwordPlaceholder?: string;
  submitLabel?: string;
  forgotPasswordHref?: string;
  rememberStorageKey?: string;
  loading?: boolean;
  onSubmit: (values: LoginFormValues) => void | Promise<void>;
}

function readStoredIdentifier(key?: string): {
  identifier: string;
  remembered: boolean;
} {
  if (!key || typeof window === 'undefined') {
    return { identifier: '', remembered: false };
  }
  try {
    const saved = window.localStorage.getItem(key);
    if (saved) {
      return { identifier: saved, remembered: true };
    }
  } catch {
    // Ignore storage read failures in private browsing modes.
  }
  return { identifier: '', remembered: false };
}

export function LoginForm({
  identifierLabel = 'Email',
  identifierPlaceholder = 'nama@kantor.id',
  passwordLabel = 'Password',
  passwordPlaceholder = 'Password',
  submitLabel = 'Masuk',
  forgotPasswordHref = '/lupa-password',
  rememberStorageKey,
  loading = false,
  onSubmit,
}: LoginFormProps) {
  const initialRemember = readStoredIdentifier(rememberStorageKey);
  const [identifier, setIdentifier] = useState(initialRemember.identifier);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(initialRemember.remembered);
  const [humanVerified, setHumanVerified] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const rememberCheckboxId = useId();
  const humanCheckboxId = useId();

  const identifierError =
    submitted && !identifier.trim() ? `${identifierLabel} wajib diisi.` : undefined;
  const passwordError =
    submitted && !password ? `${passwordLabel} wajib diisi.` : undefined;
  const humanError =
    submitted && !humanVerified
      ? 'Centang kotak verifikasi "Saya bukan robot" terlebih dahulu.'
      : undefined;

  const isReady = Boolean(identifier.trim() && password && humanVerified);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    const trimmed = identifier.trim();
    if (!trimmed || !password || !humanVerified) return;

    if (rememberStorageKey && typeof window !== 'undefined') {
      try {
        if (rememberMe) {
          window.localStorage.setItem(rememberStorageKey, trimmed);
        } else {
          window.localStorage.removeItem(rememberStorageKey);
        }
      } catch {
        // Ignore storage write errors.
      }
    }

    void onSubmit({ identifier: trimmed, password, rememberMe });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Input
        label={identifierLabel}
        type="text"
        autoComplete="username"
        required
        disabled={loading}
        placeholder={identifierPlaceholder}
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        error={identifierError}
        className="h-11 rounded-[var(--radius-md)]"
      />

      <Input
        label={passwordLabel}
        type="password"
        autoComplete="current-password"
        required
        disabled={loading}
        placeholder={passwordPlaceholder}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={passwordError}
        className="h-11 rounded-[var(--radius-md)]"
      />

      <div className="flex items-center justify-between gap-3 text-sm pt-0.5">
        <label
          htmlFor={rememberCheckboxId}
          className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] cursor-pointer select-none"
        >
          <input
            id={rememberCheckboxId}
            type="checkbox"
            checked={rememberMe}
            disabled={loading}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="size-4 rounded border-[var(--color-border-strong)] accent-[var(--color-accent)] cursor-pointer"
          />
          <span>Ingat saya</span>
        </label>

        <Link
          to={forgotPasswordHref}
          className="font-semibold text-[var(--color-accent-text)] hover:text-[var(--color-accent-hover)] hover:underline"
        >
          Lupa password?
        </Link>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={humanCheckboxId}
          className={[
            'flex items-center justify-between gap-4 max-w-[280px] rounded-[var(--radius-sm)] border px-3.5 py-3 shadow-[var(--shadow-sm)] cursor-pointer select-none transition-colors',
            humanError
              ? 'border-[var(--color-danger)] bg-[var(--color-danger-bg)]/40'
              : 'border-[var(--color-border-strong)] bg-[#f9f9f9] hover:bg-slate-50',
          ].join(' ')}
        >
          <span className="inline-flex items-center gap-3">
            <input
              id={humanCheckboxId}
              type="checkbox"
              checked={humanVerified}
              disabled={loading}
              onChange={(e) => setHumanVerified(e.target.checked)}
              className="sr-only peer"
            />
            <span
              aria-hidden="true"
              className={[
                'inline-flex size-6 items-center justify-center rounded-[3px] border-2 transition-colors',
                humanVerified
                  ? 'border-[var(--color-success)] bg-[var(--color-success)] text-white'
                  : 'border-slate-400 bg-white',
              ].join(' ')}
            >
              {humanVerified && (
                <svg
                  viewBox="0 0 16 16"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                </svg>
              )}
            </span>
            <span className="text-sm font-medium text-[var(--color-text-primary)] leading-tight">
              Saya bukan robot
            </span>
          </span>

          <span
            aria-hidden="true"
            className="flex flex-col items-center justify-center text-center shrink-0 pl-2"
          >
            <svg viewBox="0 0 28 28" className="size-7" fill="none">
              <path
                d="M14 4a10 10 0 0 1 8.66 5l-2.3 1.33A7.35 7.35 0 0 0 14 6.65V4Z"
                fill="#1C64F2"
              />
              <path
                d="M22.66 9A10 10 0 0 1 19 22.66l-1.33-2.3A7.35 7.35 0 0 0 20.36 10.33L22.66 9Z"
                fill="#4B5563"
              />
              <path
                d="M14 24a10 10 0 0 1-8.66-5l2.3-1.33A7.35 7.35 0 0 0 14 21.35V24Z"
                fill="#9CA3AF"
              />
              <path
                d="M14 2.5 17 5.5 14 8.5V2.5Z"
                fill="#1C64F2"
              />
            </svg>
            <span className="text-[9px] font-medium text-[var(--color-text-muted)] leading-none mt-1">
              Keamanan
            </span>
          </span>
        </label>

        {humanError && (
          <p role="alert" className="text-xs text-[var(--color-danger)]">
            {humanError}
          </p>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        fullWidth
        loading={loading}
        className={[
          'h-11 rounded-[var(--radius-md)] font-semibold transition-opacity',
          !isReady && !loading ? 'opacity-65 hover:opacity-85' : '',
        ].join(' ')}
      >
        {loading ? 'Memproses...' : submitLabel}
      </Button>
    </form>
  );
}
