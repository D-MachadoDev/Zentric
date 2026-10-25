/**
 * Alias de compatibilidad.
 *
 * La implementacion vive en `./DataTable` (contrato §5.3 del design system:
 * columnas, ordenamiento, seleccion, filtros, paginacion y estados). Este
 * fichero se mantiene porque habia consumidores del nombre `ZentricDataTable`.
 */
export { DataTable, DataTable as ZentricDataTable } from './DataTable';
export type {
  DataTableColumn,
  DataTableFilter,
  DataTableFilterOption,
  DataTablePagination,
  DataTableProps,
} from './DataTable';
