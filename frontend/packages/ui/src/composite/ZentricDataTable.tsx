import * as React from 'react'; 
import { cn } from '../lib/cn'; 
 
export interface ZentricDataTableProps<T> extends React.HTMLAttributes<HTMLDivElement> { 
  data: T[]; 
  columns: any[]; 
  keyExtractor: (item: T, index: number) => string; 
  className?: string; 
  pagination?: { 
    currentPage: number; 
    totalPages: number; 
    onPageChange: (page: number) => void; 
  }; 
} 
 
export function ZentricDataTable<T>(props: ZentricDataTableProps<T>) { 
  return ( 
    <div className={cn('flex flex-col gap-4', props.className)}> 
      <div className='w-full overflow-auto rounded-md border border-border/80 bg-surface'> 
        <table className='w-full text-sm text-foreground'> 
          <thead className='bg-surface-muted text-xs font-medium uppercase text-muted-foreground'> 
            <tr> 
              {props.columns.map((col) => ( 
                <th key={col.id} className='px-4 py-3 text-left'>{col.header}</th> 
              ))} 
            </tr> 
          </thead> 
          <tbody className='divide-y divide-border/80'> 
            {props.data.map((row, i) => ( 
              <tr key={props.keyExtractor(row, i)} className='hover:bg-surface-hover/50'> 
                {props.columns.map((col) => ( 
                  <td key={col.id} className={cn('px-4 py-3 text-foreground/90', col.numeric ? 'font-mono tabular-nums text-right' : '')}> 
                    {col.cell ? col.cell({ row, value: col.accessorKey ? (row as Record<string, any>)[col.accessorKey] : null, index: i }) : col.accessorKey ? String((row as Record<string, any>)[col.accessorKey] ?? '') : ''} 
                  </td> 
                ))} 
              </tr> 
            ))} 
          </tbody> 
        </table> 
      </div> 
 
      {props.pagination && ( 
        <div className='flex items-center justify-between border-t border-border/80 pt-4'> 
          <span className='text-xs text-muted-foreground'> 
            Página {props.pagination.currentPage} de {props.pagination.totalPages} 
          </span> 
          <div className='flex gap-2'> 
            <button 
              onClick={() => props.pagination?.onPageChange(props.pagination.currentPage - 1)} 
              disabled={props.pagination.currentPage === 1} 
              className='rounded border border-border/80 px-3 py-1 text-xs hover:bg-surface-hover disabled:opacity-50' 
            > 
              Anterior 
            </button> 
            <button 
              onClick={() => props.pagination?.onPageChange(props.pagination.currentPage + 1)} 
              disabled={props.pagination.currentPage === props.pagination.totalPages} 
              className='rounded border border-border/80 px-3 py-1 text-xs hover:bg-surface-hover disabled:opacity-50' 
            > 
              Siguiente 
            </button> 
          </div> 
        </div> 
      )} 
    </div> 
  ); 
} 
