import { useId, type ReactNode } from 'react';

export interface FieldShellProps {
  id?: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: (fieldProps: {
    id: string;
    describedBy: string | undefined;
    isInvalid: boolean;
  }) => ReactNode;
}

/**
 * Shared accessible form field wrapper handling label association,
 * persistent hints, and aria-describedby error linking.
 */
export function FieldShell({
  id,
  label,
  required,
  hint,
  error,
  children,
}: FieldShellProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={fieldId}
        className="text-sm font-medium text-[var(--color-text-primary)]"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="text-[var(--color-danger)] ml-0.5">
            *
          </span>
        )}
      </label>

      {hint && (
        <p id={hintId} className="text-xs text-[var(--color-text-secondary)]">
          {hint}
        </p>
      )}

      {children({
        id: fieldId,
        describedBy,
        isInvalid: Boolean(error),
      })}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-[var(--color-danger)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
