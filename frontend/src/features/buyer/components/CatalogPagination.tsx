import { Pagination } from '@zentric/ui';

export interface CatalogPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

/**
 * CatalogPagination — Unified alias for @zentric/ui Pagination with 'productos' label.
 * Eliminates redundant pageWindow duplicate logic.
 */
export function CatalogPagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: CatalogPaginationProps) {
  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      totalItems={totalItems}
      onPageChange={onPageChange}
      itemLabel="productos"
      ariaLabel="Paginación del catálogo"
    />
  );
}
