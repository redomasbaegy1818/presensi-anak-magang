import { useId } from 'react';
import { Button } from './Button.tsx';

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange?: (nextPageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  loading?: boolean;
}

function buildPageTokens(
  currentPage: number,
  totalPages: number,
): Array<number | 'ellipsis-left' | 'ellipsis-right'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const tokens: Array<number | 'ellipsis-left' | 'ellipsis-right'> = [1];
  const windowStart = Math.max(2, currentPage - 1);
  const windowEnd = Math.min(totalPages - 1, currentPage + 1);

  if (windowStart > 3) {
    tokens.push('ellipsis-left');
  } else {
    for (let p = 2; p < windowStart; p += 1) {
      tokens.push(p);
    }
  }

  for (let p = windowStart; p <= windowEnd; p += 1) {
    tokens.push(p);
  }

  if (windowEnd < totalPages - 2) {
    tokens.push('ellipsis-right');
  } else {
    for (let p = windowEnd + 1; p < totalPages; p += 1) {
      tokens.push(p);
    }
  }

  tokens.push(totalPages);
  return tokens;
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemLabel = 'data',
  loading = false,
}: PaginationProps) {
  const pageSizeSelectId = useId();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const minOption = Math.min(...pageSizeOptions, pageSize);

  if (totalItems === 0 || (totalPages <= 1 && totalItems <= minOption)) {
    return null;
  }

  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, safePage * pageSize);
  const tokens = buildPageTokens(safePage, totalPages);

  return (
    <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)] tabular-nums">
        <span>
          Menampilkan <strong className="text-[var(--color-text-primary)]">{startItem}–{endItem}</strong>{' '}
          dari <strong className="text-[var(--color-text-primary)]">{totalItems}</strong>{' '}
          {itemLabel}
        </span>

        {onPageSizeChange && (
          <label
            htmlFor={pageSizeSelectId}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]"
          >
            <span>Tampil:</span>
            <select
              id={pageSizeSelectId}
              value={pageSize}
              disabled={loading}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-white px-2 text-xs font-medium text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} / hal
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Navigasi halaman"
          className="flex flex-wrap items-center gap-1"
        >
          <Button
            size="sm"
            variant="secondary"
            disabled={safePage <= 1 || loading}
            onClick={() => onPageChange(safePage - 1)}
          >
            Sebelumnya
          </Button>

          {tokens.map((token) =>
            typeof token === 'number' ? (
              <button
                key={token}
                type="button"
                disabled={loading}
                aria-current={token === safePage ? 'page' : undefined}
                onClick={() => {
                  if (token !== safePage) {
                    onPageChange(token);
                  }
                }}
                className={[
                  'min-w-8 h-8 px-2 text-xs font-medium rounded-[var(--radius-sm)] border transition-colors tabular-nums cursor-pointer disabled:opacity-60',
                  token === safePage
                    ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                    : 'bg-white text-[var(--color-text-primary)] border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]',
                ].join(' ')}
              >
                {token}
              </button>
            ) : (
              <span
                key={token}
                aria-hidden="true"
                className="px-1.5 text-xs text-[var(--color-text-muted)] select-none"
              >
                ...
              </span>
            ),
          )}

          <Button
            size="sm"
            variant="secondary"
            disabled={safePage >= totalPages || loading}
            onClick={() => onPageChange(safePage + 1)}
          >
            Berikutnya
          </Button>
        </nav>
      )}
    </div>
  );
}
