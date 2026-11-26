export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<BrandLogoProps['size']>, string> = {
  sm: 'size-7',
  md: 'size-9',
  lg: 'size-11',
};

/**
 * Custom geometric logo representing face-verified internship attendance:
 * camera scan corners enclosing a user silhouette with an active verification dot.
 */
export function BrandLogo({ size = 'md', className = '' }: BrandLogoProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 36 36"
      fill="none"
      className={[SIZE_CLASSES[size], 'shrink-0', className]
        .filter(Boolean)
        .join(' ')}
    >
      <rect width="36" height="36" rx="9" fill="#9F1239" />
      <path
        d="M8.5 13V10.5C8.5 9.39543 9.39543 8.5 10.5 8.5H13"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M23 8.5H25.5C26.6046 8.5 27.5 9.39543 27.5 10.5V13"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8.5 23V25.5C8.5 26.6046 9.39543 27.5 10.5 27.5H13"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M23 27.5H25.5C26.6046 27.5 27.5 26.6046 27.5 25.5V23"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="18" cy="14.75" r="3.25" stroke="white" strokeWidth="1.9" />
      <path
        d="M12.5 23.25C13.3 20.8 15.4 19.5 18 19.5C20.6 19.5 22.7 20.8 23.5 23.25"
        stroke="white"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle
        cx="27.5"
        cy="8.5"
        r="3.25"
        fill="#10B981"
        stroke="#9F1239"
        strokeWidth="1.5"
      />
    </svg>
  );
}
