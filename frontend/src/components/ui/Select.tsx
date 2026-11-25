import { forwardRef, type SelectHTMLAttributes } from 'react';
import { FieldShell } from './FieldShell.tsx';
import {
  CONTROL_BASE_CLASSES,
  getControlBorderClass,
} from './fieldStyles.ts';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  hint?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    id,
    label,
    options,
    placeholder,
    hint,
    error,
    required,
    className = '',
    ...rest
  },
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
        <div className="relative">
          <select
            ref={ref}
            id={fieldId}
            required={required}
            aria-invalid={isInvalid || undefined}
            aria-describedby={describedBy}
            className={[
              CONTROL_BASE_CLASSES,
              getControlBorderClass(isInvalid),
              'appearance-none pr-9',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...rest}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-text-secondary)]"
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </FieldShell>
  );
});
