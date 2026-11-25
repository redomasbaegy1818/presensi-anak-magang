import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { FieldShell } from './FieldShell.tsx';
import {
  CONTROL_BASE_CLASSES,
  getControlBorderClass,
} from './fieldStyles.ts';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { id, label, hint, error, required, rows = 3, className = '', ...rest },
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
          <textarea
            ref={ref}
            id={fieldId}
            rows={rows}
            required={required}
            aria-invalid={isInvalid || undefined}
            aria-describedby={describedBy}
            className={[
              CONTROL_BASE_CLASSES,
              getControlBorderClass(isInvalid),
              'resize-y min-h-24',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...rest}
          />
        )}
      </FieldShell>
    );
  },
);
