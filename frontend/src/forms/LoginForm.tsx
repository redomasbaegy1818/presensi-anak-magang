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
  onSubmit: (values: LoginFormValues) => void;
}

export function LoginForm({
  identifierLabel = 'Email',
  identifierPlaceholder = 'nama@kantor.id',
  submitLabel = 'Masuk',
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
    onSubmit({ identifier: identifier.trim(), password });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Input
        label={identifierLabel}
        type="text"
        autoComplete="username"
        required
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
        placeholder="Masukkan kata sandi"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={passwordError}
      />

      <Button type="submit" size="lg" fullWidth>
        {submitLabel}
      </Button>
    </form>
  );
}
