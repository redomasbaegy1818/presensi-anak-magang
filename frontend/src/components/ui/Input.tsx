import { forwardRef, type InputHTMLAttributes } from 'react';
import { FieldShell } from './FieldShell.tsx';
import {
  CONTROL_BASE_CLASSES,
  getControlBorderClass,
} from './fieldStyles.ts';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, hint, error, required, className = '', ...rest },
  ref,
) {
  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      hint={hint}
      error={error}
    >
      {({ id: fieldId, describedBy, isInvalid }) => (
        <input
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          className={[
            CONTROL_BASE_CLASSES,
            getControlBorderClass(isInvalid),
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        />
      )}
    </FieldShell>
  );
});
