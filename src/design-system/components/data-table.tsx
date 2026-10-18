import type { KeyboardEvent, ReactNode } from 'react';
import { EmptyState } from '@/design-system/components/feedback';
import { cn } from '@/shared/utils/cn';

export interface DataColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  caption,
  emptyTitle = 'Nada por aqui',
  emptyDescription = 'Não há registros para mostrar.',
  bare = false,
  onRowClick,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  caption?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  bare?: boolean;
  onRowClick?: (row: T) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const activate = (row: T, event: KeyboardEvent) => {
    if (!onRowClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <>
      <div
        className={cn(
          'hidden overflow-hidden md:block',
          !bare && 'rounded-[16px] border border-border/80',
        )}
      >
        <table className="w-full border-collapse text-left text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className="bg-muted/70 text-xs font-bold text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column.id} scope="col" className={cn('px-4 py-3', column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowId(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (event) => activate(row, event) : undefined}
                className={cn(
                  'border-t border-border/80 transition-colors duration-150 hover:bg-muted/60',
                  onRowClick &&
                    'cursor-pointer focus-visible:bg-muted/70 focus-visible:outline-none',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn('px-4 py-3.5 align-middle font-semibold', column.className)}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className={cn('grid gap-3 md:hidden', bare && 'p-3')}>
        {rows.map((row) => (
          <li key={getRowId(row)}>
            {onRowClick ? (
              <button
                type="button"
                onClick={() => onRowClick(row)}
                className="w-full rounded-[16px] border border-border bg-card p-4 text-left"
              >
                <RowFields columns={columns} row={row} />
              </button>
            ) : (
              <div className="rounded-[16px] border border-border bg-card p-4">
                <RowFields columns={columns} row={row} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function RowFields<T>({ columns, row }: { columns: DataColumn<T>[]; row: T }) {
  return (
    <dl className="grid gap-2">
      {columns.map((column) => (
        <div key={column.id} className="flex items-start justify-between gap-3">
          <dt className="text-xs font-extrabold text-muted-foreground">{column.header}</dt>
          <dd className="text-right text-sm font-bold">{column.cell(row)}</dd>
        </div>
      ))}
    </dl>
  );
}
