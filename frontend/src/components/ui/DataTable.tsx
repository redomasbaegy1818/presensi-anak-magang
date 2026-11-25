import { useId, type ReactNode } from 'react';
import { EmptyState, LoadingState } from './StateFeedback.tsx';

export interface TableColumn<T> {
  key: string;
  header: string;
  isRowHeader?: boolean;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  caption: string;
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  stackOnNarrow?: boolean;
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowKey,
  loading = false,
  emptyTitle = 'Belum ada data',
  emptyDescription = 'Data akan tampil di sini setelah tersedia.',
  stackOnNarrow = true,
}: DataTableProps<T>) {
  const captionId = useId();

  if (loading) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-6">
        <LoadingState label="Memuat data tabel..." />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-6">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div
      tabIndex={0}
      role="region"
      aria-labelledby={captionId}
      className="table-wrapper"
    >
      <table
        className={['data-table', stackOnNarrow ? 'data-table--stack' : '']
          .filter(Boolean)
          .join(' ')}
      >
        <caption id={captionId} className="visually-hidden">
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={col.align === 'right' ? 'text-right' : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((col) =>
                col.isRowHeader ? (
                  <th
                    key={col.key}
                    scope="row"
                    className="font-medium text-[var(--color-text-primary)]"
                  >
                    {col.render(row)}
                  </th>
                ) : (
                  <td
                    key={col.key}
                    data-label={col.header}
                    className={col.align === 'right' ? 'sm:text-right' : undefined}
                  >
                    {col.render(row)}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
