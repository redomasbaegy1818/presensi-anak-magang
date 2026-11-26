import { useState, type FormEvent } from 'react';
import { Button, Input } from '../components/ui/index.ts';

export interface LoginFormValues {
  identifier: string;
  password: string;
}

export interface LoginFormProps {
  identifierLabel?: string;
  identifierPlaceholder?: string;
  submitLabel?: string;
  loading?: boolean;
  onSubmit: (values: LoginFormValues) => void | Promise<void>;
}

export function LoginForm({
  identifierLabel = 'Email',
  identifierPlaceholder = 'nama@kantor.id',
  submitLabel = 'Masuk',
  loading = false,
  onSubmit,
}: LoginFormProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const identifierError =
    submitted && !identifier.trim() ? `${identifierLabel} wajib diisi.` : undefined;
  const passwordError =
    submitted && !password ? 'Kata sandi wajib diisi.' : undefined;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (!identifier.trim() || !password) return;
    void onSubmit({ identifier: identifier.trim(), password });
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
      />

      <Input
        label="Kata Sandi"
        type="password"
        autoComplete="current-password"
        required
        disabled={loading}
        placeholder="Masukkan kata sandi"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={passwordError}
      />

      <Button type="submit" size="lg" fullWidth loading={loading}>
        {loading ? 'Memproses...' : submitLabel}
      </Button>
    </form>
  );
}
